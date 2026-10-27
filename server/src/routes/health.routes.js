import { Router } from 'express';
import { isDatabaseConnected } from '../config/database.js';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    API Health check and operational status
 * @access  Public
 */
router.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Hotel Service Hub API is running',
    environment: process.env.NODE_ENV || 'development',
    database: isDatabaseConnected() ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString(),
  });
});

export default router;
