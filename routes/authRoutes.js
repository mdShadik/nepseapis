// routes/authRoutes.js
const express = require('express');
const { loginController } = require('../controller/authController');

const router = express.Router();

router.post('/login', loginController);

module.exports = router;
