import express from 'express';
import cors from 'cors';
import apiRoutes from './routes/index.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { errorHandler } from './middleware/errorHandler.js';

// Initialize Express application
const app = express();

// Security & CORS Configuration
app.disable('x-powered-by');
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman) or matched origin
    if (!origin || origin === allowedOrigin || origin === 'http://localhost:5173') {
      callback(null, true);
    } else {
      callback(new Error(`CORS origin ${origin} not permitted.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body Parsing Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root informational endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    name: 'Hotel Service Hub API',
    version: '1.0.0',
    status: 'Operational',
    documentation: '/api/health',
  });
});

// Register Central API Routes
app.use('/api', apiRoutes);

// Register 404 & Global Error Handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
