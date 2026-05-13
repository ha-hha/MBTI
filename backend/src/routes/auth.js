const express = require("express");
const authController = require("../controllers/authController");

const router = express.Router();

router.post("/auth/wx-login", authController.loginWithWeChat);
router.get("/auth/me", authController.getCurrentUserProfile);
router.post("/auth/wx-phone", authController.bindPhoneNumber);
router.post("/auth/logout", authController.logout);

module.exports = router;
