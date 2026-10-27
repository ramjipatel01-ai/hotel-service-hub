import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../controllers/notification.controller.js';

const router = Router();

// All notification operations require authenticated session
router.use(authenticate);

// Get paginated list of user notifications
router.get('/', getUserNotifications);

// Get badge unread count
router.get('/unread-count', getUnreadNotificationCount);

// Mark all user notifications as read
router.patch('/read-all', markAllNotificationsAsRead);

// Mark an individual notification as read (with strict ownership check)
router.patch('/:id/read', markNotificationAsRead);

export default router;
