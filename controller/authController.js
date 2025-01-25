const { loginService, signUpService, verifyOtpService, resendOtpService } = require("../service/authService");

async function loginController(req, res) {
    try {
        const response = await loginService(req, res);
        return response;
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function signupController(req, res) {
    try {
        const response = await signUpService(req, res);
        return response;
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function verifyOtpController(req, res) {
    try {
        const response = await verifyOtpService(req, res);
        return response;
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}

async function resendOtpController(req, res) {
    try {
        const response = await resendOtpService(req, res);
        return response;
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
module.exports = {
    loginController,
    signupController,
    verifyOtpController,
    resendOtpController,
}