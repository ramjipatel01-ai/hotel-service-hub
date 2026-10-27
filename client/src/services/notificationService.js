import api from './api';

/**
 * Client-Side Notification API Service
 * Handles notification retrieval and status updates
 */

/**
 * Fetch paginated notifications for the authenticated user
 * @param {Object} [params] - Query options ({ isRead, page, limit })
 * @returns {Promise<Object>} API response with notifications and unread count
 */
export async function getNotifications(params = {}) {
  const response = await api.get('/notifications', { params });
  return response.data;
}

/**
 * Fetch current unread notification count
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadNotificationCount() {
  const response = await api.get('/notifications/unread-count');
  return response.data?.data?.unreadCount || 0;
}

/**
 * Mark a specific notification as read
 * @param {string} notificationId
 * @returns {Promise<Object>} Updated notification
 */
export async function markNotificationAsRead(notificationId) {
  const response = await api.patch(`/notifications/${notificationId}/read`);
  return response.data;
}

/**
 * Mark all notifications for the authenticated user as read
 * @returns {Promise<Object>} Result confirmation
 */
export async function markAllNotificationsAsRead() {
  const response = await api.patch('/notifications/read-all');
  return response.data;
}

export default {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
