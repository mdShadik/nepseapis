// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
require('dotenv').config();

const authValidation = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ success: false, message: 'Token is required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(401).json({ success: false, message: 'Invalid or expired token' });
        }

        req.user = user;
        next();
    });
};

module.exports = authValidation;
