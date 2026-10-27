/**
 * Payload Sanitization & Formatting Helpers
 * Ensures no sensitive credentials, password hashes, or private tokens leak through WebSockets.
 */

/**
 * Formats a Request document or object into a sanitized, safe real-time payload
 *
 * @param {Object} request
 * @param {Object} [extra]
 * @returns {Object}
 */
export function formatSafeRequestPayload(request, extra = {}) {
  if (!request) return null;
  const raw = typeof request.toObject === 'function' ? request.toObject() : request;

  const guestId = raw.guest?._id || raw.guest || raw.guestId;
  const guestName = raw.guest?.name || raw.guestName || 'Guest';

  const staffId = raw.assignedStaff?._id || raw.assignedStaff || raw.assignedStaffId || null;
  const staffName = raw.assignedStaff?.name || raw.assignedStaffName || null;

  const deptId = raw.department?._id || raw.department || raw.departmentId || null;
  const deptName = raw.department?.name || raw.departmentName || null;

  const roomId = raw.room?._id || raw.room || raw.roomId || null;
  const roomNumber = raw.room?.roomNumber || raw.roomNumber || null;

  return {
    requestId: (raw._id || raw.id || raw.requestId).toString(),
    requestNumber: raw.requestNumber,
    status: raw.status,
    priority: raw.priority,
    category: raw.category,
    serviceTitle: raw.serviceTitle || raw.service?.name,
    serviceId: (raw.service?._id || raw.service)?.toString(),
    quantity: raw.quantity || 1,
    description: raw.description || '',
    specialInstructions: raw.specialInstructions || '',
    imageUrl: raw.imageUrl || null,
    guestId: guestId ? guestId.toString() : null,
    guestName,
    assignedStaffId: staffId ? staffId.toString() : null,
    assignedStaffName: staffName,
    departmentId: deptId ? deptId.toString() : null,
    departmentName: deptName,
    roomId: roomId ? roomId.toString() : null,
    roomNumber,
    createdAt: raw.createdAt,
    assignedAt: raw.assignedAt || null,
    acceptedAt: raw.acceptedAt || null,
    startedAt: raw.startedAt || null,
    completedAt: raw.completedAt || null,
    confirmedAt: raw.confirmedAt || null,
    cancelledAt: raw.cancelledAt || null,
    cancellationReason: raw.cancellationReason || null,
    updatedAt: raw.updatedAt || raw.createdAt,
    ...extra,
  };
}

/**
 * Formats a Notification document or object into a sanitized, safe real-time payload
 *
 * @param {Object} notification
 * @returns {Object}
 */
export function formatSafeNotificationPayload(notification) {
  if (!notification) return null;
  const raw = typeof notification.toObject === 'function' ? notification.toObject() : notification;

  const recipientId = raw.user?._id || raw.user || raw.recipientId;
  const requestId = raw.request?._id || raw.request || raw.requestId || null;

  return {
    notification: {
      id: (raw._id || raw.id).toString(),
      recipientId: recipientId ? recipientId.toString() : null,
      requestId: requestId ? requestId.toString() : null,
      title: raw.title,
      message: raw.message,
      type: raw.type,
      isRead: Boolean(raw.isRead),
      createdAt: raw.createdAt,
    },
  };
}
