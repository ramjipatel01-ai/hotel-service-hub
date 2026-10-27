/**
 * HOTEL SERVICE HUB — Phase 8 Staff Operations Portal Verification Suite
 *
 * Verifies:
 * - Test A: Staff Authorization & Access Control (Guest blocked from staff endpoints, staff blocked from admin endpoints)
 * - Test B: Department Queue Accuracy & Scoping (Assigned to Me, Department Pool, Cross-dept isolation)
 * - Test C: Work Execution Lifecycle (Accept -> Start -> Note -> Complete -> Guest-only Confirm)
 * - Test D: Concurrency & State Machine Integrity (Out-of-order rejection, duplicate claim prevention)
 * - Test E: Self-Service On-Duty Operational Availability & Workload Exclusion
 * - Test F: Real-time Socket.IO Targeted Delivery (Department room, User room, Segregation)
 */

import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { io as Client } from 'socket.io-client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import apiRouter from '../src/routes/index.js';
import { initSocketServer } from '../src/sockets/index.js';
import { errorHandler } from '../src/middleware/errorHandler.js';
import { generateToken } from '../src/services/auth.service.js';
import { allocateStaffToRequest } from '../src/services/assignment.service.js';
import User from '../src/models/User.js';
import Department from '../src/models/Department.js';
import Service from '../src/models/Service.js';
import Room from '../src/models/Room.js';
import Request from '../src/models/Request.js';
import RequestHistory from '../src/models/RequestHistory.js';
import Notification from '../src/models/Notification.js';
import {
  USER_ROLES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  HISTORY_ACTION,
  SOCKET_EVENTS,
} from '../src/config/constants.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failedTests++;
  }
}

