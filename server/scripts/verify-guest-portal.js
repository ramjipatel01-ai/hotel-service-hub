/**
 * HOTEL SERVICE HUB — Phase 7 Guest Portal Integration Test Suite
 * Tests Guest Catalog, Request Creation, Live Tracking, Cancellation, Feedback, and Cross-Guest Security
 */

import http from 'http';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { io as Client } from 'socket.io-client';
import express from 'express';
import cors from 'cors';

// Load environment variables
dotenv.config();

import User from '../src/models/User.js';
import Room from '../src/models/Room.js';
import Department from '../src/models/Department.js';
import Service from '../src/models/Service.js';
import Request from '../src/models/Request.js';
import RequestHistory from '../src/models/RequestHistory.js';
import Notification from '../src/models/Notification.js';
import Feedback from '../src/models/Feedback.js';
import {
  USER_ROLES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  SERVICE_CATEGORIES,
  SOCKET_EVENTS,
} from '../src/config/constants.js';

import apiRoutes from '../src/routes/index.js';
import { initSocketServer } from '../src/sockets/index.js';
import { generateToken } from '../src/services/auth.service.js';

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
  console.log('   HOTEL SERVICE HUB — Phase 7 Guest Portal Tests   ');
  console.log('====================================================\n');

  // 1. Connect to MongoDB Atlas
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri || mongoUri.includes('YOUR_DB_PASSWORD')) {
    console.error('[FATAL] Real MongoDB Atlas URI not configured.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('[Database] Connected to MongoDB Atlas successfully.');

  // 2. Spin up test HTTP + Socket.IO server on random port
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use('/api', apiRoutes);

  // Global error handler
  app.use((err, req, res, next) => {
    res.status(err.statusCode || err.status || 500).json({
      success: false,
      message: err.message || 'Internal Server Error',
    });
  });

  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}/api`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  // Track created records for safe cleanup
  const createdRequestIds = [];
  const createdFeedbackIds = [];
  const createdUserIds = [];

  try {
    // 3. Setup Test Actors
    // Find seeded guest Sarah
    let guestA = await User.findOne({ email: 'guest@hotelhub.com' }).populate('room');
    if (!guestA) {
      // Find any guest or room
      const room = await Room.findOne();
      guestA = await User.create({
        name: 'Test Guest A',
        email: `guest.a.${Date.now()}@test.com`,
        password: 'password123',
        role: USER_ROLES.GUEST,
        room: room?._id,
      });
      createdUserIds.push(guestA._id);
    }

    // Create a second guest for cross-guest authorization testing
    const roomB = (await Room.findOne({ _id: { $ne: guestA.room?._id } })) || guestA.room;
    const guestB = await User.create({
      name: 'Test Guest B',
      email: `guest.b.${Date.now()}@test.com`,
      password: 'password123',
      role: USER_ROLES.GUEST,
      room: roomB?._id,
    });
    createdUserIds.push(guestB._id);

    // Resolve Housekeeping department
    const deptHK = (await Department.findOne({ code: 'HOUSEKEEPING' })) || (await Department.findOne());

    // Setup Housekeeping staff belonging to target department
    let staffHK = await User.findOne({ role: USER_ROLES.STAFF, department: deptHK._id, isActive: true });
    if (!staffHK) {
      staffHK = await User.findOne({ role: USER_ROLES.STAFF });
      if (staffHK) {
        staffHK.department = deptHK._id;
        staffHK.isOnDuty = true;
        staffHK.isActive = true;
        await staffHK.save();
      }
    } else if (!staffHK.isOnDuty) {
      staffHK.isOnDuty = true;
      await staffHK.save();
    }
    const admin = await User.findOne({ role: USER_ROLES.ADMIN });

    const tokenGuestA = generateToken(guestA);
    const tokenGuestB = generateToken(guestB);
    const tokenStaff = generateToken(staffHK);
    const tokenAdmin = generateToken(admin);

    // Helper for authenticated requests
    async function apiCall(endpoint, method = 'GET', body = null, token = tokenGuestA) {
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

    console.log('--- TEST A: Guest Authentication & Live Catalog ---');
    // 1. Profile retrieval
    const profileRes = await apiCall('/users/me', 'GET', null, tokenGuestA);
    assert(profileRes.status === 200, 'Guest retrieves self profile with HTTP 200');
    assert(profileRes.data?.data?.user?.email === guestA.email, 'Profile matches authenticated guest email');
    assert(Boolean(profileRes.data?.data?.user?.room), 'Profile includes populated room information');

    // 2. Catalog retrieval
    const servicesRes = await apiCall('/services', 'GET', null, tokenGuestA);
    assert(servicesRes.status === 200, 'Catalog endpoint /api/services returns HTTP 200');
    const serviceList = servicesRes.data?.data?.services || [];
    assert(Array.isArray(serviceList) && serviceList.length > 0, 'Catalog returns array of live services');

    // 3. Search and filter catalog
    const hkServicesRes = await apiCall('/services?category=HOUSEKEEPING', 'GET', null, tokenGuestA);
    assert(hkServicesRes.status === 200, 'Category filtered catalog returns HTTP 200');
    const hkList = hkServicesRes.data?.data?.services || [];
    assert(hkList.every((s) => s.category === 'HOUSEKEEPING'), 'All returned services belong to HOUSEKEEPING');

    console.log('\n--- TEST B: Request Creation & Automation Rules ---');
    // Pick an active service
    const targetService = serviceList.find((s) => s.isActive !== false) || serviceList[0];
    const newReqPayload = {
      serviceId: targetService._id,
      quantity: 1,
      priority: REQUEST_PRIORITY.NORMAL,
      description: 'Phase 7 Integration Verification Request',
      specialInstructions: 'Please leave outside door.',
    };

    const createRes = await apiCall('/requests', 'POST', newReqPayload, tokenGuestA);
    assert(createRes.status === 201, 'Request creation returns HTTP 201 Created');
    const createdReq = createRes.data?.data?.request || createRes.data?.data;
    assert(Boolean(createdReq?._id), 'Created request returns database ObjectId');
    if (createdReq?._id) createdRequestIds.push(createdReq._id);

    // Verify correct guest and room assignment derived securely from session
    assert(String(createdReq.guest?._id || createdReq.guest) === String(guestA._id), 'Guest ID derived strictly from session');
    assert(Boolean(createdReq.room), 'Room assigned automatically from guest profile');
    assert(Boolean(createdReq.requestNumber?.startsWith('REQ-')), 'Request number conforms to REQ-YYYYMMDD-XXXX format');

    // Verify initial RequestHistory audit log
    const historyRes = await apiCall(`/requests/${createdReq._id}/history`, 'GET', null, tokenGuestA);
    assert(historyRes.status === 200, 'Request history returns HTTP 200');
    const historyEntries = Array.isArray(historyRes.data?.data) ? historyRes.data.data : historyRes.data?.data?.history || [];
    assert(historyEntries.length >= 1, 'Initial creation recorded in immutable RequestHistory audit trail');

    // Verify notification persistence
    const notifsRes = await apiCall('/notifications', 'GET', null, tokenGuestA);
    assert(notifsRes.status === 200, 'Notifications endpoint returns HTTP 200');
    const notifs = notifsRes.data?.data?.notifications || [];
    assert(notifs.some((n) => String(n.user?._id || n.user) === String(guestA._id)), 'Notification created and persisted for guest');

    console.log('\n--- TEST C: Live Lifecycle & Confirmation (Real-Time Socket Verification) ---');
    // Connect guest socket client
    const guestSocket = Client(`http://localhost:${port}`, {
      auth: { token: tokenGuestA },
      transports: ['websocket'],
    });

    await new Promise((resolve) => guestSocket.on('connect', resolve));
    assert(guestSocket.connected, 'Guest socket connected with JWT handshake');

    let receivedAccepted = false;
    let receivedCompleted = false;

    guestSocket.on(SOCKET_EVENTS.REQUEST_ACCEPTED, (payload) => {
      if (payload.requestId === String(createdReq._id)) receivedAccepted = true;
    });

    guestSocket.on(SOCKET_EVENTS.REQUEST_COMPLETED, (payload) => {
      if (payload.requestId === String(createdReq._id)) receivedCompleted = true;
    });

    // Cross-guest check: Guest B cannot cancel Guest A request while in PENDING
    const guestBCancelRes = await apiCall(`/requests/${createdReq._id}/cancel`, 'PATCH', { reason: 'Unauthorized cancellation' }, tokenGuestB);
    assert(guestBCancelRes.status === 403, 'Guest B blocked from cancelling Guest A request (HTTP 403)');

    // Find or prepare staff belonging to the request's department
    const reqDeptId = createdReq.department?._id || createdReq.department;
    let assignedStaff = await User.findOne({ role: USER_ROLES.STAFF, department: reqDeptId, isActive: true });
    if (!assignedStaff) {
      assignedStaff = await User.findOne({ role: USER_ROLES.STAFF });
      if (assignedStaff) {
        assignedStaff.department = reqDeptId;
        assignedStaff.isOnDuty = true;
        assignedStaff.isActive = true;
        await assignedStaff.save();
      }
    } else if (!assignedStaff.isOnDuty) {
      assignedStaff.isOnDuty = true;
      await assignedStaff.save();
    }
    const tokenAssignedStaff = generateToken(assignedStaff);

    // Assign request to department staff
    const assignRes = await apiCall(`/requests/${createdReq._id}/assign`, 'PATCH', { staffId: assignedStaff._id }, tokenAdmin);
    assert(assignRes.status === 200, 'Admin assigns staff to request with HTTP 200');

    const acceptRes = await apiCall(`/requests/${createdReq._id}/accept`, 'PATCH', {}, tokenAssignedStaff);
    assert(acceptRes.status === 200, 'Staff accepts ticket with HTTP 200');

    const startRes = await apiCall(`/requests/${createdReq._id}/start`, 'PATCH', {}, tokenAssignedStaff);
    assert(startRes.status === 200, 'Staff starts work on ticket with HTTP 200');

    const completeRes = await apiCall(`/requests/${createdReq._id}/complete`, 'PATCH', {}, tokenAssignedStaff);
    assert(completeRes.status === 200, 'Staff marks ticket COMPLETED with HTTP 200');

    // Wait 300ms for socket propagation
    await new Promise((r) => setTimeout(r, 300));
    assert(receivedAccepted, 'Guest received real-time request:accepted socket event');
    assert(receivedCompleted, 'Guest received real-time request:completed socket event');

    // Cross-guest check: Guest B cannot confirm Guest A's completed request
    const guestBConfirmRes = await apiCall(`/requests/${createdReq._id}/confirm`, 'PATCH', {}, tokenGuestB);
    assert(guestBConfirmRes.status === 403, 'Guest B blocked from confirming Guest A request (HTTP 403)');

    // Guest A confirms completion
    const confirmRes = await apiCall(`/requests/${createdReq._id}/confirm`, 'PATCH', {}, tokenGuestA);
    assert(confirmRes.status === 200, 'Guest confirms completed request with HTTP 200');
    const confirmedReq = confirmRes.data?.data;
    assert(confirmedReq?.status === REQUEST_STATUS.CONFIRMED, 'Request status transitions to CONFIRMED');
    assert(Boolean(confirmedReq?.confirmedAt), 'confirmedAt lifecycle timestamp is populated');

    guestSocket.disconnect();

    console.log('\n--- TEST D: Request Cancellation Business Rules ---');
    // Create new request to test cancellation
    const cancelTestReqRes = await apiCall('/requests', 'POST', newReqPayload, tokenGuestA);
    const cancelTestReq = cancelTestReqRes.data?.data?.request || cancelTestReqRes.data?.data;
    if (cancelTestReq?._id) createdRequestIds.push(cancelTestReq._id);

    // Cancel while in PENDING
    const cancelSuccessRes = await apiCall(
      `/requests/${cancelTestReq._id}/cancel`,
      'PATCH',
      { reason: 'Guest changed mind' },
      tokenGuestA
    );
    assert(cancelSuccessRes.status === 200, 'Cancellation succeeds while in PENDING status (HTTP 200)');
    assert(cancelSuccessRes.data?.data?.status === REQUEST_STATUS.CANCELLED, 'Status updated to CANCELLED');

    // Attempt to cancel already confirmed request (must be rejected)
    const cancelForbiddenRes = await apiCall(
      `/requests/${createdReq._id}/cancel`,
      'PATCH',
      { reason: 'Invalid cancel' },
      tokenGuestA
    );
    assert(cancelForbiddenRes.status === 400, 'Cancellation rejected once completed/confirmed with HTTP 400');

    console.log('\n--- TEST E: Feedback & Rating Endpoint Verification ---');
    // 1. Submit valid feedback for the confirmed request
    const feedbackPayload = {
      requestId: createdReq._id,
      rating: 5,
      comment: 'Housekeeping service was fast and flawless!',
    };
    const feedbackRes = await apiCall('/feedback', 'POST', feedbackPayload, tokenGuestA);
    assert(feedbackRes.status === 201, 'Feedback submission returns HTTP 201 Created');
    const feedbackDoc = feedbackRes.data?.data?.feedback;
    assert(Boolean(feedbackDoc?._id), 'Feedback document created with ObjectId');
    if (feedbackDoc?._id) createdFeedbackIds.push(feedbackDoc._id);
    assert(feedbackDoc?.rating === 5, 'Feedback rating accurately stored as 5');

    // 2. Reject duplicate feedback for the same request (enforce 1 per request)
    const duplicateFeedbackRes = await apiCall('/feedback', 'POST', feedbackPayload, tokenGuestA);
    assert(duplicateFeedbackRes.status === 409, 'Duplicate feedback rejected with HTTP 409 Conflict');

    // 3. Reject invalid ratings (must be integer 1-5)
    const invalidRatingRes1 = await apiCall(
      '/feedback',
      'POST',
      { requestId: cancelTestReq._id, rating: 6, comment: 'Too high' },
      tokenGuestA
    );
    assert(invalidRatingRes1.status === 400, 'Rating > 5 rejected with HTTP 400');

    const invalidRatingRes2 = await apiCall(
      '/feedback',
      'POST',
      { requestId: cancelTestReq._id, rating: 0, comment: 'Too low' },
      tokenGuestA
    );
    assert(invalidRatingRes2.status === 400, 'Rating < 1 rejected with HTTP 400');

    const invalidRatingRes3 = await apiCall(
      '/feedback',
      'POST',
      { requestId: cancelTestReq._id, rating: 4.5, comment: 'Non-integer' },
      tokenGuestA
    );
    assert(invalidRatingRes3.status === 400, 'Non-integer rating rejected with HTTP 400');

    // 4. Reject feedback on unconfirmed request
    const unconfirmedFeedbackRes = await apiCall(
      '/feedback',
      'POST',
      { requestId: cancelTestReq._id, rating: 5, comment: 'Cancelled ticket' },
      tokenGuestA
    );
    assert(unconfirmedFeedbackRes.status === 400, 'Feedback on non-confirmed request rejected with HTTP 400');

    // 5. Query feedback by request ID
    const getFeedbackRes = await apiCall(`/feedback/request/${createdReq._id}`, 'GET', null, tokenGuestA);
    assert(getFeedbackRes.status === 200, 'GET /api/feedback/request/:id returns HTTP 200');
    assert(getFeedbackRes.data?.data?.feedback?.rating === 5, 'Feedback rating matches query');

    console.log('\n--- TEST F: Authorization & Cross-Guest Data Isolation ---');
    // 1. Guest B cannot submit feedback for Guest A's request
    const guestBFeedbackRes = await apiCall(
      '/feedback',
      'POST',
      { requestId: createdReq._id, rating: 1, comment: 'Impersonation' },
      tokenGuestB
    );
    assert(guestBFeedbackRes.status === 403, 'Guest B blocked from submitting feedback on Guest A request (HTTP 403)');

    // 2. Guest B cannot view Guest A's feedback
    const guestBGetFeedbackRes = await apiCall(`/feedback/request/${createdReq._id}`, 'GET', null, tokenGuestB);
    assert(guestBGetFeedbackRes.status === 403, 'Guest B blocked from viewing Guest A feedback (HTTP 403)');

    // 3. Scoped listing: Guest B's GET /requests only contains Guest B's requests
    const guestBRequestsRes = await apiCall('/requests', 'GET', null, tokenGuestB);
    const guestBList = guestBRequestsRes.data?.data?.requests || [];
    assert(
      guestBList.every((r) => String(r.guest?._id || r.guest) === String(guestB._id)),
      'Guest B request list strictly isolated from other guests'
    );

    console.log('\n--- TEST G: Profile Update Permitted Fields Whitelist ---');
    // Attempting forbidden field 'role' must be rejected
    const forbiddenRoleRes = await apiCall(
      '/users/me',
      'PATCH',
      { role: 'ADMIN' },
      tokenGuestA
    );
    assert(forbiddenRoleRes.status === 400, 'Security whitelist rejects role modification with HTTP 400');

    // Valid update with permitted fields 'name' and 'phone'
    const updateProfileRes = await apiCall(
      '/users/me',
      'PATCH',
      { name: 'Sarah Jenkins Updated', phone: '+1 555-019-9999' },
      tokenGuestA
    );
    assert(updateProfileRes.status === 200, 'Profile update returns HTTP 200');
    assert(updateProfileRes.data?.data?.user?.name === 'Sarah Jenkins Updated', 'Permitted field "name" updated');
    assert(updateProfileRes.data?.data?.user?.phone === '+1 555-019-9999', 'Permitted field "phone" updated');
    assert(updateProfileRes.data?.data?.user?.role === USER_ROLES.GUEST, 'Security whitelist maintains GUEST role');

    // Revert profile name for neatness
    await apiCall('/users/me', 'PATCH', { name: 'Sarah Jenkins' }, tokenGuestA);

    console.log('\n====================================================');
    console.log(`Phase 7 Verification Complete: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('====================================================\n');
  } catch (err) {
    console.error('[TEST SUITE CRASH]:', err);
    failedTests++;
  } finally {
    // Clean up test-created records
    try {
      if (createdFeedbackIds.length > 0) {
        await Feedback.deleteMany({ _id: { $in: createdFeedbackIds } });
      }
      if (createdRequestIds.length > 0) {
        await Request.deleteMany({ _id: { $in: createdRequestIds } });
        await RequestHistory.deleteMany({ request: { $in: createdRequestIds } });
      }
      if (createdUserIds.length > 0) {
        await User.deleteMany({ _id: { $in: createdUserIds } });
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
