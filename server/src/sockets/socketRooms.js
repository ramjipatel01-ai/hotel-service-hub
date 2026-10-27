import { USER_ROLES } from '../config/constants.js';
import { SOCKET_ROOMS } from './socketConstants.js';

/**
 * Assigns an authenticated socket to its authorized rooms strictly server-side
 * based on verified socket.data.user.
 *
 * Privileged room membership is NEVER client-controlled.
 *
 * @param {import('socket.io').Socket} socket
 * @returns {Array<string>} List of rooms joined
 */
export function joinAuthorizedRooms(socket) {
  const user = socket.data?.user;
  if (!user || !user.id) {
    return [];
  }

  const joinedRooms = [];

  // 1. Personal room for every authenticated identity
  const userRoom = SOCKET_ROOMS.getUserRoom(user.id);
  socket.join(userRoom);
  joinedRooms.push(userRoom);

  // 2. Role-specific partitioned rooms
  switch (user.role) {
    case USER_ROLES.STAFF:
      if (user.department) {
        const deptRoom = SOCKET_ROOMS.getDepartmentRoom(user.department);
        socket.join(deptRoom);
        joinedRooms.push(deptRoom);
      }
      break;

    case USER_ROLES.ADMIN:
      socket.join(SOCKET_ROOMS.ADMIN_ROOM);
      joinedRooms.push(SOCKET_ROOMS.ADMIN_ROOM);
      break;

    case USER_ROLES.MANAGER:
      socket.join(SOCKET_ROOMS.MANAGER_ROOM);
      joinedRooms.push(SOCKET_ROOMS.MANAGER_ROOM);
      break;

    case USER_ROLES.GUEST:
      // Guests only occupy their private user room
      break;

    default:
      break;
  }

  return joinedRooms;
}

/**
 * Calculates authorized target rooms for a request event based on request stakeholders
 *
 * @param {Object} request - Request object or document
 * @returns {Array<string>} Unique list of target rooms
 */
export function getRequestTargetRooms(request) {
  if (!request) return [];

  const rooms = new Set();

  // 1. Admin and Manager rooms receive operational oversight
  rooms.add(SOCKET_ROOMS.ADMIN_ROOM);
  rooms.add(SOCKET_ROOMS.MANAGER_ROOM);

  // 2. Guest personal room
  const guestId = request.guest?._id || request.guest || request.guestId;
  if (guestId) {
    rooms.add(SOCKET_ROOMS.getUserRoom(guestId.toString()));
  }

  // 3. Department room
  const deptId = request.department?._id || request.department || request.departmentId;
  if (deptId) {
    rooms.add(SOCKET_ROOMS.getDepartmentRoom(deptId.toString()));
  }

  // 4. Assigned staff personal room
  const staffId = request.assignedStaff?._id || request.assignedStaff || request.assignedStaffId;
  if (staffId) {
    rooms.add(SOCKET_ROOMS.getUserRoom(staffId.toString()));
  }

  return Array.from(rooms);
}
