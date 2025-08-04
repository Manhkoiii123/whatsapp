const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const Status = require("../models/Status");
const response = require("../utils/reponseHandler");
const createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;
    let mediaUrl = null;
    let finalContentType = contentType || "text";
    if (file) {
      const uploadFile = await uploadFileToCloudinary(file);
      if (!uploadFile?.secure_url) {
        return response(res, 400, "Failed to upload file to cloudinary");
      }
      mediaUrl = uploadFile?.secure_url;
      if (file.mimetype.startWith("video")) {
        finalContentType = "video";
      } else if (file.mimetype.startWith("image")) {
        finalContentType = "image";
      } else {
        return response(res, 400, "Invalid file type");
      }
    } else if (content?.trim()) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Message content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await new Status({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });
    await status.save();

    const populateStatus = await Status.findOne(status?._id)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .lean();

    return response(res, 200, "Status sent successfully", populateStatus);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const getStatus = async (req, res) => {
  try {
    const status = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 })
      .lean();
    return response(res, 200, "Get status successfully", status);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
const viewStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (status.viewers.includes(userId)) {
      return response(res, 400, "You have already seen this status");
    }
    status.viewers.push(userId);
    await status.save();
    const updatedStatus = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");
    return response(res, 200, "Status viewed successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
const deleteStatus = async (req, res) => {
  const { statusId } = req.params;
  const userId = req.user.userId;
  try {
    const status = await Status.findById(statusId);
    if (!status) {
      return response(res, 404, "Status not found");
    }
    if (status.user.toString() !== userId) {
      return response(res, 401, "Unauthorized");
    }
    await status.deleteOne();
    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
module.exports = { createStatus, getStatus, viewStatus, deleteStatus };
