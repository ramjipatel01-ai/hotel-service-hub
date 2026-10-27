import http from 'http';
import dotenv from 'dotenv';
import app from './src/app.js';
import { connectDatabase } from './src/config/database.js';
import { initSocketServer } from './src/sockets/index.js';

// Load environment variables from .env file
dotenv.config();

const PORT = process.env.PORT || 5000;

/**
 * Initialize application services and start HTTP server
 */
async function startServer() {
  try {
    console.log('====================================================');
    console.log('   HOTEL SERVICE HUB — Backend API Initializing     ');
    console.log('====================================================');

    // 1. Establish database connection (fails safely if unconfigured)
    await connectDatabase();

    // 2. Create HTTP server instance
    const server = http.createServer(app);

    // 3. Initialize Socket.IO engine attached to the HTTP server
    initSocketServer(server);

    // 4. Start listening for incoming requests
    server.listen(PORT, () => {
      console.log(`[Server] Running on http://localhost:${PORT}`);
      console.log(`[Server] Health Endpoint: http://localhost:${PORT}/api/health`);
      console.log(`[Server] Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    // Graceful process termination
    const handleShutdown = (signal) => {
      console.log(`\n[Server] Received ${signal}. Closing HTTP listener gracefully...`);
      server.close(() => {
        console.log('[Server] HTTP listener closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGINT', () => handleShutdown('SIGINT'));
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));

  } catch (startupError) {
    console.error('[Server] Fatal startup error:', startupError);
    process.exit(1);
  }
}

startServer();
