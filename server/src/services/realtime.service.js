import { getIO } from '../sockets/index.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../sockets/socketConstants.js';
import { getRequestTargetRooms } from '../sockets/socketRooms.js';
import {
  formatSafeRequestPayload,
  formatSafeNotificationPayload,
} from '../sockets/socketPayloads.js';

/**
 * Real-Time Event Dispatch Engine
 *
 * Orchestrates targeted Socket.IO broadcasts for business lifecycle state changes.
 * Enforces:
 * 1. Targeted room delivery (no global broadcasts).
 * 2. Payload sanitization (no credentials or unhashed passwords).
 * 3. Graceful degradation (failures log safely and never abort DB transactions).
 */

/**
 * Emits request created event to targeted stakeholders
 * @param {Object} request - Request document/object
 */
export function emitRequestCreated(request) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request);
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_CREATED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestCreated failed:', error.message);
  }
}

/**
 * Emits request assigned event to targeted stakeholders
 * @param {Object} request - Request document/object
 */
export function emitRequestAssigned(request) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request);
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_ASSIGNED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestAssigned failed:', error.message);
  }
}

/**
 * Emits request accepted event
 * @param {Object} request - Request document/object
 */
export function emitRequestAccepted(request) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request);
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_ACCEPTED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestAccepted failed:', error.message);
  }
}

/**
 * Emits request started event
 * @param {Object} request - Request document/object
 */
export function emitRequestStarted(request) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request);
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_STARTED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestStarted failed:', error.message);
  }
}

/**
 * Emits request completed event
 * @param {Object} request - Request document/object
 */
export function emitRequestCompleted(request) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request);
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_COMPLETED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestCompleted failed:', error.message);
  }
}

/**
 * Emits request confirmed event
 * @param {Object} request - Request document/object
 */
export function emitRequestConfirmed(request) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request);
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_CONFIRMED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestConfirmed failed:', error.message);
  }
}

/**
 * Emits request cancelled event
 * @param {Object} request - Request document/object
 * @param {string} [reason] - Cancellation explanation
 */
export function emitRequestCancelled(request, reason = null) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request, { cancellationReason: reason });
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_CANCELLED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestCancelled failed:', error.message);
  }
}

/**
 * Emits generic request updated event (e.g. work notes added)
 * @param {Object} request - Request document/object
 * @param {string} action - Update action
 * @param {string} [notes] - Additional context
 */
export function emitRequestUpdated(request, action, notes = null) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeRequestPayload(request, { action, notes });
    if (!payload) return;

    const targetRooms = getRequestTargetRooms(request);
    io.to(targetRooms).emit(SOCKET_EVENTS.REQUEST_UPDATED, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitRequestUpdated failed:', error.message);
  }
}

/**
 * Emits new notification to the recipient user's personal room
 * @param {Object} notification - Notification document/object
 */
export function emitNotification(notification) {
  try {
    const io = getIO();
    if (!io) return;

    const payload = formatSafeNotificationPayload(notification);
    if (!payload || !payload.notification.recipientId) return;

    const userRoom = SOCKET_ROOMS.getUserRoom(payload.notification.recipientId);
    io.to(userRoom).emit(SOCKET_EVENTS.NOTIFICATION_NEW, payload);
  } catch (error) {
    console.warn('[RealTimeService Warning] emitNotification failed:', error.message);
  }
}

/**
 * Emits notification read event to sync multiple tabs/sessions for a user
 * @param {string} userId - Recipient user ID
 * @param {string|Array<string>} notificationIds - Notification ID(s) marked read
 */
export function emitNotificationRead(userId, notificationIds) {
  try {
    const io = getIO();
    if (!io || !userId) return;

    const userRoom = SOCKET_ROOMS.getUserRoom(userId.toString());
    const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];

    io.to(userRoom).emit(SOCKET_EVENTS.NOTIFICATION_READ, {
      userId: userId.toString(),
      notificationIds: ids,
      isRead: true,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('[RealTimeService Warning] emitNotificationRead failed:', error.message);
  }
}

export default {
  emitRequestCreated,
  emitRequestAssigned,
  emitRequestAccepted,
  emitRequestStarted,
  emitRequestCompleted,
  emitRequestConfirmed,
  emitRequestCancelled,
  emitRequestUpdated,
  emitNotification,
  emitNotificationRead,
};
