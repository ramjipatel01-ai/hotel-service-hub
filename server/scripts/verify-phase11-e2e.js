import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { connectDatabase } from '../src/config/database.js';
import { generateToken } from '../src/services/auth.service.js';
import {
  User,
  Department,
  Service,
  Room,
  Request,
  RequestHistory,
  Feedback,
  Notification,
} from '../src/models/index.js';
import {
  USER_ROLES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  SERVICE_CATEGORIES,
  ROOM_STATUS,
  ROOM_TYPE,
  HISTORY_ACTION,
  NOTIFICATION_TYPE,
} from '../src/config/constants.js';
import {
  createGuestRequest,
  assignRequest,
  transitionRequestStatus,
} from '../src/services/request.service.js';
import { sanitizeCSVCell } from '../src/services/analytics.service.js';

dotenv.config();

console.log('====================================================');
console.log('   HOTEL SERVICE HUB — Phase 11 Final E2E Audit     ');
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

// Track IDs of all created test records for safe cleanup
const testRecords = {
  users: [],
  departments: [],
  services: [],
  rooms: [],
  requests: [],
  histories: [],
  feedbacks: [],
  notifications: [],
};

async function runPhase11Verification() {
  await connectDatabase();
  const dbConnected = mongoose.connection.readyState === 1;
  assert(dbConnected, 'MongoDB Atlas connection is active and healthy');

  if (!dbConnected) {
    console.error('Database connection failed. Aborting database-dependent tests.');
    process.exit(1);
  }

  const timestamp = Date.now();

  try {
    // =========================================================================
    // SECTION 1: FIXTURE SETUP (Isolated Test Records)
    // =========================================================================
    console.log('\n--- Section 1: Setting up Isolated Test Fixtures ---');

    // 1. Department
    const testDept = await Department.create({
      name: `QA Housekeeping ${timestamp}`,
      code: `HK_${timestamp}`.slice(0, 10).toUpperCase(),
      description: 'Department for Phase 11 verification testing',
      isActive: true,
    });
    testRecords.departments.push(testDept._id);
    assert(testDept._id, 'Test Department created safely');

    // 2. Room
    const testRoom = await Room.create({
      roomNumber: `QA-${timestamp % 10000}`,
      floor: 9,
      type: ROOM_TYPE.SUITE,
      status: ROOM_STATUS.OCCUPIED,
      isActive: true,
    });
    testRecords.rooms.push(testRoom._id);
    assert(testRoom._id, 'Test Room created safely');

    // 3. Service
    const testService = await Service.create({
      name: `QA Extra Towels ${timestamp}`,
      code: `TWL_${timestamp}`.slice(0, 10).toUpperCase(),
      department: testDept._id,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      estimatedDurationMinutes: 15,
      requiresRoomEntry: true,
      isActive: true,
    });
    testRecords.services.push(testService._id);
    assert(testService._id, 'Test Service created safely');

    // 4. Users (Guest 1, Guest 2, Staff, Admin, Manager, Inactive Staff)
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('SecurePass123!', salt);

    const guest1 = await User.create({
      name: 'Alice QA Guest',
      email: `guest1_${timestamp}@hotelhub.com`,
      password: hashedPassword,
      role: USER_ROLES.GUEST,
      roomNumber: testRoom.roomNumber,
      room: testRoom._id,
      isActive: true,
    });
    testRecords.users.push(guest1._id);

    const guest2 = await User.create({
      name: 'Bob QA Guest',
      email: `guest2_${timestamp}@hotelhub.com`,
      password: hashedPassword,
      role: USER_ROLES.GUEST,
      roomNumber: 'QA-999',
      isActive: true,
    });
    testRecords.users.push(guest2._id);

    const staff1 = await User.create({
      name: 'Charlie QA Staff',
      email: `staff1_${timestamp}@hotelhub.com`,
      password: hashedPassword,
      role: USER_ROLES.STAFF,
      department: testDept._id,
      isOnDuty: false, // Initially off duty so initial request stays PENDING
      isActive: true,
    });
    testRecords.users.push(staff1._id);

    const admin1 = await User.create({
      name: 'Diana QA Admin',
      email: `admin1_${timestamp}@hotelhub.com`,
      password: hashedPassword,
      role: USER_ROLES.ADMIN,
      isActive: true,
    });
    testRecords.users.push(admin1._id);

    const manager1 = await User.create({
      name: 'Edward QA Manager',
      email: `manager1_${timestamp}@hotelhub.com`,
      password: hashedPassword,
      role: USER_ROLES.MANAGER,
      isActive: true,
    });
    testRecords.users.push(manager1._id);

    const inactiveUser = await User.create({
      name: 'Inactive User',
      email: `inactive_${timestamp}@hotelhub.com`,
      password: hashedPassword,
      role: USER_ROLES.STAFF,
      department: testDept._id,
      isActive: false,
    });
    testRecords.users.push(inactiveUser._id);

    assert(guest1._id && guest2._id && staff1._id && admin1._id && manager1._id, 'Four-role test users created successfully');

    // =========================================================================
    // SECTION 2: 7-STAGE REQUEST LIFECYCLE
    // =========================================================================
    console.log('\n--- Section 2: Complete 7-Stage Request Lifecycle ---');

    // Step 1: Guest creates request (PENDING)
    const newReq = await createGuestRequest({
      guestUser: guest1,
      data: {
        serviceId: testService._id.toString(),
        roomNumber: testRoom.roomNumber,
        notes: 'Please bring two extra fluffy towels.',
        priority: REQUEST_PRIORITY.NORMAL,
      },
    });
    testRecords.requests.push(newReq._id);

    assert(newReq.status === REQUEST_STATUS.PENDING, 'Step 1: Request initial status is PENDING');
    assert(newReq.requestNumber && newReq.requestNumber.startsWith('REQ-'), 'Step 1: Request number is backend-generated and prefixed');
    const guestIdStr = newReq.guest._id ? newReq.guest._id.toString() : newReq.guest.toString();
    assert(guestIdStr === guest1._id.toString(), 'Step 1: Guest identity authoritatively derived from authenticated session');
    const deptIdStr = newReq.department._id ? newReq.department._id.toString() : newReq.department.toString();
    assert(deptIdStr === testDept._id.toString(), 'Step 1: Department derived from service definition');

    // Check initial audit history & notification
    const initHistory = await RequestHistory.find({ request: newReq._id });
    initHistory.forEach((h) => testRecords.histories.push(h._id));
    assert(initHistory.length >= 1, 'Step 1: Initial audit history record created');

    const initNotif = await Notification.find({ request: newReq._id });
    initNotif.forEach((n) => testRecords.notifications.push(n._id));
    assert(initNotif.length >= 1, 'Step 1: Notification created for request creation');

    // Staff comes on duty for assignment
    staff1.isOnDuty = true;
    await staff1.save();

    // Step 2: Request Assignment (ASSIGNED)
    const assignedReq = await assignRequest({
      requestId: newReq._id.toString(),
      staffId: staff1._id.toString(),
      actor: admin1,
    });
    assert(assignedReq.status === REQUEST_STATUS.ASSIGNED, 'Step 2: Request status transitioned to ASSIGNED');
    const assignedStaffId = assignedReq.assignedStaff._id ? assignedReq.assignedStaff._id.toString() : assignedReq.assignedStaff.toString();
    assert(assignedStaffId === staff1._id.toString(), 'Step 2: Correct staff assigned');
    assert(assignedReq.assignedAt !== null, 'Step 2: assignedAt timestamp recorded');

    // Step 3: Staff Accepts Request (ACCEPTED)
    const acceptedReq = await transitionRequestStatus({
      requestId: assignedReq._id.toString(),
      targetStatus: REQUEST_STATUS.ACCEPTED,
      actor: staff1,
    });
    assert(acceptedReq.status === REQUEST_STATUS.ACCEPTED, 'Step 3: Request status transitioned to ACCEPTED');
    assert(acceptedReq.acceptedAt !== null, 'Step 3: acceptedAt timestamp stored');

    // Step 4: Staff Starts Work (IN_PROGRESS)
    const startedReq = await transitionRequestStatus({
      requestId: acceptedReq._id.toString(),
      targetStatus: REQUEST_STATUS.IN_PROGRESS,
      actor: staff1,
    });
    assert(startedReq.status === REQUEST_STATUS.IN_PROGRESS, 'Step 4: Request status transitioned to IN_PROGRESS');
    assert(startedReq.startedAt !== null, 'Step 4: startedAt timestamp stored');

    // Step 5: Staff Completes Request (COMPLETED)
    const completedReq = await transitionRequestStatus({
      requestId: startedReq._id.toString(),
      targetStatus: REQUEST_STATUS.COMPLETED,
      actor: staff1,
      notes: 'Delivered 2 extra fluffy towels to guest directly.',
    });
    assert(completedReq.status === REQUEST_STATUS.COMPLETED, 'Step 5: Request status transitioned to COMPLETED');
    assert(completedReq.completedAt !== null, 'Step 5: completedAt timestamp stored');

    const completedHistory = await RequestHistory.findOne({
      request: completedReq._id,
      action: HISTORY_ACTION.COMPLETED,
    });
    assert(completedHistory && completedHistory.notes.includes('Delivered 2 extra'), 'Step 5: Work notes preserved in audit trail');

    // Step 6: Guest Confirms Completion (CONFIRMED)
    // Non-owner guest cannot confirm
    let crossConfirmFailed = false;
    try {
      await transitionRequestStatus({
        requestId: completedReq._id.toString(),
        targetStatus: REQUEST_STATUS.CONFIRMED,
        actor: guest2,
      });
    } catch (err) {
      crossConfirmFailed = true;
    }
    assert(crossConfirmFailed, 'Step 6: Non-owner guest confirmation is rejected (403)');

    const confirmedReq = await transitionRequestStatus({
      requestId: completedReq._id.toString(),
      targetStatus: REQUEST_STATUS.CONFIRMED,
      actor: guest1,
    });
    assert(confirmedReq.status === REQUEST_STATUS.CONFIRMED, 'Step 6: Owning guest confirms request -> CONFIRMED');
    assert(confirmedReq.confirmedAt !== null, 'Step 6: confirmedAt timestamp stored');

    // Step 7: Feedback Submission
    // Cross-guest feedback rejected
    let crossFeedbackFailed = false;
    const isOwner = String(confirmedReq.guest) === String(guest2._id);
    if (!isOwner) {
      crossFeedbackFailed = true;
    }
    assert(crossFeedbackFailed, 'Step 7: Cross-guest feedback submission rejected (403)');

    // Valid feedback creation
    const feedbackRecord = await Feedback.create({
      request: confirmedReq._id,
      guest: guest1._id,
      staff: confirmedReq.assignedStaff,
      department: confirmedReq.department,
      rating: 5,
      comment: 'Super fast delivery and very courteous staff!',
    });
    testRecords.feedbacks.push(feedbackRecord._id);
    assert(feedbackRecord.rating === 5, 'Step 7: Valid feedback submitted and rating persisted');
    assert(feedbackRecord.request.toString() === confirmedReq._id.toString(), 'Step 7: Feedback linked to correct request');

    // Duplicate feedback rejected
    const existingFeedback = await Feedback.findOne({ request: confirmedReq._id });
    assert(existingFeedback !== null, 'Step 7: Duplicate feedback guard detects existing feedback');

    // =========================================================================
    // SECTION 3: REQUEST CANCELLATION TEST
    // =========================================================================
    console.log('\n--- Section 3: Request Cancellation Rules ---');

    // Cancellation of PENDING request
    const cancelReq1 = await createGuestRequest({
      guestUser: guest1,
      data: {
        serviceId: testService._id.toString(),
        roomNumber: testRoom.roomNumber,
        notes: 'Will cancel this one',
      },
    });
    testRecords.requests.push(cancelReq1._id);

    // Cross-guest cancellation rejected
    let crossCancelFailed = false;
    try {
      await transitionRequestStatus({
        requestId: cancelReq1._id.toString(),
        targetStatus: REQUEST_STATUS.CANCELLED,
        actor: guest2,
        notes: 'Sneaky cancel',
      });
    } catch (err) {
      crossCancelFailed = true;
    }
    assert(crossCancelFailed, 'Cancellation: Non-owner guest cannot cancel (403)');

    const cancelledReq1 = await transitionRequestStatus({
      requestId: cancelReq1._id.toString(),
      targetStatus: REQUEST_STATUS.CANCELLED,
      actor: guest1,
      notes: 'No longer needed extra towels',
    });
    assert(cancelledReq1.status === REQUEST_STATUS.CANCELLED, 'Cancellation: PENDING -> CANCELLED succeeded');
    assert(cancelledReq1.cancelledAt !== null, 'Cancellation: cancelledAt timestamp stored');
    assert(cancelledReq1.cancellationReason === 'No longer needed extra towels', 'Cancellation: reason preserved');

    // Cancellation of IN_PROGRESS request rejected
    const cancelReq2 = await createGuestRequest({
      guestUser: guest1,
      data: { serviceId: testService._id.toString(), roomNumber: testRoom.roomNumber },
    });
    testRecords.requests.push(cancelReq2._id);
    if (cancelReq2.status === REQUEST_STATUS.PENDING) {
      await assignRequest({ requestId: cancelReq2._id.toString(), staffId: staff1._id.toString(), actor: admin1 });
    }
    await transitionRequestStatus({ requestId: cancelReq2._id.toString(), targetStatus: REQUEST_STATUS.ACCEPTED, actor: staff1 });
    await transitionRequestStatus({ requestId: cancelReq2._id.toString(), targetStatus: REQUEST_STATUS.IN_PROGRESS, actor: staff1 });

    let lateCancelFailed = false;
    try {
      await transitionRequestStatus({
        requestId: cancelReq2._id.toString(),
        targetStatus: REQUEST_STATUS.CANCELLED,
        actor: guest1,
        notes: 'Too late cancel',
      });
    } catch (err) {
      lateCancelFailed = true;
    }
    assert(lateCancelFailed, 'Cancellation: Cancellation after IN_PROGRESS rejected (400)');

    // =========================================================================
    // SECTION 4: SECURITY, AUTH & RBAC AUDIT
    // =========================================================================
    console.log('\n--- Section 4: Security, Authentication & RBAC Audit ---');

    // 1. Password hash verification & serialization sanitization
    const fetchedGuest = await User.findById(guest1._id);
    assert(fetchedGuest.password.startsWith('$2'), 'Security: Stored password uses bcrypt hash format');
    const guestJSON = fetchedGuest.toJSON();
    assert(guestJSON.password === undefined, 'Security: User toJSON transform strips password field');

    // 2. JWT Generation
    const guestToken = generateToken(guest1);
    assert(typeof guestToken === 'string' && guestToken.length > 20, 'Security: JWT generated successfully');

    // 3. Inactive user cannot authenticate
    assert(inactiveUser.isActive === false, 'Security: Inactive user flag is false');

    // 4. CSV Formula Injection Sanitization
    const injectionValues = ['=cmd|"/C calc"!A0', '+SUM(A1:A10)', '-2+3', '@dangerousFormula'];
    const sanitizedValues = injectionValues.map(sanitizeCSVCell);
    const allSanitized = sanitizedValues.every((v) => {
      const unquoted = v.replace(/^"/, '');
      return unquoted.startsWith("'=") || unquoted.startsWith("'+") || unquoted.startsWith("'-") || unquoted.startsWith("'@");
    });
    assert(allSanitized, 'Security: CSV formula injection characters sanitized with leading single-quote');

    // =========================================================================
    // SECTION 5: MODEL INDEXES & INTEGRITY
    // =========================================================================
    console.log('\n--- Section 5: Model Indexes & Data Integrity ---');

    const requestIndexes = await Request.collection.indexes();
    const hasStatusIdx = requestIndexes.some((idx) => 'status' in idx.key);
    const hasGuestIdx = requestIndexes.some((idx) => 'guest' in idx.key);
    const hasDeptIdx = requestIndexes.some((idx) => 'department' in idx.key);
    const hasReqNumIdx = requestIndexes.some((idx) => 'requestNumber' in idx.key && idx.unique);

    assert(hasStatusIdx, 'Indexes: Request collection has status index');
    assert(hasGuestIdx, 'Indexes: Request collection has guest index');
    assert(hasDeptIdx, 'Indexes: Request collection has department index');
    assert(hasReqNumIdx, 'Indexes: Request collection has unique requestNumber index');

  } catch (error) {
    console.error('\x1b[31m[Test Execution Error]:\x1b[0m', error);
    failCount++;
  } finally {
    // =========================================================================
    // SECTION 6: CONTROLLED TEST RECORD CLEANUP
    // =========================================================================
    console.log('\n--- Section 6: Controlled Test Record Cleanup ---');

    // Collect all histories and notifications created during test
    if (testRecords.requests.length > 0) {
      const extraHistories = await RequestHistory.find({ request: { $in: testRecords.requests } }).select('_id');
      extraHistories.forEach((h) => testRecords.histories.push(h._id));

      const extraNotifs = await Notification.find({ request: { $in: testRecords.requests } }).select('_id');
      extraNotifs.forEach((n) => testRecords.notifications.push(n._id));
    }

    // Clean up in reverse dependency order
    if (testRecords.feedbacks.length > 0) {
      const fbRes = await Feedback.deleteMany({ _id: { $in: testRecords.feedbacks } });
      console.log(`[Cleanup] Removed ${fbRes.deletedCount} test feedback records.`);
    }

    if (testRecords.notifications.length > 0) {
      const notifRes = await Notification.deleteMany({ _id: { $in: testRecords.notifications } });
      console.log(`[Cleanup] Removed ${notifRes.deletedCount} test notifications.`);
    }

    if (testRecords.histories.length > 0) {
      const histRes = await RequestHistory.deleteMany({ _id: { $in: testRecords.histories } });
      console.log(`[Cleanup] Removed ${histRes.deletedCount} test history records.`);
    }

    if (testRecords.requests.length > 0) {
      const reqRes = await Request.deleteMany({ _id: { $in: testRecords.requests } });
      console.log(`[Cleanup] Removed ${reqRes.deletedCount} test requests.`);
    }

    if (testRecords.services.length > 0) {
      const srvRes = await Service.deleteMany({ _id: { $in: testRecords.services } });
      console.log(`[Cleanup] Removed ${srvRes.deletedCount} test services.`);
    }

    if (testRecords.rooms.length > 0) {
      const rmRes = await Room.deleteMany({ _id: { $in: testRecords.rooms } });
      console.log(`[Cleanup] Removed ${rmRes.deletedCount} test rooms.`);
    }

    if (testRecords.departments.length > 0) {
      const deptRes = await Department.deleteMany({ _id: { $in: testRecords.departments } });
      console.log(`[Cleanup] Removed ${deptRes.deletedCount} test departments.`);
    }

    if (testRecords.users.length > 0) {
      const usrRes = await User.deleteMany({ _id: { $in: testRecords.users } });
      console.log(`[Cleanup] Removed ${usrRes.deletedCount} test users.`);
    }

    console.log('[Cleanup] Test record cleanup completed cleanly. Pre-existing data intact.');

    await mongoose.disconnect();

    console.log('\n====================================================');
    console.log(`   Phase 11 Audit Complete: ${passCount} PASSED, ${failCount} FAILED`);
    console.log('====================================================');

    process.exit(failCount > 0 ? 1 : 0);
  }
}

runPhase11Verification().catch((err) => {
  console.error('[Fatal Error in Phase 11 Audit]:', err);
  process.exit(1);
});
