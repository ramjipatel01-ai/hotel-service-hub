/**
 * Client-Side Constants & Enums for Hotel Service Hub
 * Matches specifications in rules.md and architecture.md
 */

export const USER_ROLES = {
  GUEST: 'GUEST',
  STAFF: 'STAFF',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
};

export const REQUEST_STATUS = {
  PENDING: 'PENDING',
  ASSIGNED: 'ASSIGNED',
  ACCEPTED: 'ACCEPTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
};

export const REQUEST_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const SERVICE_CATEGORIES = {
  HOUSEKEEPING: 'HOUSEKEEPING',
  MAINTENANCE: 'MAINTENANCE',
  ROOM_SERVICE: 'ROOM_SERVICE',
  TRANSPORTATION: 'TRANSPORTATION',
  FRONT_DESK: 'FRONT_DESK',
};

export const ROOM_STATUS = {
  AVAILABLE: 'AVAILABLE',
  OCCUPIED: 'OCCUPIED',
  MAINTENANCE: 'MAINTENANCE',
  OUT_OF_SERVICE: 'OUT_OF_SERVICE',
};

export const ROOM_TYPE = {
  STANDARD: 'STANDARD',
  DELUXE: 'DELUXE',
  SUITE: 'SUITE',
  EXECUTIVE_SUITE: 'EXECUTIVE_SUITE',
  PRESIDENTIAL_SUITE: 'PRESIDENTIAL_SUITE',
};

export const NOTIFICATION_TYPE = {
  REQUEST_CREATED: 'REQUEST_CREATED',
  REQUEST_ASSIGNED: 'REQUEST_ASSIGNED',
  REQUEST_ACCEPTED: 'REQUEST_ACCEPTED',
  REQUEST_STARTED: 'REQUEST_STARTED',
  REQUEST_COMPLETED: 'REQUEST_COMPLETED',
  REQUEST_CONFIRMED: 'REQUEST_CONFIRMED',
  REQUEST_CANCELLED: 'REQUEST_CANCELLED',
  URGENT_REQUEST: 'URGENT_REQUEST',
  SYSTEM: 'SYSTEM',
};

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
  getUserRoom: (userId) => `user:${userId}`,
  getDepartmentRoom: (departmentId) => `dept:${departmentId}`,
  ADMIN_ROOM: 'role:admin',
  MANAGER_ROOM: 'role:manager',
};