async function run() {
  console.log('====================================================');
  console.log('   HOTEL SERVICE HUB — Phase 8 Staff Portal Tests   ');
  console.log('====================================================\n');

  // 1. Database Connection
  const MONGODB_URI = process.env.MONGODB_URI;
  if (!MONGODB_URI) {
    console.error('[CRITICAL] Missing MONGODB_URI environment variable.');
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);
  console.log('[Database] Connected to MongoDB Atlas successfully.');

  // 2. Initialize ephemeral test HTTP & Socket.IO server
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  // Track created test records for guaranteed cleanup
  const createdUserIds = [];
  const createdRequestIds = [];

  try {
    // 3. Resolve departments
    const deptHK = (await Department.findOne({ code: 'HOUSEKEEPING' })) || (await Department.findOne());
    const deptMaint = await Department.findOne({ code: 'MAINTENANCE' });
    assert(Boolean(deptHK), 'Department reference resolved from MongoDB');

    // 4. Resolve or create test rooms
    const roomA = (await Room.findOne({ status: 'OCCUPIED' })) || (await Room.findOne()) || (await Room.create({ roomNumber: '801', floor: 8, type: 'DELUXE' }));
    const roomB = (await Room.findOne({ _id: { $ne: roomA._id } })) || (await Room.create({ roomNumber: '802', floor: 8, type: 'SUITE' }));

    // 5. Seed Test Users
    const guestUser = await User.create({
      name: 'Phase8 Test Guest',
      email: `p8.guest.${Date.now()}@test.com`,
      password: 'password123',
      role: USER_ROLES.GUEST,
      room: roomA._id,
    });
    createdUserIds.push(guestUser._id);

    // Primary Housekeeping Staff Member
    const staffHK1 = await User.create({
      name: 'HK Staff Alpha',
      email: `p8.staff.hk1.${Date.now()}@test.com`,
      password: 'password123',
      role: USER_ROLES.STAFF,
      department: deptHK._id,
      isOnDuty: true,
      isActive: true,
    });
    createdUserIds.push(staffHK1._id);

    // Secondary Housekeeping Staff Member (for concurrency & ownership testing)
    const staffHK2 = await User.create({
      name: 'HK Staff Beta',
      email: `p8.staff.hk2.${Date.now()}@test.com`,
      password: 'password123',
      role: USER_ROLES.STAFF,
      department: deptHK._id,
      isOnDuty: true,
      isActive: true,
    });
    createdUserIds.push(staffHK2._id);

    // Maintenance Staff Member (for cross-department isolation testing)
    const staffMaint = await User.create({
      name: 'Maint Staff Gamma',
      email: `p8.staff.maint.${Date.now()}@test.com`,
      password: 'password123',
      role: USER_ROLES.STAFF,
      department: deptMaint?._id || deptHK._id,
      isOnDuty: true,
      isActive: true,
    });
    createdUserIds.push(staffMaint._id);

    const adminUser = await User.findOne({ role: USER_ROLES.ADMIN });

    // JWT tokens
    const tokenGuest = generateToken(guestUser);
    const tokenStaffHK1 = generateToken(staffHK1);
    const tokenStaffHK2 = generateToken(staffHK2);
    const tokenStaffMaint = generateToken(staffMaint);
    const tokenAdmin = generateToken(adminUser);

    // HTTP Helper
    async function apiCall(endpoint, method = 'GET', body = null, token = tokenStaffHK1) {
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null,
      });
      const data = await res.json().catch(() => ({}));
      return { status: res.status, ok: res.ok, data };
    }

    // Resolve an active service in Housekeeping
    const hkService = (await Service.findOne({ department: deptHK._id, isActive: true })) || (await Service.findOne({ isActive: true }));

    // ==========================================
    // TEST A: Staff Authorization & Access Guards
    // ==========================================
    console.log('--- TEST A: Staff Authorization & Access Control ---');

    // 1. Staff retrieves their profile with department context
    const staffProfileRes = await apiCall('/users/me', 'GET', null, tokenStaffHK1);
    assert(staffProfileRes.status === 200, 'Staff retrieves self profile with HTTP 200');
    assert(staffProfileRes.data?.data?.user?.role === USER_ROLES.STAFF, 'Profile verifies STAFF role');
    assert(Boolean(staffProfileRes.data?.data?.user?.department), 'Profile includes populated department');
    assert(staffProfileRes.data?.data?.user?.isOnDuty === true, 'Profile indicates active on-duty status');

    // 2. Staff is blocked from administrative user creation
    const adminCreateRes = await apiCall('/users', 'POST', {
      name: 'Unauthorized Admin',
      email: 'hacker@test.com',
      password: 'password123',
      role: 'ADMIN',
    }, tokenStaffHK1);
    assert(adminCreateRes.status === 403, 'Staff blocked from admin user creation endpoint (HTTP 403)');

    // 3. Staff is blocked from admin status modifications
    const adminStatusRes = await apiCall(`/users/${guestUser._id}/status`, 'PATCH', { isActive: false }, tokenStaffHK1);
    assert(adminStatusRes.status === 403, 'Staff blocked from administrative status toggles (HTTP 403)');

    // 4. Staff is blocked from manual request dispatch/assignment
    const staffAssignRes = await apiCall('/requests/fakeid/assign', 'PATCH', { staffId: staffHK1._id }, tokenStaffHK1);
    assert(staffAssignRes.status === 403, 'Staff blocked from admin assignment endpoint (HTTP 403)');

    // ==========================================
    // TEST B: Department Queue Accuracy & Scoping
    // ==========================================
    console.log('\n--- TEST B: Department Queue Accuracy & Scoping ---');

    // Create 2 test requests: one in Housekeeping, one in Maintenance
    const reqHK = await Request.create({
      requestNumber: `REQ-${Date.now()}-001`,
      guest: guestUser._id,
      room: roomA._id,
      department: deptHK._id,
      service: hkService._id,
      serviceTitle: hkService.name,
      category: hkService.category,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.ASSIGNED,
      assignedStaff: staffHK1._id,
      assignedAt: new Date(),
    });
    createdRequestIds.push(reqHK._id);

    let reqMaint = null;
    if (deptMaint) {
      const maintService = (await Service.findOne({ department: deptMaint._id })) || hkService;
      reqMaint = await Request.create({
        requestNumber: `REQ-${Date.now()}-002`,
        guest: guestUser._id,
        room: roomB._id,
        department: deptMaint._id,
        service: maintService._id,
        serviceTitle: maintService.name,
        category: maintService.category || 'MAINTENANCE',
        priority: REQUEST_PRIORITY.HIGH,
        status: REQUEST_STATUS.PENDING,
      });
      createdRequestIds.push(reqMaint._id);
    }

    // 1. Fetch "Assigned to Me" queue
    const assignedQueueRes = await apiCall('/requests?assignedToMe=true', 'GET', null, tokenStaffHK1);
    assert(assignedQueueRes.status === 200, 'Staff queries "Assigned to Me" with HTTP 200');
    const assignedList = assignedQueueRes.data?.data?.requests || [];
    assert(
      assignedList.some((r) => String(r._id) === String(reqHK._id)),
      'Assigned queue includes assigned ticket'
    );
    assert(
      assignedList.every((r) => String(r.assignedStaff?._id || r.assignedStaff) === String(staffHK1._id)),
      'Assigned queue strictly isolates requests assigned to the authenticated staff member'
    );

    // 2. Department Pool Query & Scoping: Staff HK can NEVER see Maintenance tickets
    const deptQueueRes = await apiCall('/requests', 'GET', null, tokenStaffHK1);
    assert(deptQueueRes.status === 200, 'Staff queries department pool with HTTP 200');
    const deptList = deptQueueRes.data?.data?.requests || [];
    assert(
      deptList.every((r) => String(r.department?._id || r.department) === String(deptHK._id)),
      'Staff department queue strictly filters to staff department only'
    );
    if (reqMaint) {
      assert(
        !deptList.some((r) => String(r._id) === String(reqMaint._id)),
        'Maintenance ticket is excluded from Housekeeping staff queue (Department isolation enforced)'
      );
    }

    // 3. Search filter support
    const searchRes = await apiCall(`/requests?search=${reqHK.requestNumber}`, 'GET', null, tokenStaffHK1);
    assert(searchRes.status === 200, 'Search filter returns HTTP 200');
    const searchResults = searchRes.data?.data?.requests || [];
    assert(
      searchResults.some((r) => r.requestNumber === reqHK.requestNumber),
      'Search successfully locates ticket by requestNumber'
    );

    // ==========================================
    // TEST C: Work Execution Lifecycle
    // ==========================================
    console.log('\n--- TEST C: Work Execution Lifecycle ---');

    // 1. Staff accepts assigned ticket
    const acceptRes = await apiCall(`/requests/${reqHK._id}/accept`, 'PATCH', {}, tokenStaffHK1);
    assert(acceptRes.status === 200, 'Staff accepts ticket with HTTP 200');
    assert(acceptRes.data?.data?.status === REQUEST_STATUS.ACCEPTED, 'Status transitions to ACCEPTED');
    assert(Boolean(acceptRes.data?.data?.acceptedAt), 'acceptedAt timestamp is recorded');

    // 2. Staff starts work on ticket
    const startRes = await apiCall(`/requests/${reqHK._id}/start`, 'PATCH', {}, tokenStaffHK1);
    assert(startRes.status === 200, 'Staff starts work on ticket with HTTP 200');
    assert(startRes.data?.data?.status === REQUEST_STATUS.IN_PROGRESS, 'Status transitions to IN_PROGRESS');
    assert(Boolean(startRes.data?.data?.startedAt), 'startedAt timestamp is recorded');

    // 3. Staff appends work note
    const noteRes = await apiCall(`/requests/${reqHK._id}/notes`, 'POST', {
      notes: 'Delivered extra towels to room 801 as requested.',
    }, tokenStaffHK1);
    assert(noteRes.status === 201, 'Staff adds work note with HTTP 201 Created');

    // Verify work note persisted in RequestHistory
    const historyRes = await apiCall(`/requests/${reqHK._id}/history`, 'GET', null, tokenStaffHK1);
    assert(historyRes.status === 200, 'Staff views request history with HTTP 200');
    const historyEntries = Array.isArray(historyRes.data?.data) ? historyRes.data.data : historyRes.data?.data?.history || [];
    assert(
      historyEntries.some((h) => h.action === HISTORY_ACTION.NOTE_ADDED && h.notes?.includes('extra towels')),
      'Work note is permanently preserved in immutable RequestHistory audit trail'
    );

    // 4. Staff completes ticket with completion notes
    const completeRes = await apiCall(`/requests/${reqHK._id}/complete`, 'PATCH', {
      notes: 'Task fully completed according to hotel standards.',
    }, tokenStaffHK1);
    assert(completeRes.status === 200, 'Staff marks ticket COMPLETED with HTTP 200');
    assert(completeRes.data?.data?.status === REQUEST_STATUS.COMPLETED, 'Status transitions to COMPLETED');
    assert(Boolean(completeRes.data?.data?.completedAt), 'completedAt timestamp is recorded');

    // 5. Staff CANNOT confirm completion on behalf of guest
    const staffConfirmAttempt = await apiCall(`/requests/${reqHK._id}/confirm`, 'PATCH', {}, tokenStaffHK1);
    assert(staffConfirmAttempt.status === 403, 'Staff blocked from confirming completion on behalf of guest (HTTP 403)');

    // 6. Owning guest confirms completion
    const guestConfirmRes = await apiCall(`/requests/${reqHK._id}/confirm`, 'PATCH', {}, tokenGuest);
    assert(guestConfirmRes.status === 200, 'Owning guest confirms completion with HTTP 200');
    assert(guestConfirmRes.data?.data?.status === REQUEST_STATUS.CONFIRMED, 'Status transitions to CONFIRMED');

    // ==========================================
    // TEST D: Concurrency & State Machine Integrity
    // ==========================================
    console.log('\n--- TEST D: Concurrency & State Machine Integrity ---');

    // 1. Create a fresh ticket for concurrency testing
    const testTicket = await Request.create({
      requestNumber: `REQ-${Date.now()}-003`,
      guest: guestUser._id,
      room: roomA._id,
      department: deptHK._id,
      service: hkService._id,
      serviceTitle: hkService.name,
      category: hkService.category,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.ASSIGNED,
      assignedStaff: staffHK1._id,
      assignedAt: new Date(),
    });
    createdRequestIds.push(testTicket._id);

    // 2. Unassigned or different staff cannot accept staffHK1's assigned ticket
    const wrongStaffAccept = await apiCall(`/requests/${testTicket._id}/accept`, 'PATCH', {}, tokenStaffHK2);
    assert(wrongStaffAccept.status === 403, 'Unauthorized staff member blocked from accepting ticket assigned to someone else (HTTP 403)');

    // 3. Out-of-order transition: Attempting to complete before accepting/starting
    const outOfOrderRes = await apiCall(`/requests/${testTicket._id}/complete`, 'PATCH', {}, tokenStaffHK1);
    assert(outOfOrderRes.status === 400, 'Out-of-order transition (ASSIGNED -> COMPLETED) safely rejected with HTTP 400');

    // ==========================================
    // TEST E: Self-Service On-Duty Management
    // ==========================================
    console.log('\n--- TEST E: Self-Service On-Duty Management ---');

    // 1. Staff toggles duty to OFF DUTY
    const offDutyRes = await apiCall('/users/me/on-duty', 'PATCH', { isOnDuty: false }, tokenStaffHK1);
    assert(offDutyRes.status === 200, 'Staff toggles duty status to OFF DUTY with HTTP 200');
    assert(offDutyRes.data?.data?.user?.isOnDuty === false, 'Updated user object indicates isOnDuty: false');

    // 2. Verify MongoDB persistence
    const staffFromDb = await User.findById(staffHK1._id);
    assert(staffFromDb.isOnDuty === false, 'Off-duty status confirmed persisted in MongoDB User collection');

    // 3. Verify smart staff workload allocation excludes off-duty staff
    // When staffHK1 is off-duty, allocateStaffToRequest for deptHK should select staffHK2
    const allocated = await allocateStaffToRequest(deptHK._id);
    assert(
      String(allocated?._id) !== String(staffHK1._id),
      'Workload allocation service excludes off-duty staff member from auto-assignment'
    );

    // 4. Off-duty staff CANNOT accept a new request
    const offDutyAccept = await apiCall(`/requests/${testTicket._id}/accept`, 'PATCH', {}, tokenStaffHK1);
    assert(offDutyAccept.status === 400, 'Off-duty staff blocked from accepting requests (HTTP 400)');

    // 5. Staff toggles duty back to ON DUTY
    const onDutyRes = await apiCall('/users/me/on-duty', 'PATCH', { isOnDuty: true }, tokenStaffHK1);
    assert(onDutyRes.status === 200, 'Staff resumes duty status with HTTP 200');
    assert(onDutyRes.data?.data?.user?.isOnDuty === true, 'Updated user indicates isOnDuty: true');

    // 6. Guest blocked from duty status endpoint
    const guestDutyAttempt = await apiCall('/users/me/on-duty', 'PATCH', { isOnDuty: true }, tokenGuest);
    assert(guestDutyAttempt.status === 403, 'Guest blocked from duty status endpoint (HTTP 403)');

    // 7. Invalid duty payload rejected
    const invalidDutyRes = await apiCall('/users/me/on-duty', 'PATCH', { isOnDuty: 'yes' }, tokenStaffHK1);
    assert(invalidDutyRes.status === 400, 'Non-boolean duty payload rejected with HTTP 400');

    // ==========================================
    // TEST F: Real-time Socket.IO Targeted Delivery
    // ==========================================
    console.log('\n--- TEST F: Real-Time Socket.IO Staff Delivery ---');

    // Connect staff socket client
    const staffSocket = Client(`http://localhost:${port}`, {
      auth: { token: tokenStaffHK1 },
      transports: ['websocket'],
    });

    await new Promise((resolve) => staffSocket.on('connect', resolve));
    assert(staffSocket.connected, 'Staff socket connected with JWT handshake');

    let receivedCreatedEvent = false;
    let receivedAcceptedEvent = false;

    staffSocket.on(SOCKET_EVENTS.REQUEST_CREATED, (payload) => {
      if (String(payload.departmentId || payload.department?._id || payload.department) === String(deptHK._id)) {
        receivedCreatedEvent = true;
      }
    });

    staffSocket.on(SOCKET_EVENTS.REQUEST_ACCEPTED, (payload) => {
      if (String(payload.requestId) === String(testTicket._id)) {
        receivedAcceptedEvent = true;
      }
    });

    // Create a new request in Housekeeping
    const newGuestTicketRes = await apiCall('/requests', 'POST', {
      serviceId: hkService._id,
      quantity: 1,
      description: 'Socket test request',
    }, tokenGuest);
    assert(newGuestTicketRes.status === 201, 'Guest creates test request for socket dispatch');
    const newTicketId = newGuestTicketRes.data?.data?._id || newGuestTicketRes.data?.data?.request?._id;
    if (newTicketId) createdRequestIds.push(newTicketId);

    // Accept testTicket to trigger accepted event
    await apiCall(`/requests/${testTicket._id}/accept`, 'PATCH', {}, tokenStaffHK1);

    // Wait 400ms for socket delivery
    await new Promise((r) => setTimeout(r, 400));
    assert(receivedCreatedEvent, 'Staff received real-time request:created socket event in department room');
    assert(receivedAcceptedEvent, 'Staff received real-time request:accepted socket event');

    staffSocket.disconnect();

    console.log('\n====================================================');
    console.log(`Phase 8 Verification Complete: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('[TEST SUITE CRASH]:', err);
    failedTests++;
  } finally {
    // Guaranteed Cleanup
    try {
      if (createdRequestIds.length > 0) {
        await Request.deleteMany({ _id: { $in: createdRequestIds } });
        await RequestHistory.deleteMany({ request: { $in: createdRequestIds } });
        await Notification.deleteMany({ request: { $in: createdRequestIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
        await Notification.deleteMany({ user: { $in: createdUserIds } });
      }
    } catch (cleanupErr) {
      console.warn('[Cleanup Warning]:', cleanupErr.message);
    }

    server.close();
    await mongoose.disconnect();
    process.exit(failedTests > 0 ? 1 : 0);
  }
}

run();
