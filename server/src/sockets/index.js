import { Server } from 'socket.io';
import socketAuthMiddleware from './socketAuth.middleware.js';
import { joinAuthorizedRooms } from './socketRooms.js';
import { SOCKET_EVENTS } from './socketConstants.js';

let ioInstance = null;

/**
 * Initializes and binds Socket.IO server to the existing HTTP server instance
 *
 * @param {import('http').Server} httpServer
 * @returns {Server} Initialized Socket.IO Server instance
 */
export function initSocketServer(httpServer) {
  if (ioInstance) {
    console.warn('[SocketServer Warning]: Socket.IO server already initialized. Returning existing instance.');
    return ioInstance;
  }

  // 1. Resolve authorized CORS origins from environment
  const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
  const allowedOrigins = [clientOrigin, 'http://localhost:5173'];

  // 2. Instantiate Socket.IO Server attached to existing HTTP server
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Allow mobile apps/curl/postman or matching origin
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`CORS origin ${origin} not allowed for WebSockets.`));
        }
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
    pingTimeout: 20000,
    pingInterval: 25000,
  });

  // 3. Register cryptographic authentication middleware
  io.use(socketAuthMiddleware);

  // 4. Connection lifecycle handler
  io.on('connection', (socket) => {
    const user = socket.data?.user;
    if (!user) {
      socket.disconnect(true);
      return;
    }

    // Server-enforced room joining based on verified identity
    const joinedRooms = joinAuthorizedRooms(socket);

    // Notify client of successful authentication and authorized rooms
    socket.emit(SOCKET_EVENTS.CONNECTION_AUTHENTICATED, {
      userId: user.id,
      role: user.role,
      rooms: joinedRooms,
      connectedAt: new Date().toISOString(),
    });

    // Security Guard: Prohibit client-side room escalation
    socket.on('joinRoom', (room) => {
      console.warn(`[Security Alert]: Socket ${socket.id} (user: ${user.id}, role: ${user.role}) attempted unauthorized joinRoom for "${room}". Blocked.`);
      socket.emit(SOCKET_EVENTS.SYSTEM_ERROR, {
        message: 'Privileged room assignment is server-enforced only.',
      });
    });

    // Cleanup on disconnect
    socket.on('disconnect', (reason) => {
      // Socket.IO automatically leaves rooms on disconnect
    });

    socket.on('error', (err) => {
      console.error(`[Socket Error] Socket ${socket.id}:`, err.message);
    });
  });

  ioInstance = io;
  console.log('[SocketServer] Real-time Socket.IO engine initialized successfully.');
  return ioInstance;
}

/**
 * Accessor for the active Socket.IO server instance
 * @returns {Server|null}
 */
export function getIO() {
  return ioInstance;
}

/**
 * For testing or server shutdown: resets the active Socket.IO instance
 */
export function closeSocketServer() {
  if (ioInstance) {
    ioInstance.close();
    ioInstance = null;
  }
}

export default {
  initSocketServer,
  getIO,
  closeSocketServer,
};
