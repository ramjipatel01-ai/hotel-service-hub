/**
 * Socket.IO Constants, Event Names & Room Identifiers
 * Single Source of Truth for Real-Time Communication
 */

export const SOCKET_EVENTS = {
  // Request lifecycle events
  REQUEST_CREATED: 'request:created',
  REQUEST_ASSIGNED: 'request:assigned',
  REQUEST_ACCEPTED: 'request:accepted',
  REQUEST_STARTED: 'request:started',
  REQUEST_COMPLETED: 'request:completed',
  REQUEST_CONFIRMED: 'request:confirmed',
  REQUEST_CANCELLED: 'request:cancelled',
  REQUEST_UPDATED: 'request:updated',

  // Notification events
  NOTIFICATION_NEW: 'notification:new',
  NOTIFICATION_READ: 'notification:read',

  // System & Connection events
  SYSTEM_ERROR: 'system:error',
  CONNECTION_AUTHENTICATED: 'connection:authenticated',
};

export const SOCKET_ROOMS = {
  /**
   * Generates personal room identifier for a user
   * @param {string} userId
   * @returns {string} Room name 'user:<userId>'
   */
  getUserRoom: (userId) => `user:${userId}`,

  /**
   * Generates department room identifier
   * @param {string} departmentId
   * @returns {string} Room name 'dept:<departmentId>'
   */
  getDepartmentRoom: (departmentId) => `dept:${departmentId}`,

  /**
   * Privileged administrative room
   */
  ADMIN_ROOM: 'role:admin',

  /**
   * Operational management room
   */
  MANAGER_ROOM: 'role:manager',
};
