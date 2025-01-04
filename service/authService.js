
const jwt = require('jsonwebtoken');
const { account } = require('../config/db'); 
require('dotenv').config();

const loginService = async (req, res) => {
    const { email, password } = req.body;
    try {
        const session = await account.createEmailPasswordSession(email, password);
        const expiresIn = '1h';
        const expirationTime = new Date(Date.now() + 60 * 60 * 1000);
        const token = jwt.sign(
            {
                userId: session.userId,
                email: email,
            },
            process.env.JWT_SECRET,
            { expiresIn: expiresIn }
        );

        const data = {
            success: true,
            userId: session.userId,
            token: token,
            expiresIn:expirationTime,
        }

        return res.json(data);
    } catch (error) {
        console.error('Login error:', error);
        return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
};

module.exports = { loginService };
