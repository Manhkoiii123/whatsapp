const express = require("express");
const authController = require("../controllers/authController");
const authMiddlware = require("../middleware/authMiddleware");
const { multerMiddleware } = require("../config/cloudinaryConfig");
const router = express.Router();

router.post("/send-otp", authController.sendOtp);
router.post("/verify-otp", authController.verifyOtp);
router.post("/logout", authController.logout);

// protected
router.put(
  "/update-profile",
  authMiddlware,
  multerMiddleware,
  authController.updateProfile
);

router.get("/check-auth", authMiddlware, authController.checkAuthenticated);
router.get("/users", authMiddlware, authController.getAllUsers);

module.exports = router;
