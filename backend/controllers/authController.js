const User = require("../models/User");
const Conversation = require("../models/Conversation");
const { sendOtpToPhoneNumber } = require("../services/twillioService");
const { sendOtpToEmail } = require("../services/emailService");
const twilioService = require("../services/twillioService");
const otpGenerate = require("../utils/otpGenerator");
const response = require("../utils/reponseHandler");
const generateToken = require("../utils/generateToken");
const { uploadFileToCloudinary } = require("../config/cloudinaryConfig");
const sendOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email } = req.body;
  const otp = otpGenerate();
  console.log("🚀 ~ sendOtp ~ otp:", otp);
  const expiry = new Date(Date.now() + 5 * 60 * 1000);
  let user;
  try {
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        user = new User({
          email,
        });
      }
      user.emailOtp = otp;
      user.emailOtpExpiry = expiry;
      await user.save();
      await sendOtpToEmail(email, otp);
      return response(res, 200, "OTP sent successfully", user);
    }
    if (!phoneNumber || !phoneSuffix) {
      return response(res, 400, "Phone number is required");
    }
    const fullphoneNumber = `${phoneSuffix}${phoneNumber}`;
    user = await User.findOne({ phoneNumber });
    if (!user) {
      user = new User({
        phoneNumber,
        phoneSuffix,
      });
    }
    // await sendOtpToPhoneNumber(fullphoneNumber, otp);
    await user.save();
    return response(res, 200, "OTP sent successfully", user);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};
// verify otp
const verifyOtp = async (req, res) => {
  const { phoneNumber, phoneSuffix, email, otp } = req.body;
  try {
    let user;
    if (email) {
      user = await User.findOne({ email });
      if (!user) {
        return response(res, 404, "User not found");
      }
      const now = new Date();
      if (
        !user.emailOtp ||
        String(user.emailOtp) !== String(otp) ||
        now > new Date(user.emailOtpExpiry)
      ) {
        return response(res, 400, "Invalid OTP");
      }
      user.isVerified = true;
      user.emailOtp = null;
      user.emailOtpExpiry = null;
      await user.save();
      const token = generateToken(user?._id);
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });
      return response(res, 200, "OTP verified successfully", {
        user,
        token,
      });
    } else {
      if (!phoneNumber || !phoneSuffix) {
        return response(res, 400, "Phone number is required");
      }
      const fullphoneNumber = `${phoneNumber}${phoneSuffix}`;
      user = await User.findOne({ phoneNumber });
      if (!user) {
        return response(res, 404, "User not found");
      }
      // const res = await twilioService.verifyOtp(fullphoneNumber, otp);

      // if (res.status !== "approved") {
      //   return response(res, 400, "Invalid OTP");
      // }
      user.isVerified = true;
      await user.save();
      const token = generateToken(user?._id);
      res.cookie("auth_token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        maxAge: 1000 * 60 * 60 * 24 * 365,
      });
      return response(res, 200, "OTP verified successfully", {
        user,
        token,
      });
    }
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const updateProfile = async (req, res) => {
  const { username, argeed, about } = req.body;
  const userId = req.user.userId;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }
    const file = req.file;
    if (file) {
      const uploadResult = await uploadFileToCloudinary(file);
      user.profilePicture = uploadResult?.secure_url;
    } else if (req.body.profilePicture) {
      user.profilePicture = req.body.profilePicture;
    }
    if (username) user.username = username;
    if (argeed) user.argeed = argeed;
    if (about) user.about = about;
    await user.save();
    return response(res, 200, "Profile updated successfully", user);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const checkAuthenticated = async (req, res) => {
  try {
    const userId = req.user.userId;
    if (!userId) {
      return response(res, 401, "Unauthorized");
    }
    const user = await User.findById(userId);
    if (!user) {
      return response(res, 404, "User not found");
    }

    return response(res, 200, "User is authenticated", user);
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const logout = async (req, res) => {
  try {
    res.cookie("auth_token", { expires: new Date(0) });
    return response(res, 200, "Logout successfully");
  } catch (error) {
    console.log(error);
    return response(res, 500, "Internal server error");
  }
};

const getAllUsers = async (req, res) => {
  const loggedInUserId = req.user.userId;
  try {
    const users = await User.find({ _id: { $ne: loggedInUserId } })
      .select(
        "username profilePicture lastSeen isOnline about phoneNumber phoneSuffix"
      )
      .lean();

    const usersWithConversation = await Promise.all(
      users.map(async (user) => {
        const conversation = await Conversation.findOne({
          participants: { $all: [loggedInUserId, user?._id] },
        })
          .populate({
            path: "lastMessage",
            select: " createdAt sender receiver content",
          })
          .lean();

        return {
          ...user,
          conversation: conversation || null,
        };
      })
    );

    return response(
      res,
      200,
      "Users fetched successfully",
      usersWithConversation
    );
  } catch (error) {
    return response(res, 500, "Internal server error");
  }
};

module.exports = {
  sendOtp,
  verifyOtp,
  updateProfile,
  logout,
  checkAuthenticated,
  getAllUsers,
};
