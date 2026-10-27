import Notification from '../models/Notification.js';
import { emitNotificationRead } from '../services/realtime.service.js';

/**
 * Retrieves the paginated notification list for the authenticated user
 * Route: GET /api/notifications
 */
export async function getUserNotifications(req, res, next) {
  try {
    const userId = req.user._id;
    const { isRead, page = 1, limit = 20 } = req.query;

    const filter = { user: userId };
    if (isRead !== undefined) {
      filter.isRead = isRead === 'true';
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(filter)
        .populate('request', 'requestNumber serviceTitle status priority')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Notification.countDocuments(filter),
      Notification.countDocuments({ user: userId, isRead: false }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully.',
      data: {
        notifications,
        unreadCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Returns the unread notification count for the authenticated user
 * Route: GET /api/notifications/unread-count
 */
export async function getUnreadNotificationCount(req, res, next) {
  try {
    const userId = req.user._id;
    const unreadCount = await Notification.countDocuments({ user: userId, isRead: false });

    return res.status(200).json({
      success: true,
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marks a single notification as read with strict ownership enforcement
 * Route: PATCH /api/notifications/:id/read
 */
export async function markNotificationAsRead(req, res, next) {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found.',
      });
    }

    // Strict Access Rule: A user can ONLY read/modify their own notifications
    if (notification.user.toString() !== userId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only modify your own notifications.',
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      await notification.save();

      // Emit real-time synchronization to user's connected clients/tabs
      emitNotificationRead(userId, notification._id.toString());
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: { notification },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Marks all notifications for the authenticated user as read
 * Route: PATCH /api/notifications/read-all
 */
export async function markAllNotificationsAsRead(req, res, next) {
  try {
    const userId = req.user._id;

    // Find all unread notifications first to emit their IDs
    const unreadNotifs = await Notification.find({ user: userId, isRead: false }).select('_id');
    const unreadIds = unreadNotifs.map((n) => n._id.toString());

    if (unreadIds.length > 0) {
      await Notification.updateMany(
        { user: userId, isRead: false },
        { $set: { isRead: true } }
      );

      // Emit real-time sync for all updated IDs
      emitNotificationRead(userId, unreadIds);
    }

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      data: { updatedCount: unreadIds.length },
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
