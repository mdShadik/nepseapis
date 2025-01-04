const { loginService } = require("../service/authService");

async function loginController(req, res) {
    try {
        const response = await loginService(req, res);
        return response;
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}
module.exports = {
    loginController
}