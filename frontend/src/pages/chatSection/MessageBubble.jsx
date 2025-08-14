import { format } from "date-fns";
import React, { useRef, useState } from "react";
import {
  FaCheck,
  FaCheckDouble,
  FaPlus,
  FaRegCopy,
  FaSmile,
} from "react-icons/fa";
import { HiDotsVertical } from "react-icons/hi";
import { RxCross2 } from "react-icons/rx";
import useOutsideClick from "../../hooks/useOutsideClick";
import EmojiPicker from "emoji-picker-react";
const quickReactions = ["👍", "❤️", "😂", "😮", "😢", "🙏"];
const MessageBubble = ({
  message,
  theme,
  currentUser,
  onReact,
  deleteMessage,
}) => {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const messageRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const optionRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const reactionsMenuRef = useRef(null);
  const isUserMessage = message.sender?._id === currentUser?._id;
  const bubbleClass = isUserMessage ? "chat-end" : "chat-start";

  const bubbleContentClass = isUserMessage
    ? `chat-bubble md:max-w-[50%] min-w-[130px] bg-[#d9fdd3] text-black`
    : "chat-bubble md:max-w-[50%] min-w-[130px] bg-[white] text-black";
  const classMessage = isUserMessage ? "justify-end" : "justify-start";
  const handleReact = (emoji) => {
    onReact(message?._id, emoji);
    setShowReactions(false);
    setShowEmojiPicker(false);
  };

  useOutsideClick(emojiPickerRef, () => {
    if (showEmojiPicker) setShowEmojiPicker(false);
  });
  useOutsideClick(reactionsMenuRef, () => {
    if (showReactions) setShowReactions(false);
  });
  useOutsideClick(optionRef, () => {
    if (showOptions) setShowOptions(false);
  });

  if (message === 0) return;
  return (
    <div className={`chat ${bubbleClass}`}>
      <div className={`${bubbleContentClass} relative group`} ref={messageRef}>
        <div className={`flex ${classMessage} gap-2`}>
          {message.contentType === "text" && (
            <p className="mr-2">{message.content}</p>
          )}
          {message.contentType === "image" && (
            <div>
              <img
                src={message.imageOrVideoUrl}
                alt=""
                className="rounded-lg max-w-xs"
              />
              <p className="mt-1">{message.content}</p>
            </div>
          )}
        </div>
        <div
          className={`self-end flex items-center  gap-1 text-xs opacity-60 mt-2 ml-2 justify-end`}
        >
          <span>{format(new Date(message.createdAt), "hh:mm a")}</span>
          {isUserMessage && (
            <>
              {message.messageStatus === "send" && <FaCheck size={12} />}
              {message.messageStatus === "delivered" && (
                <FaCheckDouble size={12} />
              )}
              {message.messageStatus === "read" && (
                <FaCheckDouble size={12} className="text-green-500" />
              )}
            </>
          )}
        </div>
        <div
          className={`absolute top-1  opacity-0 group-hover:opacity-100 transition-opacity z-20 ${
            isUserMessage ? "left-1" : "right-1"
          }`}
        >
          <button
            onClick={() => setShowOptions((prev) => !prev)}
            className={`p-1 rounded-full text-gray-800`}
          >
            <HiDotsVertical size={18} />
          </button>
        </div>
        <div
          className={`absolute ${
            isUserMessage ? "-left-10" : "-right-10"
          } top-1/2 transform -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2 flex-col`}
        >
          <button
            onClick={() => setShowReactions((prev) => !prev)}
            className={`p-2 rounded-full bg-white hover:bg-gray-100`}
          >
            <FaSmile className="text-gray-600" />
          </button>
        </div>
        {showReactions && (
          <div
            ref={reactionsMenuRef}
            className={`absolute bg-white -top-8 ${
              isUserMessage ? "left-0" : "left-36"
            } transform -translate-x-1/2 flex items-center  rounded-full px-2 py-1.5 gap-1 shadow-lg z-20`}
          >
            {quickReactions.map((emoji, index) => (
              <button
                key={index}
                onClick={() => handleReact(emoji)}
                className="hover:scale-125 transition-transform p-1"
              >
                {emoji}
              </button>
            ))}
            <div className="w-[1px] h-5 bg-gray-600 mx-1"></div>
            <button
              onClick={() => setShowEmojiPicker(true)}
              className="  rounded-full p-1"
            >
              <FaPlus />
            </button>
          </div>
        )}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute mb-6 left-0 z-50">
            <div className="relative">
              <EmojiPicker
                onEmojiClick={(emoji) => {
                  handleReact(emoji.emoji);
                  setShowEmojiPicker(false);
                }}
                theme={theme}
              />
              <button
                onClick={() => setShowEmojiPicker(false)}
                className="absolute top-2 right-2 text-gray-500"
              >
                <RxCross2 />
              </button>
            </div>
          </div>
        )}
        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`absolute -bottom-5 ${
              isUserMessage ? "right-2" : "left-2"
            } bg-gray-200 rounded-full px-2  flex items-center gap-1 z-20`}
          >
            {message.reactions.map((reaction, index) => (
              <span key={index} className="mr-1">
                {reaction.emoji}
              </span>
            ))}
          </div>
        )}
        {showOptions && (
          <div
            ref={optionRef}
            className="absolute top-8 rounded-xl w-36 z-50 right-1 shadow-lg text-sm bg-gray-100 text-black"
          >
            <button
              onClick={() => {
                if (message.contentType === "text") {
                  navigator.clipboard.writeText(message.content);
                }
                setShowOptions(false);
              }}
              className="flex items-center w-full px-4 py-2 gap-3 rounded-lg"
            >
              <FaRegCopy size={14} />
              <span>Copy</span>
            </button>
            {isUserMessage && (
              <button
                onClick={() => {
                  deleteMessage(message._id);
                  setShowOptions(false);
                }}
                className="flex items-center w-full px-4 py-2 gap-3 rounded-lg text-red-500"
              >
                <FaRegCopy className="text-red-500" size={14} />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
