import { verifyToken } from '../services/auth.service.js';
import User from '../models/User.js';

/**
 * Socket.IO Handshake Authentication Middleware
 *
 * Verifies JWT token supplied during Socket handshake:
 * auth: { token: "<JWT>" } or header Authorization: "Bearer <JWT>"
 *
 * Enforces:
 * 1. Valid non-expired JWT signature
 * 2. Existing user record in database
 * 3. Active account status (isActive === true)
 * 4. Attaches verified identity to socket.data.user
 */
export async function socketAuthMiddleware(socket, next) {
  try {
    // 1. Extract token from auth payload or fallback authorization header
    let token = socket.handshake.auth?.token;

    if (!token && socket.handshake.headers?.authorization) {
      const authHeader = socket.handshake.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      const err = new Error('Authentication error: Token is required');
      err.data = { code: 'NO_TOKEN' };
      return next(err);
    }

    // 2. Cryptographic signature and expiration verification
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        const err = new Error('Authentication error: Token expired');
        err.data = { code: 'TOKEN_EXPIRED' };
        return next(err);
      }
      const err = new Error('Authentication error: Invalid token');
      err.data = { code: 'INVALID_TOKEN' };
      return next(err);
    }

    if (!decoded || !decoded.userId) {
      const err = new Error('Authentication error: Malformed token payload');
      err.data = { code: 'MALFORMED_TOKEN' };
      return next(err);
    }

    // 3. Database user verification
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) {
      const err = new Error('Authentication error: User not found');
      err.data = { code: 'USER_NOT_FOUND' };
      return next(err);
    }

    // 4. Confirm user is active
    if (!user.isActive) {
      const err = new Error('Authentication error: Account deactivated');
      err.data = { code: 'ACCOUNT_DEACTIVATED' };
      return next(err);
    }

    // 5. Attach sanitized identity to socket.data.user
    // Never trust client-supplied role or IDs
    socket.data.user = {
      id: user._id.toString(),
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department ? user.department.toString() : null,
      departmentId: user.department ? user.department.toString() : null,
      room: user.room ? user.room.toString() : null,
      isOnDuty: Boolean(user.isOnDuty),
      isActive: Boolean(user.isActive),
    };

    return next();
  } catch (error) {
    console.error('[SocketAuth Error]:', error.message);
    const err = new Error('Authentication error: Handshake verification failed');
    err.data = { code: 'AUTH_FAILED' };
    return next(err);
  }
}

export default socketAuthMiddleware;
