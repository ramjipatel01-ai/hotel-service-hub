import Notification from '../models/Notification.js';
import { NOTIFICATION_TYPE } from '../config/constants.js';
import { emitNotification } from './realtime.service.js';

/**
 * Persists an in-app notification document
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.userId - Recipient user ID
 * @param {string|mongoose.Types.ObjectId} [options.requestId] - Associated request ID
 * @param {string} options.title - Notification title
 * @param {string} options.message - Notification message content
 * @param {string} [options.type] - Valid NOTIFICATION_TYPE enum
 * @returns {Promise<Object|null>} Created notification document or null if failed safely
 */
export async function createNotification({
  userId,
  requestId = null,
  title,
  message,
  type = NOTIFICATION_TYPE.REQUEST_CREATED,
}) {
  try {
    if (!userId || !title || !message) {
      return null;
    }

    const notification = await Notification.create({
      user: userId,
      request: requestId,
      title: title.trim(),
      message: message.trim(),
      type,
      isRead: false,
    });

    // Real-time delivery enhancement (non-blocking)
    emitNotification(notification);

    return notification;
  } catch (error) {
    // Non-blocking error logging for notification creation failures
    console.warn('[NotificationService Warning]: Failed to persist notification:', error.message);
    return null;
  }
}


/**
 * Creates notifications for relevant stakeholders during lifecycle events
 *
 * @param {string} event - Event name (e.g., 'CREATED', 'ASSIGNED', etc.)
 * @param {Object} request - Request document (populated or raw)
 * @param {Object} [meta] - Additional details (e.g., actor, reason)
 */
export async function dispatchLifecycleNotifications(event, request, meta = {}) {
  try {
    const reqNum = request.requestNumber || 'Request';
    const serviceName = request.serviceTitle || 'Hotel Service';

    switch (event) {
      case 'CREATED':
        // Notify Guest that request was received
        if (request.guest) {
          await createNotification({
            userId: request.guest,
            requestId: request._id,
            title: `Request Submitted: ${reqNum}`,
            message: `Your request for "${serviceName}" has been received and is being processed.`,
            type: NOTIFICATION_TYPE.REQUEST_CREATED,
          });
        }
        // If request is URGENT, notify admin as well
        if (request.priority === 'URGENT') {
          // (In Phase 5, socket broadcast will alert admins; here persistent alert can be stored if admin user ID is known)
        }
        break;

      case 'ASSIGNED':
        // Notify Staff that they have a new task assigned
        if (request.assignedStaff) {
          await createNotification({
            userId: request.assignedStaff,
            requestId: request._id,
            title: `New Assignment: ${reqNum}`,
            message: `You have been assigned to "${serviceName}". Please review and accept.`,
            type: NOTIFICATION_TYPE.REQUEST_ASSIGNED,
          });
        }
        // Also notify guest that staff was assigned
        if (request.guest) {
          await createNotification({
            userId: request.guest,
            requestId: request._id,
            title: `Staff Assigned: ${reqNum}`,
            message: `A staff member has been assigned to your request for "${serviceName}".`,
            type: NOTIFICATION_TYPE.REQUEST_ASSIGNED,
          });
        }
        break;

      case 'ACCEPTED':
        // Notify Guest that staff accepted and is getting ready
        if (request.guest) {
          await createNotification({
            userId: request.guest,
            requestId: request._id,
            title: `Request Accepted: ${reqNum}`,
            message: `Staff has accepted your request for "${serviceName}".`,
            type: NOTIFICATION_TYPE.REQUEST_ACCEPTED,
          });
        }
        break;

      case 'STARTED':
        // Notify Guest that staff began work
        if (request.guest) {
          await createNotification({
            userId: request.guest,
            requestId: request._id,
            title: `Work Started: ${reqNum}`,
            message: `Staff has started work on your request for "${serviceName}".`,
            type: NOTIFICATION_TYPE.REQUEST_STARTED,
          });
        }
        break;

      case 'COMPLETED':
        // Notify Guest that task is finished and awaiting confirmation
        if (request.guest) {
          await createNotification({
            userId: request.guest,
            requestId: request._id,
            title: `Request Completed: ${reqNum}`,
            message: `Staff has marked your request for "${serviceName}" as completed. Please confirm and leave feedback.`,
            type: NOTIFICATION_TYPE.REQUEST_COMPLETED,
          });
        }
        break;

      case 'CONFIRMED':
        // Notify assigned staff that guest confirmed satisfactory completion
        if (request.assignedStaff) {
          await createNotification({
            userId: request.assignedStaff,
            requestId: request._id,
            title: `Request Confirmed: ${reqNum}`,
            message: `The guest has confirmed completion of "${serviceName}". Great job!`,
            type: NOTIFICATION_TYPE.REQUEST_CONFIRMED,
          });
        }
        break;

      case 'CANCELLED':
        // If guest cancelled, notify assigned staff
        if (request.assignedStaff) {
          await createNotification({
            userId: request.assignedStaff,
            requestId: request._id,
            title: `Request Cancelled: ${reqNum}`,
            message: `Request "${serviceName}" was cancelled.${meta.reason ? ` Reason: ${meta.reason}` : ''}`,
            type: NOTIFICATION_TYPE.REQUEST_CANCELLED,
          });
        }
        // If admin cancelled, notify guest
        if (request.guest && meta.performedByRole && meta.performedByRole !== 'GUEST') {
          await createNotification({
            userId: request.guest,
            requestId: request._id,
            title: `Request Cancelled: ${reqNum}`,
            message: `Your request "${serviceName}" was cancelled by management.${meta.reason ? ` Reason: ${meta.reason}` : ''}`,
            type: NOTIFICATION_TYPE.REQUEST_CANCELLED,
          });
        }
        break;

      default:
        break;
    }
  } catch (err) {
    console.warn('[NotificationService Warning]: Error dispatching lifecycle notifications:', err.message);
  }
}
