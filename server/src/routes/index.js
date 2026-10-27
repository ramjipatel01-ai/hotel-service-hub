import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import requestRoutes from './request.routes.js';
import notificationRoutes from './notification.routes.js';
import catalogRoutes from './catalog.routes.js';
import feedbackRoutes from './feedback.routes.js';
import analyticsRoutes from './analytics.routes.js';

const router = Router();

// Mount Health Check Route
router.use('/health', healthRoutes);

// Mount Authentication & Session Routes
router.use('/auth', authRoutes);

// Mount User Management & Profile Routes
router.use('/users', userRoutes);

// Mount Service Request Management Routes
router.use('/requests', requestRoutes);

// Mount In-App Notifications Routes
router.use('/notifications', notificationRoutes);

// Mount Guest Feedback Routes
router.use('/feedback', feedbackRoutes);

// Mount Manager Analytics & Reporting Routes
router.use('/analytics', analyticsRoutes);

// Mount Hotel Catalog Routes (/departments, /services, /rooms, /staff)
router.use('/', catalogRoutes);

export default router;
