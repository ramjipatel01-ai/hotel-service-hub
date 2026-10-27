import User from '../models/User.js';
import { USER_ROLES } from '../config/constants.js';
import {
  generateToken,
  hashPassword,
  comparePassword,
  sanitizeUser,
  verifyGoogleIdToken,
} from '../services/auth.service.js';
import { assignUniqueRoomToGuest } from '../services/roomAssignment.service.js';

/**
 * @route   POST /api/auth/register
 * @desc    Public registration strictly for GUEST accounts
 * @access  Public
 */
export async function register(req, res) {
  try {
    const { name, email, phone, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Check for existing account with this email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    // Hash password securely with bcrypt
    const hashedPassword = await hashPassword(password);

    // Auto-promote if matches designated ADMIN_EMAIL from environment
    const isAdminEmail = process.env.ADMIN_EMAIL && normalizedEmail === process.env.ADMIN_EMAIL.toLowerCase();
    const assignedRole = isAdminEmail ? USER_ROLES.ADMIN : USER_ROLES.GUEST;

    // Create user record
    const newUser = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      phone: phone ? String(phone).trim() : '',
      password: hashedPassword,
      role: assignedRole,
      isActive: true,
    });

    // Auto-assign unique room if guest
    if (assignedRole === USER_ROLES.GUEST) {
      await assignUniqueRoomToGuest(newUser);
    }
    await newUser.populate('room', 'roomNumber floor roomType status');

    // Generate JWT token
    const token = generateToken(newUser);

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      data: {
        user: sanitizeUser(newUser),
        token,
      },
    });
  } catch (error) {
    console.error('[Register Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal error occurred during registration.',
    });
  }
}

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user and issue JWT
 * @access  Public
 */
export async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = String(email).trim().toLowerCase();

    // Query user record including password hash
    const user = await User.findOne({ email: normalizedEmail });

    // Generic error message prevents account enumeration
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Verify account active status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account is deactivated. Please contact hotel administration.',
      });
    }

    // Compare passwords securely
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Auto-assign unique room if guest does not have one yet
    if (user.role === USER_ROLES.GUEST && !user.room) {
      await assignUniqueRoomToGuest(user);
    }
    await user.populate('department', 'name code icon');
    await user.populate('room', 'roomNumber floor roomType status');

    // Generate JWT token
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error) {
    console.error('[Login Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Internal error occurred during login.',
    });
  }
}

/**
 * @route   POST /api/auth/google
 * @desc    Authenticate or register user via verified Google ID token
 * @access  Public
 */
export async function googleAuth(req, res) {
  try {
    const tokenToVerify = req.body?.idToken || req.body?.credential;

    if (!tokenToVerify) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token (credential) is required.',
      });
    }

    // Cryptographically verify Google ID token with google-auth-library
    const googleProfile = await verifyGoogleIdToken(tokenToVerify);
    const { googleId, email, name, avatar } = googleProfile;

    // Check if user already exists by googleId or by verified email
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // Check if account has been deactivated
      if (!user.isActive) {
        return res.status(403).json({
          success: false,
          message: 'Your account is deactivated. Please contact hotel administration.',
        });
      }

      // Link googleId or update avatar if missing
      let modified = false;
      if (!user.googleId) {
        user.googleId = googleId;
        modified = true;
      }
      if (!user.avatar && avatar) {
        user.avatar = avatar;
        modified = true;
      }
      if (modified) {
        await user.save();
      }

      // Ensure existing guest has their unique room
      if (user.role === USER_ROLES.GUEST && !user.room) {
        await assignUniqueRoomToGuest(user);
      }
    } else {
      // Auto-assign ADMIN if designated in environment, else default GUEST
      const isAdminEmail =
        process.env.ADMIN_EMAIL &&
        email === process.env.ADMIN_EMAIL.toLowerCase();
      const assignedRole = isAdminEmail ? USER_ROLES.ADMIN : USER_ROLES.GUEST;

      user = await User.create({
        name,
        email,
        googleId,
        authProvider: 'google',
        role: assignedRole,
        avatar: avatar || null,
        isActive: true,
      });

      // Auto-assign unique room if guest
      if (assignedRole === USER_ROLES.GUEST) {
        await assignUniqueRoomToGuest(user);
      }
    }

    await user.populate('department', 'name code icon');
    await user.populate('room', 'roomNumber floor roomType status');

    // Generate JWT token matching existing auth format
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: 'Google authentication successful',
      data: {
        user: sanitizeUser(user),
        token,
      },
    });
  } catch (error) {
    console.error('[Google Auth Error]:', error.message);
    const status = error.statusCode || 401;
    return res.status(status).json({
      success: false,
      message: error.message || 'Failed to authenticate with Google.',
    });
  }
}

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user's profile
 * @access  Protected
 */
export async function getMe(req, res) {
  try {
    // req.user is loaded and verified by authenticate middleware
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found.',
      });
    }

    // Auto-assign unique room if guest doesn't have one
    if (user.role === USER_ROLES.GUEST && !user.room) {
      await assignUniqueRoomToGuest(user);
    }

    await user.populate('department', 'name code icon');
    await user.populate('room', 'roomNumber floor roomType status');

    return res.status(200).json({
      success: true,
      message: 'Profile retrieved successfully',
      data: {
        user: sanitizeUser(user),
      },
    });
  } catch (error) {
    console.error('[GetMe Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile.',
    });
  }
}

/**
 * @route   PATCH /api/auth/change-password
 * @desc    Change password for authenticated user
 * @access  Protected
 */
export async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User account not found.',
      });
    }

    const isMatch = await comparePassword(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password provided is incorrect.',
      });
    }

    // Hash and store new password
    user.password = await hashPassword(newPassword);
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully.',
    });
  } catch (error) {
    console.error('[ChangePassword Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to update password.',
    });
  }
}

/**
 * @route   POST /api/auth/logout
 * @desc    Client-directed stateless logout
 * @access  Public / Protected
 */
export async function logout(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please discard client authentication token.',
  });
}
