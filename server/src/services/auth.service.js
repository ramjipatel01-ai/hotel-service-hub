import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

const SALT_ROUNDS = 10;
const googleOAuthClient = new OAuth2Client();

/**
 * Generate a signed JWT token containing minimal identity information
 * @param {Object} user
 * @returns {string} Signed JWT
 */
export function generateToken(user) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing on server.');
  }

  const payload = {
    userId: user._id || user.id,
    role: user.role,
  };

  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verify and decode a JWT token
 * @param {string} token
 * @returns {Object} Decoded payload
 */
export function verifyToken(token) {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET configuration is missing on server.');
  }

  return jwt.verify(token, secret);
}

/**
 * Hash plain text password using bcrypt
 * @param {string} plainPassword
 * @returns {Promise<string>}
 */
export async function hashPassword(plainPassword) {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

/**
 * Compare plain text password with stored hash
 * @param {string} plainPassword
 * @param {string} hashedPassword
 * @returns {Promise<boolean>}
 */
export async function comparePassword(plainPassword, hashedPassword) {
  if (!plainPassword || !hashedPassword) return false;
  return bcrypt.compare(plainPassword, hashedPassword);
}

/**
 * Verifies a Google ID token (credential) and returns the verified profile.
 * Uses google-auth-library to validate the token server-side against GOOGLE_CLIENT_ID.
 * Never trusts user details directly from the frontend.
 *
 * @param {string} idToken - The Google ID token received from the client
 * @returns {Promise<{ googleId: string, email: string, name: string, avatar: string|null }>}
 */
export async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.trim() : null;
  if (!clientId) {
    const error = new Error('GOOGLE_CLIENT_ID configuration is missing on server.');
    error.statusCode = 500;
    throw error;
  }

  const ticket = await googleOAuthClient.verifyIdToken({
    idToken,
    audience: clientId,
  });

  const payload = ticket.getPayload();
  if (!payload) {
    const error = new Error('Unable to verify Google token payload.');
    error.statusCode = 401;
    throw error;
  }

  if (!payload.email_verified) {
    const error = new Error('Google email address has not been verified.');
    error.statusCode = 400;
    throw error;
  }

  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase().trim(),
    name: payload.name ? payload.name.trim() : (payload.given_name || payload.email.split('@')[0]),
    avatar: payload.picture || null,
  };
}

/**
 * Return sanitized user object safe for JSON responses
 * @param {Object} user - Mongoose document or plain object
 * @returns {Object}
 */
export function sanitizeUser(user) {
  if (!user) return null;
  const raw = typeof user.toObject === 'function' ? user.toObject({ virtuals: true }) : user;

  return {
    id: raw._id ? raw._id.toString() : raw.id,
    name: raw.name,
    email: raw.email,
    phone: raw.phone || '',
    role: raw.role,
    department: raw.department || null,
    room: raw.room || null,
    avatar: raw.avatar || null,
    authProvider: raw.authProvider || 'local',
    isActive: raw.isActive !== undefined ? raw.isActive : true,
    isOnDuty: raw.isOnDuty !== undefined ? raw.isOnDuty : true,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
  };
}
