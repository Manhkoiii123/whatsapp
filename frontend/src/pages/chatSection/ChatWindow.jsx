import React, { Fragment, useEffect, useRef, useState } from "react";
import EmojiPicker from "emoji-picker-react";
import useThemeStore from "../../store/themeStore";
import useUserStore from "../../store/useUserStore";
import { useChatStore } from "../../store/chatStore";
import { isToday, isYesterday, format } from "date-fns";
import whatsappImage from "../../images/whatsapp_image.png";
import {
  FaArrowLeft,
  FaEllipsisV,
  FaFile,
  FaImage,
  FaPaperclip,
  FaPaperPlane,
  FaSmile,
  FaTimes,
  FaVideo,
} from "react-icons/fa";
import MessageBubble from "./MessageBubble";
const isValidate = (date) => {
  return date instanceof Date && !isNaN(date);
};
const ChatWindow = ({ selectedContact, setSelectedContact, isMobile }) => {
  const [message, setMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const typingTimeoutRef = useRef(null);
  const messageEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const { theme } = useThemeStore();
  const { user } = useUserStore();

  const {
    messages,
    onlineUsers,
    loading,
    sendMessage,
    receiveMessage,
    fetchMessages,
    fetchConversations,
    conversations,
    isUserTyping,
    startTyping,
    stopTyping,
    getUserLastSeen,
    isUserOnline,
    cleanUp,
    addReaction,
    deleteMessage,
    maskMessagesAsRead,
  } = useChatStore();

  // get online status and last seen
  const online = isUserOnline(selectedContact?._id);
  const lastSeen = getUserLastSeen(selectedContact?._id);
  const isTyping = isUserTyping(selectedContact?._id);
  useEffect(() => {
    if (selectedContact?._id && conversations?.data?.length > 0) {
      const conversation = conversations?.data?.find((c) =>
        c.participants.some((p) => p._id === selectedContact?._id)
      );
      // if (conversation?._id) {
      fetchMessages(conversation?._id);
      // }
    }
  }, [selectedContact, conversations]);
  useEffect(() => {
    fetchConversations();
  }, []);

  const scollToBottom = () => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  // useEffect(() => {
  //   scollToBottom();
  // }, [messages]);
  useEffect(() => {
    if (message && selectedContact) {
      startTyping(selectedContact?._id);
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedContact?._id);
      }, 2000);
    }
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, selectedContact, startTyping, stopTyping]);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setShowFileMenu(false);
      if (file.type.startsWith("image/")) {
        setFilePreview(URL.createObjectURL(file));
      }
    }
  };
  const handleSendMessage = async () => {
    if (!selectedContact) return;
    setFilePreview(null);
    try {
      const formData = new FormData();
      formData.append("senderId", user?._id);
      formData.append("receiverId", selectedContact?._id);
      const status = online ? "delivered" : "send";
      formData.append("messageStatus", status);
      if (message.trim()) {
        formData.append("content", message.trim());
      }
      if (selectedFile) {
        formData.append("media", selectedFile, selectedFile.name);
      }
      if (!message.trim() && !selectedFile) {
        return;
      }
      await sendMessage(formData);
      setMessage("");
      setSelectedFile(null);
      setFilePreview(null);
      setShowFileMenu(false);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const renderDateSeparator = (date) => {
    if (!isValidate(date)) return null;
    let dateString;
    if (isToday(date)) {
      dateString = "Today";
    } else if (isYesterday(date)) {
      dateString = "Yesterday";
    } else {
      dateString = format(date, "EEEE, MMMM d");
    }
    return (
      <div className="flex justify-center my-4">
        <span
          className={`px-4 py-2 rounded-full text-sm ${
            theme === "dark"
              ? "bg-gray-700 text-gray-300"
              : "bg-gray-200 text-gray-600"
          }`}
        >
          {dateString}
        </span>
      </div>
    );
  };

  // group message
  const groupedMessages = Array.isArray(messages)
    ? messages.reduce((acc, mes) => {
        if (!mes.createdAt) return acc;
        const date = new Date(mes.createdAt);
        if (isValidate(date)) {
          const dateString = format(date, "yyyy-MM-dd");
          if (!acc[dateString]) {
            acc[dateString] = [];
          }
          acc[dateString].push(mes);
        }

        return acc;
      }, {})
    : {};
  const handlerReaction = (messageId, emoji) => {
    addReaction(messageId, emoji);
  };
  if (!selectedContact)
    return (
      <div className="flex-1 flex flex-col items-center justify-center mx-auto h-screen text-center">
        <div className="max-w-md">
          <img src={whatsappImage} alt="" className="w-full h-auto" />
          <p
            className={`${
              theme === "dark" ? "text-gray-400" : "text-gray-600"
            } mb-6 `}
          >
            Select a chat to start messaging
          </p>
        </div>
      </div>
    );
  return (
    <div className="flex flex-1 flex-col w-full h-screen">
      <div
        className={`p-4 ${
          theme === "dark"
            ? "bg-[#303430] text-white"
            : "bg-[rgb(239,242,245)] text-gray-600"
        } flex items-center`}
      >
        <button
          className="mr-2 focus:outline-none"
          onClick={() => setSelectedContact(null)}
        >
          <FaArrowLeft className="w-6 h-6" />
        </button>
        <img
          src={selectedContact?.profilePicture}
          alt=""
          className="w-10 h-10 rounded-full"
        />
        <div className="ml-2 flex-grow">
          <h2 className="text-start font-semibold">
            {selectedContact?.username}
          </h2>
          {isTyping ? (
            <div>Typing...</div>
          ) : (
            <p
              className={`text-sm ${
                theme === "dark" ? "text-gray-400" : "text-gray-600"
              }`}
            >
              {online
                ? "Online"
                : lastSeen
                ? `lastSeen ${format(new Date(lastSeen), "HH:mm")}`
                : "Offline"}
            </p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          <button className="focus:outline-none ">
            <FaVideo className="w-5 h-5" />
          </button>
          <button className="focus:outline-none ">
            <FaEllipsisV className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div
        className={`flex-1  p-4 overflow-y-auto ${
          theme === "dark" ? "bg-[#191a1a]" : "bg-[rgb(241,236,229)]"
        } `}
      >
        {Object.entries(groupedMessages).map(([date, messages]) => (
          <Fragment key={date}>
            {renderDateSeparator(new Date(date))}
            {messages
              .filter(
                (mes) => mes.conversation === selectedContact?.conversation?._id
              )
              .map((m) => (
                <MessageBubble
                  key={m._id}
                  message={m}
                  theme={theme}
                  currentUser={user}
                  onReact={handlerReaction}
                  deleteMessage={deleteMessage}
                />
              ))}
          </Fragment>
        ))}
        <div ref={messageEndRef}></div>
      </div>
      {filePreview && (
        <div className="relative p-2">
          <img
            src={filePreview}
            alt=""
            className="w-80 rounded shadow-lg mx-auto object-cover"
          />
          <button
            onClick={() => {
              setFilePreview(null);
              setSelectedFile(null);
            }}
            className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-2 focus:outline-none"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
      )}
      <div
        className={`p-4 ${
          theme === "dark" ? "bg-[#303430]" : "bg-white"
        } flex itemc space-x-2 relative`}
      >
        <button
          className="focus:outline-none "
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
        >
          <FaSmile className="w-6 h-6 text-gray-600" />
        </button>
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-16 left-0 z-50">
            <EmojiPicker
              onEmojiClick={(emoji) => {
                setMessage((prevMessage) => prevMessage + emoji.emoji);
                setShowEmojiPicker(false);
              }}
              theme={theme}
            />
          </div>
        )}
        <div className="relative">
          <button
            className="focus:outline-none "
            onClick={() => setShowFileMenu(!showFileMenu)}
          >
            <FaPaperclip className="w-6 h-6 text-gray-600 mt-2" />
          </button>
          {showFileMenu && (
            <div className="absolute bottom-full left-0 z-50 mb-2 rounded-lg shadow-lg bg-white">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*,video/*"
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center px-4 py-2 w-full transition-colors hover:bg-gray-100 "
              >
                <FaImage className=" mr-2" /> Image/video
              </button>
              <button
                onClick={() => fileInputRef.current.click()}
                className="flex items-center px-4 py-2 w-full transition-colors hover:bg-gray-100 "
              >
                <FaFile className=" mr-2" /> Documents
              </button>
            </div>
          )}
        </div>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === "Enter") {
              handleSendMessage();
            }
          }}
          placeholder="Type a message..."
          className={`flex-grow px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-green-500 ${
            theme === "dark"
              ? "text-white"
              : "text-gray-800 bg-white border-gray-300"
          }`}
        />
        <button className="focus:outline-none " onClick={handleSendMessage}>
          <FaPaperPlane className="w-6 h-6 text-green-500" />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;

// 2 29 48
