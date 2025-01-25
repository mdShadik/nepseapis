
const jwt = require('jsonwebtoken');
const { account, ID, databases, Query } = require('../config/db'); 
require('dotenv').config();
const bcrypt = require('bcrypt');
const { DateTime } = require('luxon');

const loginService = async (req, res) => {
    const { email, password } = req.body;

    try {
        const userResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_USER_TABLE,
            [Query.equal('email', email)]
        );

        if (userResponse.documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const user = userResponse.documents[0];

        const userRole = user?.roles?.$id

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
            });
        }

        const roleResponse = await databases.getDocument(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_ROLES_TABLE,
            userRole
        );

        const role = roleResponse.role;

        const expiresIn = '1h';
        const token = jwt.sign(
            {
                userId: user.$id,
                email: user.email,
                role: role,
            },
            process.env.JWT_SECRET,
            { expiresIn: expiresIn }
        );

        // Respond with user details and token
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            token: token,
            user: {
                id: user.$id,
                name: user.name,
                email: user.email,
                role: role,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message,
        });
    }
};

const signUpService = async (req, res) => {
    const { name, email, password } = req.body;

    try {
        const existingUserResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_USER_TABLE,
            [Query.equal('email', email)]
        );

        if (existingUserResponse.documents.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Email already exists',
            });
        }

        const rolesResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_ROLES_TABLE,
            [Query.equal('role', 'users')]
        );

        if (rolesResponse.documents.length === 0) {
            return res.status(500).json({ success: false, message: 'Default role not found' });
        }

        const defaultRoleId = rolesResponse.documents[0].$id;

        const hashedPassword = await bcrypt.hash(password, 10);

        const newUser = await databases.createDocument(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_USER_TABLE,
            ID.unique(),
            {
                name: name,
                email: email,
                password: hashedPassword,
                roles: defaultRoleId,
                verified: false,
            }
        );

        const sessionToken = await account.createEmailToken(
            ID.unique(),
            email
        );

        await databases.createDocument(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_OTP_TABLE,
            ID.unique(),
            {
                otp: Number(sessionToken?.secret),
                user_id: newUser?.$id,
                expire_in: sessionToken.expire
            }
        );

        

        return res.status(201).json({
            success: true,
            message: 'User signed up successfully. Please verify your email.',
            user: {
                id: newUser.$id,
                name: newUser.name,
                email: newUser.email,
                role: defaultRoleId,
            },
        });
    } catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({
            success: false,
            message: 'Error during signup',
            error: error.message,
        });
    }
};

const verifyOtpService = async (req, res) => {
    const { email, otp: otpFromReq } = req.body;

    const otp = Number(otpFromReq)

    try {
        // Step 1: Find the user by email
        const userResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_USER_TABLE,
            [Query.equal('email', email)]
        );

        if (userResponse.documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const user = userResponse.documents[0];

        // Step 2: Get the OTP document
        const otpResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_OTP_TABLE,
            [Query.equal('user_id', user.$id)]
        );

        if (otpResponse.documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'OTP not found',
            });
        }

        const otpDocument = otpResponse.documents[0];

        // Step 3: Check if OTP matches and is not expired
        if (otp !== otpDocument.otp) {
            return res.status(400).json({
                success: false,
                message: 'Invalid OTP',
            });
        }

        const currentTime = DateTime.now().setZone('Asia/Kolkata'); // Current time in IST
        const otpExpireTime = DateTime.fromISO(otpDocument.expire_in).setZone('Asia/Kolkata'); // OTP expiry time in IST

        if (currentTime > otpExpireTime) {
            return res.status(400).json({
                success: false,
                message: 'OTP expired',
            });
        }

        // Step 4: Update the user document to mark them as verified
        await databases.updateDocument(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_USER_TABLE,
            user.$id,
            {
                verified: true,
            }
        );

        // Step 5: Return success response
        return res.status(200).json({
            success: true,
            message: 'OTP verified successfully. User is now verified.',
        });
    } catch (error) {
        console.error('Error verifying OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Error verifying OTP',
            error: error.message,
        });
    }
};

const resendOtpService = async (req, res) => {
    const { email } = req.body;

    try {
        // Step 1: Find the user by email
        const userResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_USER_TABLE,
            [Query.equal('email', email)]
        );

        if (userResponse.documents.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        const user = userResponse.documents[0];

        // Step 2: Check if OTP already exists for the user
        const otpResponse = await databases.listDocuments(
            process.env.APPWRITE_DB_ID,
            process.env.APPWRITE_OTP_TABLE,
            [Query.equal('user_id', user.$id)]
        );

        let otpDocument;

        if (otpResponse.documents.length > 0) {
            // OTP exists, so update it
            otpDocument = otpResponse.documents[0];
            const sessionToken = await account.createEmailToken(ID.unique(), email);

            await databases.updateDocument(
                process.env.APPWRITE_DB_ID,
                process.env.APPWRITE_OTP_TABLE,
                otpDocument.$id,
                {
                    otp: Number(sessionToken?.secret),
                    expire_in: sessionToken.expire
                }
            );
        } else {
            // No OTP document found, create a new one
            const sessionToken = await account.createEmailToken(ID.unique(), email);

            otpDocument = await databases.createDocument(
                process.env.APPWRITE_DB_ID,
                process.env.APPWRITE_OTP_TABLE,
                ID.unique(),
                {
                    otp: sessionToken?.secret,
                    userId: user.$id,
                    expiresIn: sessionToken.expire
                }
            );
        }

        // Step 3: Send success response
        return res.status(200).json({
            success: true,
            message: 'OTP sent successfully. Please check your email.',
        });
    } catch (error) {
        console.error('Error resending OTP:', error);
        return res.status(500).json({
            success: false,
            message: 'Error resending OTP',
            error: error.message,
        });
    }
};


module.exports = { loginService, signUpService, verifyOtpService, resendOtpService };
