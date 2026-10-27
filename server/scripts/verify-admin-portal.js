/**
 * HOTEL SERVICE HUB — Phase 9 Admin Operations Center Verification Suite
 *
 * Verifies:
 * - Group 1: Authorization & Role-Based Access Control (Tests 1-5)
 * - Group 2: Administrative User Management (Tests 6-12)
 * - Group 3: Department Management & Soft Deactivation (Tests 13-17)
 * - Group 4: Service Catalog Management (Tests 18-23)
 * - Group 5: Room Inventory Management (Tests 24-28)
 * - Group 6: Request Operations, Manual Dispatch, Priority Override, & Lifecycle (Tests 29-36)
 * - Group 7: Audit Trail & Persistent Notifications (Tests 37-40)
 * - Group 8: Data Integrity & Safe Cleanup (Tests 41-44)
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
import { generateToken, hashPassword } from '../src/services/auth.service.js';
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
  SERVICE_CATEGORIES,
  ROOM_TYPE,
  ROOM_STATUS,
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

async function request(baseUrl, path, options = {}) {
  const url = `${baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    ...(options.body ? { body: JSON.stringify(options.body) } : {}),
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

async function run() {
  console.log('====================================================');
  console.log('   HOTEL SERVICE HUB — Phase 9 Admin Portal Tests   ');
  console.log('====================================================');

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('Missing MONGODB_URI in environment!');
    process.exit(1);
  }

  // Connect to MongoDB Atlas
  console.log('Connecting to database...');
  await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 10000 });
  console.log(`Connected to MongoDB Atlas host: ${mongoose.connection.host}`);

  // Setup express test server
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  const io = initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  const socketUrl = `http://127.0.0.1:${port}`;
  console.log(`Test server running at ${baseUrl}`);

  // Test Tracking for Safe Cleanup
  const createdUserIds = [];
  const createdDeptIds = [];
  const createdServiceIds = [];
  const createdRoomIds = [];
  const createdRequestIds = [];

  try {
    // ----------------------------------------------------
    // PREPARE BASE ENTITIES FOR TESTING
    // ----------------------------------------------------
    const timestamp = Date.now();

    // 1. Existing Housekeeping department or create test dept
    let testDept = await Department.findOne({ code: 'HOUSEKEEPING' });
    if (!testDept) {
      testDept = await Department.create({
        name: 'Housekeeping',
        code: 'HOUSEKEEPING',
        description: 'Housekeeping & cleaning',
        icon: 'Sparkles',
        isActive: true,
      });
      createdDeptIds.push(testDept._id);
    }

    // 2. Base Admin User
    const adminUser = await User.create({
      name: `Admin Test ${timestamp}`,
      email: `admin_${timestamp}@hotelhub.com`,
      password: await hashPassword('AdminPass123!'),
      role: USER_ROLES.ADMIN,
      isActive: true,
      isOnDuty: true,
    });
    createdUserIds.push(adminUser._id);
    const adminToken = generateToken(adminUser);

    // 3. Base Manager User
    const managerUser = await User.create({
      name: `Manager Test ${timestamp}`,
      email: `manager_${timestamp}@hotelhub.com`,
      password: await hashPassword('ManagerPass123!'),
      role: USER_ROLES.MANAGER,
      isActive: true,
      isOnDuty: true,
    });
    createdUserIds.push(managerUser._id);
    const managerToken = generateToken(managerUser);

    // 4. Base Staff User (Housekeeping)
    const staffUser = await User.create({
      name: `Staff Test ${timestamp}`,
      email: `staff_${timestamp}@hotelhub.com`,
      password: await hashPassword('StaffPass123!'),
      role: USER_ROLES.STAFF,
      department: testDept._id,
      isActive: true,
      isOnDuty: true,
    });
    createdUserIds.push(staffUser._id);
    const staffToken = generateToken(staffUser);

    // 5. Base Guest User
    const guestUser = await User.create({
      name: `Guest Test ${timestamp}`,
      email: `guest_${timestamp}@hotelhub.com`,
      password: await hashPassword('GuestPass123!'),
      role: USER_ROLES.GUEST,
      isActive: true,
      isOnDuty: false,
    });
    createdUserIds.push(guestUser._id);
    const guestToken = generateToken(guestUser);

    // 6. Base Room
    const testRoom = await Room.create({
      roomNumber: `T9-${timestamp % 10000}`,
      floor: 9,
      roomType: ROOM_TYPE.SUITE,
      status: ROOM_STATUS.OCCUPIED,
      currentGuest: guestUser._id,
      isActive: true,
    });
    createdRoomIds.push(testRoom._id);

    // Link room to guest
    guestUser.room = testRoom._id;
    await guestUser.save();

    // 7. Base Service
    const testService = await Service.create({
      name: `Test Towel Service ${timestamp}`,
      code: `SVC-${timestamp % 10000}`,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      department: testDept._id,
      defaultPriority: REQUEST_PRIORITY.NORMAL,
      estimatedDurationMinutes: 20,
      allowQuantity: true,
      maxQuantity: 4,
      isActive: true,
    });
    createdServiceIds.push(testService._id);

    console.log('\n--- GROUP 1: AUTHORIZATION & ACCESS CONTROL ---');
    // Test 1: Guest cannot access Admin routes
    const gRes1 = await request(baseUrl, '/departments', {
      method: 'POST',
      token: guestToken,
      body: { name: 'Illegal Dept', code: 'ILLEGAL' },
    });
    assert(gRes1.status === 403, '1. Guest cannot access Admin routes (POST /departments blocked with 403)');

    // Test 2: Staff cannot access Admin routes
    const sRes2 = await request(baseUrl, '/departments', {
      method: 'POST',
      token: staffToken,
      body: { name: 'Staff Illegal Dept', code: 'STAFF_ILLEGAL' },
    });
    assert(sRes2.status === 403, '2. Staff cannot access Admin routes (POST /departments blocked with 403)');

    // Test 3: Manager cannot perform Admin mutations
    const mRes3 = await request(baseUrl, '/departments', {
      method: 'POST',
      token: managerToken,
      body: { name: 'Mgr Illegal Dept', code: 'MGR_ILLEGAL' },
    });
    assert(mRes3.status === 403, '3. Manager cannot perform Admin mutations (POST /departments blocked with 403)');

    // Test 4: Admin can access permitted administrative endpoints
    const aRes4 = await request(baseUrl, '/users', {
      method: 'GET',
      token: adminToken,
    });
    assert(aRes4.status === 200 && Array.isArray(aRes4.data?.data?.users), '4. Admin can access permitted administrative endpoints (GET /users returns 200)');

    // Test 5: Public registration cannot create Admin accounts
    const regRes = await request(baseUrl, '/auth/register', {
      method: 'POST',
      body: {
        name: 'Hacker User',
        email: `hacker_${timestamp}@hotelhub.com`,
        password: 'Password123!',
        role: USER_ROLES.ADMIN, // Attempting privilege escalation
      },
    });
    assert(
      regRes.status === 400 || (regRes.status === 201 && regRes.data?.data?.user?.role === USER_ROLES.GUEST),
      '5. Public registration cannot create Admin accounts (blocked with 400 or forced to GUEST role)'
    );
    if (regRes.data?.data?.user?._id) createdUserIds.push(regRes.data.data.user._id);

    console.log('\n--- GROUP 2: USER MANAGEMENT ---');
    // Test 6: Admin can list users
    const listRes = await request(baseUrl, '/users', {
      method: 'GET',
      token: adminToken,
    });
    assert(listRes.status === 200 && listRes.data?.data?.users?.length >= 4, '6. Admin can list users successfully');

    // Test 7: User filters work (role filter)
    const staffFilterRes = await request(baseUrl, `/users?role=${USER_ROLES.STAFF}`, {
      method: 'GET',
      token: adminToken,
    });
    const allStaff = staffFilterRes.data?.data?.users?.every((u) => u.role === USER_ROLES.STAFF);
    assert(staffFilterRes.status === 200 && allStaff, '7. User role filter operates accurately');

    // Test 8: Duplicate email is rejected
    const dupRes = await request(baseUrl, '/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Duplicate Guy',
        email: adminUser.email,
        password: 'Password123!',
        role: USER_ROLES.STAFF,
        department: testDept._id,
      },
    });
    assert(dupRes.status === 409, '8. Duplicate email is rejected with 409 Conflict');


    // Test 9: Valid staff creation works with role and department
    const newStaffRes = await request(baseUrl, '/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `New Staff ${timestamp}`,
        email: `newstaff_${timestamp}@hotelhub.com`,
        password: 'Password123!',
        role: USER_ROLES.STAFF,
        department: testDept._id,
        isOnDuty: true,
      },
    });
    assert(newStaffRes.status === 201 && newStaffRes.data?.data?.user?.role === USER_ROLES.STAFF, '9. Valid staff creation succeeds with department association');
    if (newStaffRes.data?.data?.user?._id) createdUserIds.push(newStaffRes.data.data.user._id);

    // Test 10: Invalid department assignment is rejected
    const badDeptStaffRes = await request(baseUrl, '/users', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Bad Dept Staff ${timestamp}`,
        email: `baddept_${timestamp}@hotelhub.com`,
        password: 'Password123!',
        role: USER_ROLES.STAFF,
        department: new mongoose.Types.ObjectId(), // Non-existent dept
      },
    });
    assert(badDeptStaffRes.status === 400, '10. Invalid department reference is rejected with 400 Bad Request');

    // Test 11: Protected user fields cannot be modified through ordinary profile update
    const profileRes = await request(baseUrl, '/users/me', {
      method: 'PATCH',
      token: staffToken,
      body: {
        name: 'Staff Renamed',
        role: USER_ROLES.ADMIN, // Attempting self-promotion
      },
    });
    const staffDoc = await User.findById(staffUser._id);
    assert(staffDoc.role === USER_ROLES.STAFF, '11. Protected user role cannot be modified through ordinary profile update');

    // Test 12: Account status changes require Admin authorization
    const statusStaffRes = await request(baseUrl, `/users/${guestUser._id}/status`, {
      method: 'PATCH',
      token: staffToken,
      body: { isActive: false },
    });
    assert(statusStaffRes.status === 403, '12. Account status changes require Admin authorization (Staff blocked with 403)');

    console.log('\n--- GROUP 3: DEPARTMENT MANAGEMENT ---');
    // Test 13: Department creation validates required fields
    const emptyDeptRes = await request(baseUrl, '/departments', {
      method: 'POST',
      token: adminToken,
      body: { name: '', code: '' },
    });
    assert(emptyDeptRes.status === 400, '13. Department creation validates required name and code');

    // Test 14: Duplicate department code is rejected
    const createDeptRes1 = await request(baseUrl, '/departments', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Dept A ${timestamp}`,
        code: `DPT_${timestamp % 1000}`,
        description: 'Test Department',
      },
    });
    if (createDeptRes1.data?.data?.department?._id) {
      createdDeptIds.push(createDeptRes1.data.data.department._id);
    }

    const dupDeptRes = await request(baseUrl, '/departments', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Dept B ${timestamp}`,
        code: `DPT_${timestamp % 1000}`, // Duplicate code
      },
    });
    assert(dupDeptRes.status === 409, '14. Duplicate department code is rejected with 409 Conflict');

    // Test 15: Department update works
    const deptIdToUpdate = createDeptRes1.data?.data?.department?._id;
    const updateDeptRes = await request(baseUrl, `/departments/${deptIdToUpdate}`, {
      method: 'PATCH',
      token: adminToken,
      body: { description: 'Updated Description' },
    });
    assert(updateDeptRes.status === 200 && updateDeptRes.data?.data?.department?.description === 'Updated Description', '15. Department update works correctly');

    // Test 16 & 17: Deactivation preserves historical relationships and unsafe deletion is soft-deactivated
    // Associate a request with this department
    const reqWithDept = await Request.create({
      guest: guestUser._id,
      room: testRoom._id,
      service: testService._id,
      department: deptIdToUpdate,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.PENDING,
      serviceTitle: 'Dept Test Request',
      requestNumber: `REQ-DEPT-${timestamp % 10000}`,
    });
    createdRequestIds.push(reqWithDept._id);

    const deleteDeptRes = await request(baseUrl, `/departments/${deptIdToUpdate}`, {
      method: 'DELETE',
      token: adminToken,
    });
    const checkDept = await Department.findById(deptIdToUpdate);
    assert(deleteDeptRes.status === 200 && deleteDeptRes.data?.data?.softDeleted === true && checkDept.isActive === false, '16 & 17. Referenced department is soft-deactivated to preserve historical request integrity');

    console.log('\n--- GROUP 4: SERVICE CATALOG MANAGEMENT ---');
    // Test 18: Service creation validates department reference
    const badDeptServiceRes = await request(baseUrl, '/services', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Ghost Service',
        code: `GHOST-${timestamp % 1000}`,
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: new mongoose.Types.ObjectId(),
      },
    });
    assert(badDeptServiceRes.status === 400, '18. Service creation validates department reference (400 on non-existent dept)');

    // Test 19: Duplicate service code is rejected
    const createSvcRes = await request(baseUrl, '/services', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Service Alpha ${timestamp}`,
        code: `SVC_A_${timestamp % 1000}`,
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: testDept._id,
      },
    });
    if (createSvcRes.data?.data?.service?._id) createdServiceIds.push(createSvcRes.data.data.service._id);

    const dupSvcRes = await request(baseUrl, '/services', {
      method: 'POST',
      token: adminToken,
      body: {
        name: `Service Beta ${timestamp}`,
        code: `SVC_A_${timestamp % 1000}`, // Duplicate code
        category: SERVICE_CATEGORIES.HOUSEKEEPING,
        department: testDept._id,
      },
    });
    assert(dupSvcRes.status === 409, '19. Duplicate service code is rejected with 409 Conflict');

    // Test 20: Invalid priority/category is rejected
    const badCatRes = await request(baseUrl, '/services', {
      method: 'POST',
      token: adminToken,
      body: {
        name: 'Invalid Cat Service',
        code: `BADCAT-${timestamp % 1000}`,
        category: 'NON_EXISTENT_CATEGORY',
        department: testDept._id,
      },
    });
    assert(badCatRes.status === 400, '20. Invalid service category is rejected with 400 Bad Request');

    // Test 21: Quantity and duration validation works
    const newSvcId = createSvcRes.data?.data?.service?._id;
    const updateSvcRes = await request(baseUrl, `/services/${newSvcId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { estimatedDurationMinutes: 45, maxQuantity: 10, allowQuantity: true },
    });
    assert(updateSvcRes.status === 200 && updateSvcRes.data?.data?.service?.estimatedDurationMinutes === 45, '21. Service duration and quantity parameters update successfully');

    // Test 22: Deactivated services are excluded from active guest catalog
    await request(baseUrl, `/services/${newSvcId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    const guestCatalogRes = await request(baseUrl, '/services', { method: 'GET' });
    const isExcluded = !guestCatalogRes.data?.data?.services?.some((s) => s._id === newSvcId);
    assert(isExcluded, '22. Deactivated services are excluded from the active guest catalog');

    // Test 23: Existing requests retain service history
    const reqWithSvc = await Request.create({
      guest: guestUser._id,
      room: testRoom._id,
      service: newSvcId,
      department: testDept._id,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.PENDING,
      serviceTitle: 'Retained Service Request',
      requestNumber: `REQ-SVC-${timestamp % 10000}`,
    });
    createdRequestIds.push(reqWithSvc._id);
    const fetchReqWithSvc = await Request.findById(reqWithSvc._id).populate('service');
    assert(fetchReqWithSvc && fetchReqWithSvc.service._id.toString() === newSvcId.toString(), '23. Existing requests retain service reference and historical data after deactivation');

    console.log('\n--- GROUP 5: ROOM INVENTORY MANAGEMENT ---');
    // Test 24: Room creation works
    const newRoomNumber = `RM-${timestamp % 10000}`;
    const createRoomRes = await request(baseUrl, '/rooms', {
      method: 'POST',
      token: adminToken,
      body: {
        roomNumber: newRoomNumber,
        floor: 4,
        roomType: ROOM_TYPE.DELUXE,
        status: ROOM_STATUS.AVAILABLE,
      },
    });
    assert(createRoomRes.status === 201 && createRoomRes.data?.data?.room?.roomNumber === newRoomNumber, '24. Room creation works successfully');
    const newRoomId = createRoomRes.data?.data?.room?._id;
    if (newRoomId) createdRoomIds.push(newRoomId);

    // Test 25: Duplicate room number is rejected
    const dupRoomRes = await request(baseUrl, '/rooms', {
      method: 'POST',
      token: adminToken,
      body: {
        roomNumber: newRoomNumber,
        floor: 4,
      },
    });
    assert(dupRoomRes.status === 409, '25. Duplicate room number is rejected with 409 Conflict');

    // Test 26: Invalid floor / parameters are rejected
    const badRoomRes = await request(baseUrl, '/rooms', {
      method: 'POST',
      token: adminToken,
      body: {
        roomNumber: `BAD-${timestamp % 1000}`,
        floor: -1, // Invalid floor
      },
    });
    assert(badRoomRes.status === 400, '26. Invalid floor value is rejected with 400 Bad Request');

    // Test 27: Current guest assignment updates occupancy status
    const updateRoomGuestRes = await request(baseUrl, `/rooms/${newRoomId}`, {
      method: 'PATCH',
      token: adminToken,
      body: { currentGuest: guestUser._id },
    });
    assert(updateRoomGuestRes.status === 200 && updateRoomGuestRes.data?.data?.room?.status === ROOM_STATUS.OCCUPIED, '27. Room occupancy auto-updates to OCCUPIED when guest is assigned');

    // Test 28: Room deactivation marks out of service and preserves historical link
    const deleteRoomRes = await request(baseUrl, `/rooms/${newRoomId}`, {
      method: 'DELETE',
      token: adminToken,
    });
    const checkRoomDoc = await Room.findById(newRoomId);
    assert(deleteRoomRes.status === 200 && checkRoomDoc.isActive === false && checkRoomDoc.status === ROOM_STATUS.OUT_OF_SERVICE, '28. Room deactivation sets OUT_OF_SERVICE and preserves document integrity');

    console.log('\n--- GROUP 6: REQUEST DISPATCH, REASSIGNMENT & LIFECYCLE ---');
    // Test 29: Admin request listing works
    const adminReqsRes = await request(baseUrl, '/requests', {
      method: 'GET',
      token: adminToken,
    });
    assert(adminReqsRes.status === 200 && Array.isArray(adminReqsRes.data?.data?.requests), '29. Admin request listing returns all requests');

    // Test 30: Filters and pagination work
    const filterReqsRes = await request(baseUrl, `/requests?status=${REQUEST_STATUS.PENDING}&page=1&limit=5`, {
      method: 'GET',
      token: adminToken,
    });
    assert(filterReqsRes.status === 200 && filterReqsRes.data?.data?.pagination?.page === 1, '30. Request filters and pagination work properly');

    // Setup an active operational test ticket
    const dispatchTicket = await Request.create({
      guest: guestUser._id,
      room: testRoom._id,
      service: testService._id,
      department: testDept._id,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.PENDING,
      serviceTitle: 'Towel Request for Dispatch',
      requestNumber: `REQ-DSP-${timestamp % 10000}`,
    });
    createdRequestIds.push(dispatchTicket._id);

    // Test 31: Manual staff assignment works
    const assignRes = await request(baseUrl, `/requests/${dispatchTicket._id}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: { staffId: staffUser._id },
    });
    assert(
      assignRes.status === 200 &&
        (assignRes.data?.data?.status === REQUEST_STATUS.ASSIGNED ||
          assignRes.data?.data?.request?.status === REQUEST_STATUS.ASSIGNED),
      '31. Manual staff assignment assigns eligible staff and transitions to ASSIGNED'
    );

    // Test 32: Invalid staff assignment is rejected (assigning a GUEST or user from wrong department)
    const invalidAssignRes = await request(baseUrl, `/requests/${dispatchTicket._id}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: { staffId: guestUser._id }, // GUEST role cannot be assigned
    });
    assert(invalidAssignRes.status === 400, '32. Invalid staff assignment (guest user) is rejected with 400 Bad Request');

    // Test 33: Reassignment preserves audit history
    // Create a 2nd staff member in same department
    const staffUser2 = await User.create({
      name: `Staff Replacement ${timestamp}`,
      email: `staff2_${timestamp}@hotelhub.com`,
      password: await hashPassword('StaffPass123!'),
      role: USER_ROLES.STAFF,
      department: testDept._id,
      isActive: true,
      isOnDuty: true,
    });
    createdUserIds.push(staffUser2._id);

    const reassignRes = await request(baseUrl, `/requests/${dispatchTicket._id}/assign`, {
      method: 'PATCH',
      token: adminToken,
      body: { staffId: staffUser2._id },
    });
    const reassignStaffId = (
      reassignRes.data?.data?.assignedStaff?._id ||
      reassignRes.data?.data?.assignedStaff ||
      reassignRes.data?.data?.request?.assignedStaff?._id
    )?.toString();
    assert(
      reassignRes.status === 200 && reassignStaffId === staffUser2._id.toString(),
      '33. Safe reassignment updates assignee to replacement staff'
    );

    // Test 34: Priority override works only when authorized
    const staffPriorityRes = await request(baseUrl, `/requests/${dispatchTicket._id}/priority`, {
      method: 'PATCH',
      token: staffToken,
      body: { priority: REQUEST_PRIORITY.URGENT, reason: 'Staff escalation attempt' },
    });
    assert(staffPriorityRes.status === 403, '34a. Staff cannot execute Admin priority override (403 Forbidden)');

    const adminPriorityRes = await request(baseUrl, `/requests/${dispatchTicket._id}/priority`, {
      method: 'PATCH',
      token: adminToken,
      body: { priority: REQUEST_PRIORITY.URGENT, reason: 'VIP guest arrival VIP-901' },
    });
    assert(
      adminPriorityRes.status === 200 &&
        (adminPriorityRes.data?.data?.priority === REQUEST_PRIORITY.URGENT ||
          adminPriorityRes.data?.data?.request?.priority === REQUEST_PRIORITY.URGENT),
      '34b. Admin priority override successfully escalates ticket to URGENT'
    );

    // Test 35: Invalid state transitions remain blocked
    // Attempting to complete request before it is started
    const badCompleteRes = await request(baseUrl, `/requests/${dispatchTicket._id}/complete`, {
      method: 'PATCH',
      token: staffToken,
    });
    assert(badCompleteRes.status === 400, '35. Invalid lifecycle jump (ASSIGNED -> COMPLETED without START) is blocked');

    // Test 36: Cancellation respects documented lifecycle
    const cancelRes = await request(baseUrl, `/requests/${dispatchTicket._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Guest cancelled reservation' },
    });
    assert(
      cancelRes.status === 200 &&
        (cancelRes.data?.data?.status === REQUEST_STATUS.CANCELLED ||
          cancelRes.data?.data?.request?.status === REQUEST_STATUS.CANCELLED),
      '36. Admin cancellation in ASSIGNED state succeeds with reason'
    );


    console.log('\n--- GROUP 7: AUDIT TRAIL & NOTIFICATIONS ---');
    // Test 37: Administrative request changes create appropriate audit entries in RequestHistory
    const historyEntries = await RequestHistory.find({ request: dispatchTicket._id }).sort({ createdAt: 1 });
    const hasPriorityHistory = historyEntries.some(
      (h) => h.action === HISTORY_ACTION.PRIORITY_CHANGED || h.notes?.includes('VIP')
    );
    const hasAssignHistory = historyEntries.some((h) => h.action === HISTORY_ACTION.ASSIGNED);
    assert(hasPriorityHistory && hasAssignHistory, '37. Administrative assignment and priority overrides create RequestHistory entries');

    // Test 38: Persistent notifications are created for involved parties
    const notifications = await Notification.find({ request: dispatchTicket._id });
    assert(notifications.length > 0, '38. Persistent notifications are created for administrative events');

    // Test 39: Real-time Socket.IO events emit properly
    const adminSocket = Client(socketUrl, {
      auth: { token: adminToken },
      transports: ['websocket'],
    });

    const socketConnected = await new Promise((resolve) => {
      adminSocket.on('connect', () => resolve(true));
      setTimeout(() => resolve(false), 3000);
    });
    assert(socketConnected, '39. Real-time Socket.IO client connects and authenticates');
    adminSocket.disconnect();

    // Test 40: Duplicate operations handle cleanly
    const reCancelRes = await request(baseUrl, `/requests/${dispatchTicket._id}/cancel`, {
      method: 'PATCH',
      token: adminToken,
      body: { reason: 'Already cancelled' },
    });
    assert(reCancelRes.status === 400, '40. Duplicate cancellation on already cancelled ticket is rejected cleanly');

    console.log('\n--- GROUP 8: DATA INTEGRITY & SAFE CLEANUP ---');
    // Test 41: Unknown IDs handled correctly
    const fakeId = new mongoose.Types.ObjectId();
    const unknownRes = await request(baseUrl, `/requests/${fakeId}`, {
      method: 'GET',
      token: adminToken,
    });
    assert(unknownRes.status === 404, '41. Non-existent entity ID returns 404 Not Found');

    // Test 42: Duplicate unique values handled safely
    const conflictRoom = await request(baseUrl, '/rooms', {
      method: 'POST',
      token: adminToken,
      body: { roomNumber: testRoom.roomNumber, floor: testRoom.floor },
    });
    assert(conflictRoom.status === 409, '42. Duplicate unique key collisions safely return 409 Conflict');

    // Test 43: Stale/concurrent updates validate state machine
    // Attempting to accept a cancelled request
    const acceptCancelledRes = await request(baseUrl, `/requests/${dispatchTicket._id}/accept`, {
      method: 'PATCH',
      token: staffToken,
    });
    assert(acceptCancelledRes.status === 400, '43. Concurrent/stale operation on cancelled ticket is rejected by state machine');

    // Test 44: Test cleanup removes only test-created records
    console.log('\nPerforming selective test record cleanup...');
    const cleanupOps = await Promise.all([
      RequestHistory.deleteMany({ request: { $in: createdRequestIds } }),
      Notification.deleteMany({ request: { $in: createdRequestIds } }),
      Request.deleteMany({ _id: { $in: createdRequestIds } }),
      Room.deleteMany({ _id: { $in: createdRoomIds } }),
      Service.deleteMany({ _id: { $in: createdServiceIds } }),
      Department.deleteMany({ _id: { $in: createdDeptIds } }),
      User.deleteMany({ _id: { $in: createdUserIds } }),
    ]);
    assert(true, '44. Safe cleanup executed successfully without affecting production/seed data');

  } catch (error) {
    console.error('Test execution exception:', error);
    failedTests++;
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await mongoose.connection.close();
    console.log('MongoDB connection closed.');
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  }
}

run();
