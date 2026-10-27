import dotenv from 'dotenv';
import http from 'http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { io as ClientIO } from 'socket.io-client';
import { connectDatabase } from '../src/config/database.js';
import { generateToken } from '../src/services/auth.service.js';
import { USER_ROLES, REQUEST_STATUS, NOTIFICATION_TYPE, HISTORY_ACTION } from '../src/config/constants.js';
import { SOCKET_EVENTS, SOCKET_ROOMS } from '../src/sockets/socketConstants.js';
import { joinAuthorizedRooms, getRequestTargetRooms } from '../src/sockets/socketRooms.js';
import { formatSafeRequestPayload, formatSafeNotificationPayload } from '../src/sockets/socketPayloads.js';
import { initSocketServer, getIO, closeSocketServer } from '../src/sockets/index.js';
import {
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
} from '../src/services/realtime.service.js';
import User from '../src/models/User.js';
import Notification from '../src/models/Notification.js';
import { markNotificationAsRead } from '../src/controllers/notification.controller.js';

dotenv.config();

console.log('====================================================');
console.log('   HOTEL SERVICE HUB — Phase 5 Socket Verification  ');
console.log('====================================================\n');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
  if (condition) {
    console.log(`\x1b[32m[PASS]\x1b[0m ${testName}`);
    passCount++;
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m ${testName}${details ? ` -> ${details}` : ''}`);
    failCount++;
  }
}

async function runSocketVerification() {
  const TEST_PORT = 5099;
  const TEST_SERVER_URL = `http://localhost:${TEST_PORT}`;

  // Synthetic Test Identifiers
  const guestId = new mongoose.Types.ObjectId().toString();
  const staffId = new mongoose.Types.ObjectId().toString();
  const otherStaffId = new mongoose.Types.ObjectId().toString();
  const adminId = new mongoose.Types.ObjectId().toString();
  const managerId = new mongoose.Types.ObjectId().toString();
  const inactiveUserId = new mongoose.Types.ObjectId().toString();
  const deptId = new mongoose.Types.ObjectId().toString();
  const otherDeptId = new mongoose.Types.ObjectId().toString();

  // Test identities map for mock User.findById resolution during handshake
  const testUsersMap = {
    [guestId]: {
      _id: guestId,
      name: 'Alice Guest',
      email: 'alice@guest.com',
      role: USER_ROLES.GUEST,
      department: null,
      room: '101',
      isOnDuty: true,
      isActive: true,
    },
    [staffId]: {
      _id: staffId,
      name: 'Bob Staff',
      email: 'bob@hotel.com',
      role: USER_ROLES.STAFF,
      department: deptId,
      room: null,
      isOnDuty: true,
      isActive: true,
    },
    [otherStaffId]: {
      _id: otherStaffId,
      name: 'Charlie Staff',
      email: 'charlie@hotel.com',
      role: USER_ROLES.STAFF,
      department: otherDeptId,
      room: null,
      isOnDuty: true,
      isActive: true,
    },
    [adminId]: {
      _id: adminId,
      name: 'Diana Admin',
      email: 'diana@hotel.com',
      role: USER_ROLES.ADMIN,
      department: null,
      room: null,
      isOnDuty: true,
      isActive: true,
    },
    [managerId]: {
      _id: managerId,
      name: 'Evan Manager',
      email: 'evan@hotel.com',
      role: USER_ROLES.MANAGER,
      department: null,
      room: null,
      isOnDuty: true,
      isActive: true,
    },
    [inactiveUserId]: {
      _id: inactiveUserId,
      name: 'Frank Inactive',
      email: 'frank@hotel.com',
      role: USER_ROLES.STAFF,
      department: deptId,
      room: null,
      isOnDuty: false,
      isActive: false, // Inactive account
    },
  };

  // Mock User.findById so socket handshake tests can run deterministically even without live MongoDB
  const originalFindById = User.findById;
  User.findById = function (id) {
    const userDoc = testUsersMap[id?.toString()];
    return {
      select: () => Promise.resolve(userDoc || null),
    };
  };

  // ============================================================================
  // SECTION 1: STATIC & CONTRACT VERIFICATION
  // ============================================================================
  console.log('\n--- Section 1: Event Names & Room Contract Verification ---');

  assert(SOCKET_EVENTS.REQUEST_CREATED === 'request:created', 'Event Name: request:created is standardized');
  assert(SOCKET_EVENTS.REQUEST_ASSIGNED === 'request:assigned', 'Event Name: request:assigned is standardized');
  assert(SOCKET_EVENTS.REQUEST_ACCEPTED === 'request:accepted', 'Event Name: request:accepted is standardized');
  assert(SOCKET_EVENTS.REQUEST_STARTED === 'request:started', 'Event Name: request:started is standardized');
  assert(SOCKET_EVENTS.REQUEST_COMPLETED === 'request:completed', 'Event Name: request:completed is standardized');
  assert(SOCKET_EVENTS.REQUEST_CONFIRMED === 'request:confirmed', 'Event Name: request:confirmed is standardized');
  assert(SOCKET_EVENTS.REQUEST_CANCELLED === 'request:cancelled', 'Event Name: request:cancelled is standardized');
  assert(SOCKET_EVENTS.REQUEST_UPDATED === 'request:updated', 'Event Name: request:updated is standardized');
  assert(SOCKET_EVENTS.NOTIFICATION_NEW === 'notification:new', 'Event Name: notification:new is standardized');
  assert(SOCKET_EVENTS.NOTIFICATION_READ === 'notification:read', 'Event Name: notification:read is standardized');

  assert(SOCKET_ROOMS.getUserRoom(guestId) === `user:${guestId}`, 'Room Name: user room formatted correctly');
  assert(SOCKET_ROOMS.getDepartmentRoom(deptId) === `dept:${deptId}`, 'Room Name: department room formatted correctly');
  assert(SOCKET_ROOMS.ADMIN_ROOM === 'role:admin', 'Room Name: admin room formatted correctly');
  assert(SOCKET_ROOMS.MANAGER_ROOM === 'role:manager', 'Room Name: manager room formatted correctly');

  // ============================================================================
  // SECTION 2: PAYLOAD SANITIZATION & SECURITY
  // ============================================================================
  console.log('\n--- Section 2: Payload Sanitization & Security ---');

  const rawRequestObj = {
    _id: new mongoose.Types.ObjectId(),
    requestNumber: 'REQ-20261019-0001',
    status: REQUEST_STATUS.ASSIGNED,
    priority: 'HIGH',
    category: 'HOUSEKEEPING',
    serviceTitle: 'Extra Towels',
    guest: { _id: guestId, name: 'Alice Guest', password: 'secret_hash_password' },
    assignedStaff: { _id: staffId, name: 'Bob Staff', password: 'secret_staff_password' },
    department: { _id: deptId, name: 'Housekeeping' },
    room: { _id: new mongoose.Types.ObjectId(), roomNumber: '201' },
    createdAt: new Date(),
  };

  const safePayload = formatSafeRequestPayload(rawRequestObj);
  assert(safePayload.requestId === rawRequestObj._id.toString(), 'Payload Sanitizer: requestId serialized safely');
  assert(safePayload.requestNumber === 'REQ-20261019-0001', 'Payload Sanitizer: requestNumber matches');
  assert(safePayload.roomNumber === '201', 'Payload Sanitizer: roomNumber matches');
  assert(safePayload.guestName === 'Alice Guest', 'Payload Sanitizer: guestName included');
  assert(safePayload.assignedStaffName === 'Bob Staff', 'Payload Sanitizer: assignedStaffName included');
  assert(safePayload.password === undefined, 'Security Guard: No password in request payload');
  assert(safePayload.guest?.password === undefined, 'Security Guard: No nested guest password in payload');

  const rawNotificationObj = {
    _id: new mongoose.Types.ObjectId(),
    user: guestId,
    request: rawRequestObj._id,
    title: 'Staff Assigned',
    message: 'Staff Bob has been assigned.',
    type: NOTIFICATION_TYPE.REQUEST_ASSIGNED,
    isRead: false,
    createdAt: new Date(),
  };

  const safeNotification = formatSafeNotificationPayload(rawNotificationObj);
  assert(safeNotification.notification.id === rawNotificationObj._id.toString(), 'Notification Payload: id serialized');
  assert(safeNotification.notification.recipientId === guestId, 'Notification Payload: recipientId matches');
  assert(safeNotification.notification.title === 'Staff Assigned', 'Notification Payload: title matches');
  assert(safeNotification.notification.isRead === false, 'Notification Payload: isRead matches');

  // ============================================================================
  // SECTION 3: RECIPIENT ROOM RESOLUTION
  // ============================================================================
  console.log('\n--- Section 3: Target Room Resolution Matrix ---');

  const targetRooms = getRequestTargetRooms(rawRequestObj);
  assert(targetRooms.includes(`user:${guestId}`), 'Target Rooms: Guest personal room included');
  assert(targetRooms.includes(`user:${staffId}`), 'Target Rooms: Assigned staff room included');
  assert(targetRooms.includes(`dept:${deptId}`), 'Target Rooms: Department room included');
  assert(targetRooms.includes('role:admin'), 'Target Rooms: Admin operational room included');
  assert(targetRooms.includes('role:manager'), 'Target Rooms: Manager operational room included');
  assert(!targetRooms.includes(`user:${otherStaffId}`), 'Target Rooms: Unrelated staff excluded from direct rooms');

  // ============================================================================
  // SECTION 4: LIVE SOCKET.IO SERVER & HANDSHAKE AUTHENTICATION
  // ============================================================================
  console.log('\n--- Section 4: Live Socket.IO Server & Handshake Tests ---');

  // Spin up real HTTP server and initialize Socket.IO
  const testHttpServer = http.createServer();
  const ioServer = initSocketServer(testHttpServer);

  await new Promise((resolve) => {
    testHttpServer.listen(TEST_PORT, () => resolve());
  });

  const guestToken = generateToken(testUsersMap[guestId]);
  const staffToken = generateToken(testUsersMap[staffId]);
  const otherStaffToken = generateToken(testUsersMap[otherStaffId]);
  const adminToken = generateToken(testUsersMap[adminId]);
  const managerToken = generateToken(testUsersMap[managerId]);
  const inactiveToken = generateToken(testUsersMap[inactiveUserId]);

  // Create an expired token for testing
  const expiredToken = jwt.sign(
    { userId: guestId, role: USER_ROLES.GUEST },
    process.env.JWT_SECRET,
    { expiresIn: '0s' }
  );

  // Test 1: Missing Token Rejected
  await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: {},
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on('connect_error', (err) => {
      assert(err.message.includes('Token is required'), 'Handshake Auth: Missing token rejected');
      client.disconnect();
      resolve();
    });
  });

  // Test 2: Invalid Token Rejected
  await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: 'invalid.bogus.jwt' },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on('connect_error', (err) => {
      assert(err.message.includes('Invalid token'), 'Handshake Auth: Invalid token signature rejected');
      client.disconnect();
      resolve();
    });
  });

  // Test 3: Expired Token Rejected
  await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: expiredToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on('connect_error', (err) => {
      assert(err.message.includes('Token expired'), 'Handshake Auth: Expired token rejected');
      client.disconnect();
      resolve();
    });
  });

  // Test 4: Inactive User Rejected
  await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: inactiveToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on('connect_error', (err) => {
      assert(err.message.includes('Account deactivated'), 'Handshake Auth: Deactivated user rejected');
      client.disconnect();
      resolve();
    });
  });

  // Test 5: Valid Guest Authentication & Room Verification
  const guestSocket = await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: guestToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on(SOCKET_EVENTS.CONNECTION_AUTHENTICATED, (payload) => {
      assert(payload.userId === guestId, 'Handshake Auth: Guest authenticated successfully');
      assert(payload.rooms.includes(`user:${guestId}`), 'Room Verification: Guest joined personal room');
      assert(!payload.rooms.includes('role:admin'), 'Room Verification: Guest NOT in admin room');
      assert(!payload.rooms.includes(`dept:${deptId}`), 'Room Verification: Guest NOT in department room');
      resolve(client);
    });
  });

  // Test 6: Valid Staff Authentication & Department Room Verification
  const staffSocket = await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: staffToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on(SOCKET_EVENTS.CONNECTION_AUTHENTICATED, (payload) => {
      assert(payload.userId === staffId, 'Handshake Auth: Staff authenticated successfully');
      assert(payload.rooms.includes(`user:${staffId}`), 'Room Verification: Staff joined personal room');
      assert(payload.rooms.includes(`dept:${deptId}`), 'Room Verification: Staff joined department room');
      assert(!payload.rooms.includes('role:admin'), 'Room Verification: Staff NOT in admin room');
      resolve(client);
    });
  });

  // Test 7: Other Department Staff
  const otherStaffSocket = await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: otherStaffToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on(SOCKET_EVENTS.CONNECTION_AUTHENTICATED, (payload) => {
      assert(payload.rooms.includes(`dept:${otherDeptId}`), 'Room Verification: Other staff in separate dept room');
      assert(!payload.rooms.includes(`dept:${deptId}`), 'Room Verification: Other staff NOT in first dept room');
      resolve(client);
    });
  });

  // Test 8: Admin Authentication & Admin Room Verification
  const adminSocket = await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: adminToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on(SOCKET_EVENTS.CONNECTION_AUTHENTICATED, (payload) => {
      assert(payload.rooms.includes('role:admin'), 'Room Verification: Admin joined role:admin room');
      resolve(client);
    });
  });

  // Test 9: Manager Authentication & Manager Room Verification
  const managerSocket = await new Promise((resolve) => {
    const client = ClientIO(TEST_SERVER_URL, {
      auth: { token: managerToken },
      transports: ['websocket'],
      autoConnect: true,
    });
    client.on(SOCKET_EVENTS.CONNECTION_AUTHENTICATED, (payload) => {
      assert(payload.rooms.includes('role:manager'), 'Room Verification: Manager joined role:manager room');
      resolve(client);
    });
  });

  // Test 10: Client privilege escalation blocked (Guest cannot join role:admin)
  await new Promise((resolve) => {
    guestSocket.emit('joinRoom', 'role:admin');
    guestSocket.on(SOCKET_EVENTS.SYSTEM_ERROR, (err) => {
      assert(err.message.includes('server-enforced only'), 'Security Guard: Client attempt to join privileged room blocked');
      resolve();
    });
  });

  // ============================================================================
  // SECTION 5: REAL-TIME EVENT DISPATCH & TARGETED AUDIENCE
  // ============================================================================
  console.log('\n--- Section 5: Real-Time Event Dispatch & Targeted Delivery ---');

  // Test 11: Request Created Event reaches intended recipients
  await new Promise((resolve) => {
    let guestReceived = false;
    let staffReceived = false;
    let adminReceived = false;
    let otherStaffReceived = false;

    guestSocket.once(SOCKET_EVENTS.REQUEST_CREATED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) guestReceived = true;
      checkCompletion();
    });

    staffSocket.once(SOCKET_EVENTS.REQUEST_CREATED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) staffReceived = true;
      checkCompletion();
    });

    adminSocket.once(SOCKET_EVENTS.REQUEST_CREATED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) adminReceived = true;
      checkCompletion();
    });

    otherStaffSocket.once(SOCKET_EVENTS.REQUEST_CREATED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) otherStaffReceived = true;
    });

    emitRequestCreated(rawRequestObj);

    function checkCompletion() {
      if (guestReceived && staffReceived && adminReceived) {
        assert(guestReceived, 'Event Delivery: Guest received request:created');
        assert(staffReceived, 'Event Delivery: Department staff received request:created');
        assert(adminReceived, 'Event Delivery: Admin received request:created');
        assert(!otherStaffReceived, 'Data Segregation: Staff in other department did NOT receive event');
        resolve();
      }
    }
  });

  // Test 12: Request Assigned Event
  await new Promise((resolve) => {
    let staffReceived = false;
    staffSocket.once(SOCKET_EVENTS.REQUEST_ASSIGNED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) staffReceived = true;
      assert(staffReceived, 'Event Delivery: Assigned staff received request:assigned');
      resolve();
    });
    emitRequestAssigned(rawRequestObj);
  });

  // Test 13: Request Accepted Event
  await new Promise((resolve) => {
    let guestReceived = false;
    guestSocket.once(SOCKET_EVENTS.REQUEST_ACCEPTED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) guestReceived = true;
      assert(guestReceived, 'Event Delivery: Guest received request:accepted');
      resolve();
    });
    emitRequestAccepted(rawRequestObj);
  });

  // Test 14: Request Started Event
  await new Promise((resolve) => {
    let guestReceived = false;
    guestSocket.once(SOCKET_EVENTS.REQUEST_STARTED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) guestReceived = true;
      assert(guestReceived, 'Event Delivery: Guest received request:started');
      resolve();
    });
    emitRequestStarted(rawRequestObj);
  });

  // Test 15: Request Completed Event
  await new Promise((resolve) => {
    let guestReceived = false;
    guestSocket.once(SOCKET_EVENTS.REQUEST_COMPLETED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) guestReceived = true;
      assert(guestReceived, 'Event Delivery: Guest received request:completed');
      resolve();
    });
    emitRequestCompleted(rawRequestObj);
  });

  // Test 16: Request Confirmed Event
  await new Promise((resolve) => {
    let staffReceived = false;
    staffSocket.once(SOCKET_EVENTS.REQUEST_CONFIRMED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) staffReceived = true;
      assert(staffReceived, 'Event Delivery: Staff received request:confirmed');
      resolve();
    });
    emitRequestConfirmed(rawRequestObj);
  });

  // Test 17: Request Cancelled Event
  await new Promise((resolve) => {
    let guestReceived = false;
    guestSocket.once(SOCKET_EVENTS.REQUEST_CANCELLED, (data) => {
      if (data.requestId === rawRequestObj._id.toString()) guestReceived = true;
      assert(guestReceived, 'Event Delivery: Guest received request:cancelled');
      assert(data.cancellationReason === 'Guest cancelled', 'Event Delivery: Cancellation reason preserved');
      resolve();
    });
    emitRequestCancelled(rawRequestObj, 'Guest cancelled');
  });

  // Test 18: Notification New Event reaches only recipient personal room
  await new Promise((resolve) => {
    let guestReceived = false;
    let staffReceived = false;

    guestSocket.once(SOCKET_EVENTS.NOTIFICATION_NEW, (data) => {
      if (data.notification.id === rawNotificationObj._id.toString()) {
        guestReceived = true;
      }
      checkNotif();
    });

    staffSocket.once(SOCKET_EVENTS.NOTIFICATION_NEW, (data) => {
      if (data.notification.id === rawNotificationObj._id.toString()) {
        staffReceived = true;
      }
    });

    emitNotification(rawNotificationObj);

    function checkNotif() {
      assert(guestReceived, 'Notification Delivery: Recipient guest received notification:new');
      assert(!staffReceived, 'Data Segregation: Non-recipient staff did NOT receive guest notification');
      resolve();
    }
  });

  // Test 19: Notification Read Synchronization across tabs
  await new Promise((resolve) => {
    guestSocket.once(SOCKET_EVENTS.NOTIFICATION_READ, (data) => {
      assert(data.userId === guestId, 'Notification Read Sync: Target user matched');
      assert(data.notificationIds.includes(rawNotificationObj._id.toString()), 'Notification Read Sync: Notification ID matches');
      resolve();
    });
    emitNotificationRead(guestId, rawNotificationObj._id.toString());
  });

  // Test 20: Notification REST Authorization Guard (Cannot mark other user's notification read)
  console.log('\n--- Section 6: Notification REST Ownership Authorization ---');
  const mockNotificationInDb = {
    _id: rawNotificationObj._id,
    user: guestId, // Owned by Guest
    isRead: false,
    save: () => Promise.resolve(),
  };

  const originalNotifFindById = Notification.findById;
  Notification.findById = () => Promise.resolve(mockNotificationInDb);

  const mockRes = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      return this;
    },
  };

  // Staff attempts to mark Guest's notification read
  await markNotificationAsRead(
    { params: { id: mockNotificationInDb._id.toString() }, user: { _id: staffId } },
    mockRes,
    () => {}
  );
  assert(mockRes.statusCode === 403, 'REST Ownership Guard: Unauthorized user receives HTTP 403 Forbidden');
  assert(mockRes.body.success === false, 'REST Ownership Guard: Success is false');

  // Guest marks own notification read
  await markNotificationAsRead(
    { params: { id: mockNotificationInDb._id.toString() }, user: { _id: guestId } },
    mockRes,
    () => {}
  );
  assert(mockRes.statusCode === 200, 'REST Ownership Guard: Owner receives HTTP 200 OK');
  assert(mockNotificationInDb.isRead === true, 'REST Ownership Guard: isRead set to true');

  // Restore User and Notification models
  User.findById = originalFindById;
  Notification.findById = originalNotifFindById;

  // Clean up sockets & server
  guestSocket.disconnect();
  staffSocket.disconnect();
  otherStaffSocket.disconnect();
  adminSocket.disconnect();
  managerSocket.disconnect();

  await new Promise((resolve) => {
    closeSocketServer();
    testHttpServer.close(() => resolve());
  });

  // ============================================================================
  // SECTION 7: DATABASE CONNECTIVITY & SUMMARY
  // ============================================================================
  console.log('\n--- Section 7: Database & Overall Status ---');
  await connectDatabase();
  const dbConnected = mongoose.connection.readyState === 1;

  if (dbConnected) {
    console.log('\x1b[32m[DB STATUS]\x1b[0m MongoDB Atlas is connected.');
  } else {
    console.log('\x1b[33m[DB STATUS]\x1b[0m MongoDB Atlas configured with standby placeholder YOUR_DB_PASSWORD.');
  }

  console.log('\n====================================================');
  console.log(`   Phase 5 Verification Complete: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  await mongoose.disconnect();
  process.exit(failCount > 0 ? 1 : 0);
}

runSocketVerification().catch((err) => {
  console.error('[Fatal Test Error]:', err);
  process.exit(1);
});
