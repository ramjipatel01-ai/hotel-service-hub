import mongoose from 'mongoose';

/**
 * Connect to MongoDB Atlas with robust error handling and sanitized logging.
 * Returns true if connected, false otherwise.
 */
export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    console.warn('\x1b[33m%s\x1b[0m', '[Database] MONGODB_URI is not set in environment variables.');
    console.warn('\x1b[33m%s\x1b[0m', '[Database] Running without an active database connection until .env is configured.');
    return false;
  }

  if (uri.includes('YOUR_DB_PASSWORD')) {
    console.warn('\x1b[33m%s\x1b[0m', '[Database] MONGODB_URI contains placeholder "YOUR_DB_PASSWORD".');
    console.warn('\x1b[33m%s\x1b[0m', '[Database] Please set your database password in server/.env to connect to MongoDB Atlas.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('\x1b[32m%s\x1b[0m', `[Database] MongoDB Atlas connected successfully: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', `[Database] MongoDB connection failed: ${error.message}`);
    console.warn('\x1b[33m%s\x1b[0m', '[Database] Check network access (IP whitelist in Atlas) and database credentials.');
    return false;
  }
}

/**
 * Check if the database connection is currently active.
 */
export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}
