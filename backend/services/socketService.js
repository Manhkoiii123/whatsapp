const { Server } = require("socket.io");
const User = require("../models/User");
const Message = require("../models/Message");

//  map to store online user => userId socketId

const onlineUsers = new Map();

// map to track tuping status => userId => [conversation] :boolean
const typingUsers = new Map();

const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL,
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    },
    pingTimeout: 60000, // disconnect inteactive user or sockets after 1 min
  });

  io.on("connection", (socket) => {
    console.log("New client connected", socket.id);
    let userId = null;

    // handle user connection and mark them online in db
    socket.on("user_connected", async (connectingUserId) => {
      try {
        userId = connectingUserId;
        onlineUsers.set(userId, socket.id);
        socket.join(userId);
        await User.findByIdAndUpdate(userId, {
          isOnline: true,
          lastSeen: new Date(),
        });
        // notify all user that this is user is online
        io.emit("user_status", { userId, online: true });
      } catch (error) {
        console.log(error);
      }
    });
    // return
    socket.on("get_user_status", (requestUserId, callback) => {
      const isOnline = onlineUsers.has(requestUserId);
      callback({
        userId: requestUserId,
        online: isOnline,
        lastSeen: isOnline ? new Date() : null,
      });
    });

    // forward message to receriver if online
    socket.on("send_message", async (message) => {
      try {
        const receiverSocketId = onlineUsers.get(message.receiver?._id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit("receive_message", message);
        }
      } catch (error) {
        console.log(error);
        socket.emit("message_error", { error: "Failed to send message" });
      }
    });

    // update message as read and noti sender user
    socket.on("message_read", async ({ messageIds, senderId }) => {
      try {
        await Message.updateMany(
          {
            _id: { $in: messageIds },
          },
          {
            $set: {
              messageStatus: "read",
            },
          }
        );
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          messageIds.forEach((messageId) => {
            io.to(senderSocketId).emit("message_status_update", {
              messageId,
              messageStatus: "read",
            });
          });
        }
      } catch (error) {
        console.log("error", error);
      }
    });

    socket.on("typing_start", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;
      if (!typingUsers.has(userId)) typingUsers.set(userId, {});
      const userTyping = typingUsers.get(userId);
      userTyping[conversationId] = true;
      if (userTyping[`${conversationId}_timeout`]) {
        clearTimeout(userTyping[`${conversationId}_timeout`]);
      }
      // auto stop after 3s
      userTyping[`${conversationId}_timeout`] = setTimeout(() => {
        userTyping[conversationId] = false;
        socket
          .to(receiverId)
          .emit("user_typing", { userId, conversationId, isTyping: false });
      }, 3000);
      socket
        .to(receiverId)
        .emit("user_typing", { userId, conversationId, isTyping: false });
    });
    socket.on("typing_stop", ({ conversationId, receiverId }) => {
      if (!userId || !conversationId || !receiverId) return;
      if (typingUsers.has(userId)) {
        const userTyping = typingUsers.get(userId);
        userTyping[conversationId] = false;
        if (userTyping[`${conversationId}_timeout`]) {
          clearTimeout(userTyping[`${conversationId}_timeout`]);
          delete userTyping[`${conversationId}_timeout`];
        }
      }
      socket
        .to(receiverId)
        .emit("user_typing", { userId, conversationId, isTyping: false });
    });

    // add or remove reaction
    socket.on(
      "add_reaction",
      async ({ messageId, emoji, userId, reactionUserId }) => {
        try {
          const message = await Message.findById(messageId);
          if (!message) return;
          const existingIndex = message.reactions.findIndex(
            (r) => r.user.toString() === reactionUserId
          );
          if (existingIndex > -1) {
            const existing = message.reactions[existingIndex];
            if (existing.emoji === emoji) {
              // remove
              message.reactions.splice(existingIndex, 1);
            } else {
              // change emoji
              message.reactions[existingIndex].emoji = emoji;
            }
          } else {
            message.reactions.push({
              user: reactionUserId,
              emoji,
            });
          }
          await message.save();
          const populateMessage = await Message.findById(messageId)
            .populate("sender", "username profilePicture")
            .populate("receiver", "username profilePicture")
            .populate("reactions.user", "username ");

          const reactionUpdated = {
            messageId,
            reactions: populateMessage.reactions,
          };
          const senderSocket = onlineUsers.get(
            populateMessage.sender._id.toString()
          );
          const receiverSocket = onlineUsers.get(
            populateMessage.receiver._id.toString()
          );
          if (senderSocket) {
            io.to(senderSocket).emit("reaction_update", reactionUpdated);
          }
          if (receiverSocket) {
            io.to(receiverSocket).emit("reaction_update", reactionUpdated);
          }
        } catch (error) {
          console.log(error);
        }
      }
    );
    const handleDisconnected = async () => {
      if (!userId) return;
      try {
        onlineUsers.delete(userId);
        //  clear all typing timeout
        if (typingUsers.has(userId)) {
          const userTyping = typingUsers.get(userId);
          Object.keys(userTyping).forEach((key) => {
            if (key.endsWith("_timeout")) {
              clearTimeout(userTyping[`${key}`]);
            }
          });
          typingUsers.delete(userId);
        }
        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen: Date.now(),
        });
        io.emit("user_status", {
          userId,
          isOnline: false,
          lastSeen: Date.now(),
        });
        socket.leave(userId);
      } catch (error) {
        console.log(error);
      }
    };
    socket.on("disconnect", handleDisconnected);
  });
  io.socketUserMap = onlineUsers;

  return io;
};

module.exports = initializeSocket;
