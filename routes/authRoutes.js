// routes/authRoutes.js
const express = require('express');
const { loginController, signupController, verifyOtpController, resendOtpController } = require('../controller/authController');

const router = express.Router();

router.post('/login', loginController);
router.post('/signup', signupController);
router.post('/verify-otp', verifyOtpController);
router.post('/resend-otp', resendOtpController);

module.exports = router;
