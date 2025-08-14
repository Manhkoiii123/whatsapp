import { create } from "zustand";
import { getSocket } from "../services/chat.service";
import axiosInstance from "../services/url.service";

export const useChatStore = create((set, get) => ({
  conversations: [], // {data:..}
  currentConversation: null,
  messages: [],
  loading: false,
  error: null,
  onlineUsers: new Map(),
  typingUsers: new Map(),
  currentUser: null,

  initsocketListeners: () => {
    const socket = getSocket();
    if (!socket) return;
    // remove existing listeners to prevent duplicate handler
    socket.off("receive_message");
    socket.off("user_typing");
    socket.off("user_status");
    socket.off("message_send");
    socket.off("message_error");
    socket.off("message_deleted");

    // listen for incoming message
    socket.on("receive_message", (message) => {});
    // confirm message dilivery
    socket.on("message_send", (message) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          return m._id === message._id ? { ...m } : m;
        }),
      }));
    });
    // uodate message status
    socket.on("message_status_update", ({ messageId, status }) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          return m._id === messageId ? { ...m, status } : m;
        }),
      }));
    });

    // handle reaction on message
    socket.on("reaction_update", ({ messageId, reactions }) => {
      set((state) => ({
        messages: state.messages.map((m) => {
          return m._id === messageId ? { ...m, reactions } : m;
        }),
      }));
    });

    // handle remove message from local state
    socket.on("message_deleted", (messageId) => {
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
    });

    // handle any message sending error
    socket.on("message_error", (error) => {
      console.log(error);
    });

    // listener for typing ,
    socket.on("user_typing", ({ userId, conversationId, isTyping }) => {
      set((state) => {
        const newTypingUsers = new Map(state.typingUsers);
        if (!newTypingUsers.has(conversationId)) {
          newTypingUsers.set(conversationId, new Set());
        }
        const typingSet = newTypingUsers.get(conversationId);
        if (isTyping) {
          typingSet.add(userId);
        } else {
          typingSet.delete(userId);
        }
        return { typingUsers: newTypingUsers };
      });
    });
    // track users online/offline
    socket.on("user_status", ({ userId, online, lastSeen }) => {
      set((state) => {
        const newOnlineUsers = new Map(state.onlineUsers);
        newOnlineUsers.set(userId, { online, lastSeen });
        return { onlineUsers: newOnlineUsers };
      });
    });
    // emit status check for all user in conversation list
    const { conversations } = get();
    if (conversations?.data?.length > 0) {
      conversations.data?.forEach((c) => {
        const otherUser = c.participants.find(
          (p) => p._id !== get().currentUser._id
        );
        if (otherUser._id) {
          socket.emit("get_user_status", otherUser._id, (status) => {
            set((state) => {
              const newOnlineUsers = new Map(state.onlineUsers);
              newOnlineUsers.set(status.userId, {
                online: status.online,
                lastSeen: status.lastSeen,
              });
              return {
                onlineUsers: newOnlineUsers,
              };
            });
          });
        }
      });
    }
  },
  setCurrentUser: (user) => set({ currentUser: user }),
  fetchConversations: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(`/chat/conversations`);
      set({ conversations: data, loading: false, error: null });
      get().initsocketListeners();
      return data;
    } catch (error) {
      set({ loading: false, error: error.message });
      return null;
    }
  },

  // fetch message for a conversation
  fetchMessages: async (conversationId) => {
    if (!conversationId) {
      set({
        messages: [],
        loading: false,
        error: null,
        currentConversation: null,
      });
      return [];
    }

    set({ loading: true, error: null });
    try {
      const { data } = await axiosInstance.get(
        `/chat/conversations/${conversationId}/messages`
      );
      const messageArray = data.data || data || [];
      set({
        messages: messageArray,
        currentConversation: conversationId,
        loading: false,
      });
      const { maskMessagesAsRead } = get();
      maskMessagesAsRead();
      return messageArray;
    } catch (error) {
      set({ loading: false, error: error.message });
      return null;
    }
  },
  sendMessage: async (formData) => {
    const senderId = formData.get("senderId");
    const receiverId = formData.get("receiverId");
    const messageStatus = formData.get("messageStatus");
    const content = formData.get("content");
    const media = formData.get("media");
    const socket = getSocket();
    const { conversations } = get();
    let conversationId = null;
    let conversation;
    if (conversations?.data?.length > 0) {
      conversation = conversations.data.find(
        (c) =>
          c.participants.some((p) => p._id === senderId) &&
          c.participants.some((p) => p._id === receiverId)
      );
    }
    if (conversation) {
      conversationId = conversation._id;
      set({
        currentConversation: conversation._id,
      });
    }
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage = {
      _id: tempId,
      sender: {
        _id: senderId,
      },
      receiver: {
        _id: receiverId,
      },
      conversation: conversationId,
      content,
      contentType: media
        ? media.type.startsWith("image")
          ? "image"
          : "video"
        : "text",
      imageOrVideoUrl:
        media && typeof media === "string" ? URL.createObjectURL(media) : null,
      createdAt: new Date().toISOString(),
      messageStatus,
    };
    set((state) => ({
      messages: [...state.messages, optimisticMessage],
    }));
    try {
      const { data } = await axiosInstance.post(
        `/chat/send-message`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const messageData = data.data || data;
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === tempId ? messageData : m
        ),
      }));
      return messageData;
    } catch (error) {
      set((state) => ({
        messages: state.messages.map((m) =>
          m._id === tempId ? { ...m, messageStatus: "failed" } : m
        ),
        error: error.message,
      }));
      throw error;
    }
  },

  receiveMessage: async (message) => {
    if (!message) return;
    const { currentConversation, currentUser, messages } = get();
    const messageExists = message.some((m) => m._id === message._id);
    if (messageExists) return;
    if (message.conversation === currentConversation) {
      set((state) => ({
        messages: [...state.messages, message],
      }));
      // auto
      if (message.receiver?._id === currentUser?._id) {
        const { maskMessagesAsRead } = get();
        maskMessagesAsRead();
      }
    }
    set((state) => {
      const updateConversations = state.conversations?.data?.map((c) => {
        if (c._id === message.conversation) {
          return {
            ...c,
            unreadCount:
              message?.receiver?._id === currentUser._id
                ? (c.unreadCount || 0) + 1
                : c.unreadCount || 0,
            lastMessage: message,
          };
        }
        return c;
      });
      return {
        conversations: {
          ...state.conversations,
          data: updateConversations,
        },
      };
    });
  },
  maskMessagesAsRead: async () => {
    const { messages, currentUser } = get();
    if (!messages.length || !currentUser) return;
    const unreadIds = messages
      .filter(
        (m) =>
          m.messageStatus !== "read" && m.receiver?._id === currentUser?._id
      )
      .map((msg) => msg._id)
      .filter(Boolean);

    if (unreadIds.length === 0) {
      return;
    }
    try {
      const { data } = await axiosInstance.put(`/chat/messages/read`, {
        messageIds: unreadIds,
      });
      set((state) => ({
        messages: state.messages.map((m) => {
          if (unreadIds.includes(m._id)) {
            return {
              ...m,
              messageStatus: "read",
            };
          }
          return m;
        }),
      }));
      const socket = getSocket();
      if (socket) {
        socket.emit("message_read", {
          messageIds: unreadIds,
          senderId: messages[0]?.sender?._id,
        });
      }
    } catch (error) {
      console.log(error);
    }
  },

  deleteMessage: async (messageId) => {
    try {
      await axiosInstance.delete(`/chat/messages/${messageId}`);
      set((state) => ({
        messages: state.messages.filter((m) => m._id !== messageId),
      }));
      return true;
    } catch (error) {
      console.log(error);
      set({ error: error.message });
      return false;
    }
  },
  // add change reaction
  addReaction: async (messageId, emoji) => {
    const socket = getSocket();
    const { currentUser } = get();
    if (socket && currentUser) {
      socket.emit("add_reaction", {
        messageId,
        emoji,
        reactionUserId: currentUser?._id,
      });
    }
  },
  startTyping: async (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation) {
      socket.emit("typing_start", {
        receiverId,
        conversationId: currentConversation,
      });
    }
  },

  stopTyping: async (receiverId) => {
    const { currentConversation } = get();
    const socket = getSocket();
    if (socket && currentConversation) {
      socket.emit("typing_stop", {
        receiverId,
        conversationId: currentConversation,
      });
    }
  },

  isUserTyping: (userId) => {
    const { typingUsers, currentConversation } = get();
    if (!typingUsers.has(userId) || !currentConversation || !userId)
      return false;
    return typingUsers.get(currentConversation).has(userId);
  },

  isUserOnline: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.online || false;
  },
  getUserLastSeen: (userId) => {
    if (!userId) return false;
    const { onlineUsers } = get();
    return onlineUsers.get(userId)?.lastSeen || false;
  },

  cleanUp: () => {
    set({
      conversations: [],
      currentConversation: null,
      messages: [],
      loading: false,
      error: null,
      onlineUsers: new Map(),
      typingUsers: new Map(),
      currentUser: null,
    });
  },
}));
