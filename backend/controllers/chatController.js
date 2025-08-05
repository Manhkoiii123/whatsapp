const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const response = require("../utils/reponseHandler");
const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, messageStatus } = req.body;
    const file = req.file;
    const participants = [senderId, receiverId].sort();
    // có conver rồi
    let conversation = await Conversation.findOne({ participants });
    if (!conversation) {
      conversation = await new Conversation({
        participants,
      });
      await conversation.save();
    }
    let imageOrVideoUrl = null;
    let contentType = null;
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload file to cloudinary");
      }
      imageOrVideoUrl = uploadFile?.secure_url;
      if (file.mimetype.startWith("video")) {
        contentType = "video";
      } else if (file.mimetype.startWith("image")) {
        contentType = "image";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      contentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }
    const message = await new Message({
      conversation: conversation?._id,
      sender: senderId,
      receiver: receiverId,
      content,
      imageOrVideoUrl,
      contentType,
      messageStatus,
    });
    await message.save();
    if (message?.content) {
      conversation.lastMessage = message?._id;
    }
    conversation.unreadCount += 1;
    await conversation.save();
    const populateMessage = await Message.findOne(message?._id)
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .lean();

    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(receiverId);
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("receive_message", populateMessage);
        message.messageStatus = "delivered";
        await message.save();
      }
    }

    return response(res, 200, "Message sent successfully", populateMessage);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const getConservation = async (req, res) => {
  const userId = req.user.userId;
  try {
    let conversations = await Conversation.find({
      participants: { $all: [userId] },
    })
      .populate("participants", "username profilePicture isOnline lastSeen")
      .populate({
        path: "lastMessage",
        populate: {
          path: "sender receiver",
          select: "username profilePicture",
        },
      })
      .sort({ updatedAt: -1 });

    return response(res, 200, "Get conversation successfully", conversations);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const getMessages = async (req, res) => {
  const { conversationId } = req.params;
  const userId = req.user.userId;
  try {
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return response(res, 404, "Conversation not found");
    }
    if (!conversation.participants.includes(userId)) {
      return response(res, 404, "Conversation not found");
    }
    const messages = await Message.find({ conversation: conversationId })
      .populate("sender", "username profilePicture")
      .populate("receiver", "username profilePicture")
      .sort({ createdAt: 1 })
      .lean();
    await Message.updateMany(
      {
        conversation: conversationId,
        receiver: userId,
        messageStatus: { $in: ["seen", "delivered"] },
      },
      {
        $set: {
          messageStatus: "seen",
        },
      }
    );
    conversation.unreadCount = 0;
    await conversation.save();
    return response(res, 200, "Get messages successfully", messages);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const markAsRead = async (req, res) => {
  const { messageIds } = req.body;
  const userId = req.user.userId;
  try {
    let messages = await Message.find({
      _id: { $in: messageIds },
      receiver: userId,
    });
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        receiver: userId,
      },
      {
        $set: {
          messageStatus: "read",
        },
      }
    );

    if (req.io && req.socketUserMap) {
      for (const message of messages) {
        const senderSocketId = req.socketUserMap.get(message.sender.toString());
        if (senderSocketId) {
          const updateMessage = {
            _id: message._id,
            messageStatus: "read",
          };
          req.io.to(senderSocketId).emit("message_read", updateMessage);
          await message.save();
        }
      }
    }
    return response(res, 200, "Mark as read successfully", messages);
  } catch (error) {}
};

const deleteMessage = async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user.userId;
  try {
    const message = await Message.findById(messageId);
    if (!message) {
      return response(res, 404, "Message not found");
    }
    if (message.sender.toString() !== userId) {
      return response(res, 401, "Unauthorized");
    }
    await message.deleteOne();
    if (req.io && req.socketUserMap) {
      const receiverSocketId = req.socketUserMap.get(
        message.receiver.toString()
      );
      if (receiverSocketId) {
        req.io.to(receiverSocketId).emit("message_deleted", messageId);
      }
    }
    return response(res, 200, "Message deleted successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

module.exports = {
  sendMessage,
  getConservation,
  getMessages,
  markAsRead,
  deleteMessage,
};
