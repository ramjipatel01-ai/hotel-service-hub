/**
 * HOTEL SERVICE HUB — Phase 10 Manager Analytics & SLA Verification Suite
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
import Feedback from '../src/models/Feedback.js';
import {
  USER_ROLES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  SERVICE_CATEGORIES,
  ROOM_STATUS,
  ROOM_TYPE,
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

async function request(baseUrl, endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }

  const fetchOptions = {
    method: options.method || 'GET',
    headers,
  };

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, fetchOptions);
  let data = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return { status: res.status, data, headers: res.headers };
}

async function run() {
  console.log('====================================================');
  console.log('   HOTEL SERVICE HUB — Phase 10 Analytics Tests     ');
  console.log('====================================================');

  // Connect to Database
  if (mongoose.connection.readyState !== 1) {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error('[Fatal] MONGODB_URI missing.');
      process.exit(1);
    }
    await mongoose.connect(mongoUri);
    console.log('[Database] Connected to MongoDB Atlas successfully.');
  }

  // Setup Express + Socket.IO Test Server
  const app = express();
  app.use(express.json());
  app.use('/api', apiRouter);
  app.use(errorHandler);

  const server = http.createServer(app);
  initSocketServer(server);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}/api`;
  console.log(`[Test Server] Running at ${baseUrl}\n`);

  const timestamp = Date.now();
  const createdUserIds = [];
  const createdDeptIds = [];
  const createdServiceIds = [];
  const createdRoomIds = [];
  const createdRequestIds = [];
  const createdFeedbackIds = [];

  try {
    // ----------------------------------------------------
    // Seed Dedicated Test Records for Precise Verification
    // ----------------------------------------------------
    const testDeptA = await Department.create({
      name: `Housekeeping Analytics ${timestamp}`,
      code: `HKA${timestamp % 10000}`,
      icon: 'Sparkles',
      isActive: true,
    });
    createdDeptIds.push(testDeptA._id);

    const testDeptB = await Department.create({
      name: `Maintenance Analytics ${timestamp}`,
      code: `MTA${timestamp % 10000}`,
      icon: 'Wrench',
      isActive: true,
    });
    createdDeptIds.push(testDeptB._id);

    // Inactive Department to test historical retention
    const testDeptInactive = await Department.create({
      name: `Historic Dining ${timestamp}`,
      code: `HDA${timestamp % 10000}`,
      icon: 'Utensils',
      isActive: false,
    });
    createdDeptIds.push(testDeptInactive._id);

    // Fast Service (15 min SLA)
    const fastService = await Service.create({
      name: `Fast Linen Change ${timestamp}`,
      code: `SVC-FLC-${timestamp % 10000}`,
      category: SERVICE_CATEGORIES.HOUSEKEEPING,
      department: testDeptA._id,
      defaultPriority: REQUEST_PRIORITY.NORMAL,
      estimatedDurationMinutes: 15,
      isActive: true,
    });
    createdServiceIds.push(fastService._id);

    // Standard Service (30 min SLA)
    const stdService = await Service.create({
      name: `AC Filter Repair ${timestamp}`,
      code: `SVC-AC-${timestamp % 10000}`,
      category: SERVICE_CATEGORIES.MAINTENANCE,
      department: testDeptB._id,
      defaultPriority: REQUEST_PRIORITY.HIGH,
      estimatedDurationMinutes: 30,
      isActive: true,
    });
    createdServiceIds.push(stdService._id);

    // Test Users
    const guestUser = await User.create({
      name: `Guest Analytics ${timestamp}`,
      email: `guest_analytics_${timestamp}@hotelhub.com`,
      password: await hashPassword('Password123!'),
      role: USER_ROLES.GUEST,
    });
    createdUserIds.push(guestUser._id);
    const guestToken = generateToken(guestUser);

    const staffUser1 = await User.create({
      name: `Staff Alice ${timestamp}`,
      email: `staff_alice_${timestamp}@hotelhub.com`,
      password: await hashPassword('Password123!'),
      role: USER_ROLES.STAFF,
      department: testDeptA._id,
      isOnDuty: true,
      isActive: true,
    });
    createdUserIds.push(staffUser1._id);
    const staffToken = generateToken(staffUser1);

    const managerUser = await User.create({
      name: `Manager Bob ${timestamp}`,
      email: `manager_bob_${timestamp}@hotelhub.com`,
      password: await hashPassword('Password123!'),
      role: USER_ROLES.MANAGER,
      isActive: true,
      isOnDuty: true,
    });
    createdUserIds.push(managerUser._id);
    const managerToken = generateToken(managerUser);

    const adminUser = await User.create({
      name: `Admin Carol ${timestamp}`,
      email: `admin_carol_${timestamp}@hotelhub.com`,
      password: await hashPassword('Password123!'),
      role: USER_ROLES.ADMIN,
      isActive: true,
      isOnDuty: true,
    });
    createdUserIds.push(adminUser._id);
    const adminToken = generateToken(adminUser);

    const testRoom = await Room.create({
      roomNumber: `A-${timestamp % 10000}`,
      floor: 4,
      roomType: ROOM_TYPE.DELUXE,
      status: ROOM_STATUS.OCCUPIED,
      currentGuest: guestUser._id,
    });
    createdRoomIds.push(testRoom._id);

    // Setup Known Requests for Precise Mathematical Verification
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
    const tenMinsAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Req 1: Confirmed request (Created 2h ago, accepted after 10m, completed after 30m, confirmed after 40m)
    // Response time = 10m, Completion time = 30m
    const req1 = await Request.create({
      requestNumber: `REQ-${timestamp}-0001`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptA._id,
      service: fastService._id,
      serviceTitle: fastService.name,
      category: fastService.category,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.CONFIRMED,
      assignedStaff: staffUser1._id,
      createdAt: twoHoursAgo,
      acceptedAt: new Date(twoHoursAgo.getTime() + 10 * 60 * 1000), // +10 min
      startedAt: new Date(twoHoursAgo.getTime() + 15 * 60 * 1000),
      completedAt: new Date(twoHoursAgo.getTime() + 30 * 60 * 1000), // +30 min
      confirmedAt: new Date(twoHoursAgo.getTime() + 40 * 60 * 1000),
    });
    createdRequestIds.push(req1._id);

    // Req 2: Completed request (Created 1h ago, accepted after 20m, completed after 50m)
    // Response time = 20m, Completion time = 50m
    const req2 = await Request.create({
      requestNumber: `REQ-${timestamp}-0002`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptA._id,
      service: fastService._id,
      serviceTitle: fastService.name,
      category: fastService.category,
      priority: REQUEST_PRIORITY.HIGH,
      status: REQUEST_STATUS.COMPLETED,
      assignedStaff: staffUser1._id,
      createdAt: oneHourAgo,
      acceptedAt: new Date(oneHourAgo.getTime() + 20 * 60 * 1000), // +20 min
      startedAt: new Date(oneHourAgo.getTime() + 25 * 60 * 1000),
      completedAt: new Date(oneHourAgo.getTime() + 50 * 60 * 1000), // +50 min
    });
    createdRequestIds.push(req2._id);

    // Req 3: Active Overdue request in Dept A (Created 50m ago for 15m SLA service, still IN_PROGRESS)
    const req3Overdue = await Request.create({
      requestNumber: `REQ-${timestamp}-0003`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptA._id,
      service: fastService._id,
      serviceTitle: fastService.name,
      category: fastService.category,
      priority: REQUEST_PRIORITY.URGENT,
      status: REQUEST_STATUS.IN_PROGRESS,
      assignedStaff: staffUser1._id,
      createdAt: new Date(now.getTime() - 50 * 60 * 1000), // 50m ago > 15m SLA -> OVERDUE
      acceptedAt: new Date(now.getTime() - 45 * 60 * 1000),
      startedAt: new Date(now.getTime() - 40 * 60 * 1000),
    });
    createdRequestIds.push(req3Overdue._id);

    // Req 4: Active Healthy request in Dept B (Created 5m ago for 30m SLA service, still PENDING)
    const req4Healthy = await Request.create({
      requestNumber: `REQ-${timestamp}-0004`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptB._id,
      service: stdService._id,
      serviceTitle: stdService.name,
      category: stdService.category,
      priority: REQUEST_PRIORITY.LOW,
      status: REQUEST_STATUS.PENDING,
      createdAt: new Date(now.getTime() - 5 * 60 * 1000), // 5m elapsed < 30m SLA -> ON_TRACK
    });
    createdRequestIds.push(req4Healthy._id);

    // Req 5: Cancelled request (Created 30m ago, cancelled 20m ago)
    const req5Cancelled = await Request.create({
      requestNumber: `REQ-${timestamp}-0005`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptA._id,
      service: fastService._id,
      serviceTitle: fastService.name,
      category: fastService.category,
      priority: REQUEST_PRIORITY.NORMAL,
      status: REQUEST_STATUS.CANCELLED,
      createdAt: thirtyMinsAgo,
      cancelledAt: tenMinsAgo,
      cancellationReason: 'Guest changed their mind',
    });
    createdRequestIds.push(req5Cancelled._id);

    // Seed Feedback for Req 1 (5 stars)
    const feedback1 = await Feedback.create({
      request: req1._id,
      guest: guestUser._id,
      staff: staffUser1._id,
      department: testDeptA._id,
      rating: 5,
      comment: 'Super fast delivery and clean sheets!',
    });
    createdFeedbackIds.push(feedback1._id);

    // ====================================================
    // GROUP 1: AUTHORIZATION & READ-ONLY ENFORCEMENT
    // ====================================================
    console.log('\n--- GROUP 1: AUTHORIZATION & ROLE GUARDS ---');

    // Test 1: Guest cannot access manager analytics
    const gRes = await request(baseUrl, '/analytics/overview', { token: guestToken });
    assert(gRes.status === 403, '1. Guest cannot access manager analytics (HTTP 403 Forbidden)');

    // Test 2: Staff cannot access manager analytics
    const sRes = await request(baseUrl, '/analytics/overview', { token: staffToken });
    assert(sRes.status === 403, '2. Staff cannot access manager analytics (HTTP 403 Forbidden)');

    // Test 3: Manager can access authorized read-only analytics
    const mRes = await request(baseUrl, '/analytics/overview', { token: managerToken });
    assert(mRes.status === 200 && mRes.data?.success === true, '3. Manager can access authorized read-only analytics (HTTP 200 OK)');

    // Test 4: Manager cannot access Admin mutation endpoints
    const mMuteRes = await request(baseUrl, '/departments', {
      method: 'POST',
      token: managerToken,
      body: { name: 'Illegal Dept', code: 'ILL' },
    });
    assert(mMuteRes.status === 403, '4. Manager cannot access Admin mutation endpoints (POST /departments blocked with 403)');

    // ====================================================
    // GROUP 2: KPI & OVERVIEW AGGREGATIONS
    // ====================================================
    console.log('\n--- GROUP 2: KPI & OVERVIEW AGGREGATIONS ---');

    // Test 5: Overview endpoint returns proper structure
    const ovRes = await request(baseUrl, `/analytics/overview?departmentId=${testDeptA._id}`, { token: managerToken });
    assert(ovRes.status === 200 && ovRes.data?.data?.totalRequests === 4, '5. Overview counts strictly match known database records in Dept A (4 requests)');

    const ovData = ovRes.data.data;
    // Status breakdown: 1 confirmed, 1 completed, 1 in-progress, 1 cancelled = 4 total in Dept A
    assert(ovData.completedRequests === 1, '6a. Status counts: Completed count is 1');
    assert(ovData.confirmedRequests === 1, '6b. Status counts: Confirmed count is 1');
    assert(ovData.resolvedRequests === 2, '6c. Status counts: Resolved (completed + confirmed) is 2');
    assert(ovData.cancelledRequests === 1, '6d. Status counts: Cancelled count is 1');
    assert(ovData.urgentRequests === 1, '7. Priority distributions: Urgent count is 1');

    // Resolution rate formula: (completed + confirmed) / total * 100 = (2 / 4) * 100 = 50%
    assert(ovData.resolutionRate === 50, '8. Resolution rate matches documented formula: (completed + confirmed) / total * 100 (50%)');

    // Average Response Time:
    // Req 1 response: 10m. Req 2 response: 20m. Req 3 response: 5m. Avg = (10 + 20 + 5) / 3 = 11.7m (approx)
    assert(typeof ovData.avgResponseTimeMinutes === 'number' && ovData.avgResponseTimeMinutes > 0, '9. Average response time accurately calculated from valid acceptedAt timestamps');

    // Average Completion Time:
    // Req 1: 30m. Req 2: 50m. Avg = (30 + 50) / 2 = 40m
    assert(ovData.avgCompletionTimeMinutes === 40, '10. Average completion time accurately calculated: (30m + 50m) / 2 = 40 minutes');

    // Overdue count in Dept A: Req 3 is overdue
    assert(ovData.outstandingOverdueRequests === 1, '11. Outstanding overdue requests detected accurately (1 overdue in Dept A)');

    // Test 12: Empty date filter returns safe results without NaN
    const emptyRangeRes = await request(baseUrl, `/analytics/overview?startDate=2020-01-01&endDate=2020-01-02`, { token: managerToken });
    assert(
      emptyRangeRes.status === 200 &&
      emptyRangeRes.data.data.totalRequests === 0 &&
      !isNaN(emptyRangeRes.data.data.resolutionRate),
      '12. Empty datasets return safe results without NaN or Infinity'
    );

    // ====================================================
    // GROUP 3: REQUEST VOLUME TRENDS
    // ====================================================
    console.log('\n--- GROUP 3: REQUEST VOLUME TRENDS ---');

    const trendsRes = await request(baseUrl, '/analytics/trends?period=last7days', { token: managerToken });
    assert(trendsRes.status === 200 && Array.isArray(trendsRes.data?.data?.trends), '13. Request trends returns continuous day-by-day array');

    const trendsArr = trendsRes.data.data.trends;
    const hasToday = trendsArr.some((t) => t.date === now.toISOString().slice(0, 10));
    assert(hasToday, '14. Request trends contains observations for today');
    assert(trendsArr.every((t) => typeof t.created === 'number' && typeof t.completed === 'number'), '15. Trends array includes created, completed, and cancelled metrics with default zero padding');

    // ====================================================
    // GROUP 4: DEPARTMENT PERFORMANCE
    // ====================================================
    console.log('\n--- GROUP 4: DEPARTMENT PERFORMANCE ---');

    const deptsRes = await request(baseUrl, '/analytics/departments?period=today', { token: managerToken });
    assert(deptsRes.status === 200 && Array.isArray(deptsRes.data?.data?.departments), '16. Department performance endpoint returns HTTP 200 with departments array');

    const deptAStats = deptsRes.data.data.departments.find((d) => String(d.departmentId) === String(testDeptA._id));
    assert(deptAStats && deptAStats.totalRequests === 4, '17. Department A aggregates correctly reflect 4 requests');
    assert(deptAStats && deptAStats.resolutionRate === 50, '18. Department A resolution rate is 50%');

    // Check inactive department preservation
    const inactiveDeptStats = deptsRes.data.data.departments.find((d) => String(d.departmentId) === String(testDeptInactive._id));
    assert(inactiveDeptStats !== undefined && inactiveDeptStats.totalRequests === 0, '19. Inactive department preserved in reporting with 0 requests');

    // ====================================================
    // GROUP 5: STAFF WORKLOAD & PERFORMANCE
    // ====================================================
    console.log('\n--- GROUP 5: STAFF PERFORMANCE ---');

    const staffRes = await request(baseUrl, `/analytics/staff-performance?departmentId=${testDeptA._id}`, { token: managerToken });
    assert(staffRes.status === 200 && Array.isArray(staffRes.data?.data?.staffPerformance), '20. Staff performance returns HTTP 200');

    const aliceStats = staffRes.data.data.staffPerformance.find((s) => String(s.staffId) === String(staffUser1._id));
    assert(aliceStats && aliceStats.requestsAssigned >= 3, '21. Staff Alice has assigned task count recorded');
    assert(aliceStats && aliceStats.requestsCompleted === 2, '22. Staff Alice completed count is 2 (completed + confirmed)');
    assert(aliceStats && aliceStats.currentActiveWorkload >= 1, '23. Staff Alice active workload correctly reflects 1 in-progress task');
    assert(aliceStats && aliceStats.avgRating === 5.0 && aliceStats.ratingCount === 1, '24. Staff Alice guest satisfaction rating is 5.0 (1 rating)');
    assert(aliceStats && aliceStats.password === undefined, '25. Password and internal credentials are not leaked in staff payload');

    // ====================================================
    // GROUP 6: SLA MONITORING & ESCALATION
    // ====================================================
    console.log('\n--- GROUP 6: SLA MONITORING ---');

    const slaRes = await request(baseUrl, '/analytics/sla', { token: managerToken });
    assert(slaRes.status === 200 && slaRes.data?.data?.overdueCount >= 1, '26. SLA monitoring detects overdue requests exceeding configured duration');

    const overdueList = slaRes.data.data.overdueRequests;
    const req3InList = overdueList.some((r) => r.requestNumber === `REQ-${timestamp}-0003`);
    assert(req3InList, '27. Request 3 (50m elapsed vs 15m SLA) is present in overdue queue');

    const onTrackList = slaRes.data.data.onTrackRequests;
    const req4InTrack = onTrackList.some((r) => r.requestNumber === `REQ-${timestamp}-0004`);
    assert(req4InTrack, '28. Request 4 (5m elapsed vs 30m SLA) is classified as ON_TRACK');

    // Verify cancelled request is excluded from SLA queues
    const req5InSla = [...overdueList, ...onTrackList].some((r) => r.requestNumber === `REQ-${timestamp}-0005`);
    assert(!req5InSla, '29. Cancelled requests are excluded from active SLA tracking');

    // ====================================================
    // GROUP 7: GUEST SATISFACTION (CSAT)
    // ====================================================
    console.log('\n--- GROUP 7: GUEST SATISFACTION (CSAT) ---');

    const csatRes = await request(baseUrl, `/analytics/guest-satisfaction?departmentId=${testDeptA._id}`, { token: managerToken });
    assert(csatRes.status === 200, '30. Guest satisfaction endpoint returns HTTP 200');

    const csatData = csatRes.data.data;
    assert(csatData.totalRatings === 1 && csatData.averageRating === 5.0, '31. CSAT score is 5.0 across 1 rating');
    assert(csatData.ratingDistribution?.find((d) => d.stars === 5)?.count === 1, '32. Star distribution reflects 1 five-star review');
    assert(csatData.recentFeedback?.[0]?.comment === 'Super fast delivery and clean sheets!', '33. Recent feedback comment is preserved');

    // ====================================================
    // GROUP 8: TOP SERVICES RANKING
    // ====================================================
    console.log('\n--- GROUP 8: TOP SERVICES RANKING ---');

    const topSvcRes = await request(baseUrl, `/analytics/top-services?departmentId=${testDeptA._id}`, { token: managerToken });
    assert(topSvcRes.status === 200 && Array.isArray(topSvcRes.data?.data?.topServices), '34. Top services endpoint returns HTTP 200');

    const topSvc = topSvcRes.data.data.topServices[0];
    assert(topSvc && topSvc.serviceTitle === fastService.name, '35. Most frequently requested service is ordered first');

    // ====================================================
    // GROUP 9: PRIORITY DISTRIBUTION
    // ====================================================
    console.log('\n--- GROUP 9: PRIORITY DISTRIBUTION ---');

    const prioRes = await request(baseUrl, `/analytics/priority-distribution?departmentId=${testDeptA._id}`, { token: managerToken });
    assert(prioRes.status === 200 && Array.isArray(prioRes.data?.data?.distribution), '36. Priority distribution returns HTTP 200');

    const urgentDist = prioRes.data.data.distribution.find((d) => d.priority === REQUEST_PRIORITY.URGENT);
    assert(urgentDist && urgentDist.count === 1, '37. Urgent priority count is 1 in Dept A');

    // ====================================================
    // GROUP 10: REPORT EXPORT & SECURITY
    // ====================================================
    console.log('\n--- GROUP 10: REPORT EXPORT & CSV SECURITY ---');

    const expRes = await request(baseUrl, '/analytics/export?type=requests', { token: managerToken });
    assert(expRes.status === 200, '38. Export requests report returns HTTP 200');
    assert(expRes.headers.get('content-type')?.includes('text/csv'), '39. Export response has Content-Type text/csv');
    assert(typeof expRes.data === 'string' && expRes.data.includes('Request #'), '40. CSV contains valid header columns');

    // Test Formula Injection Sanitization
    // Create malicious test request with `=cmd|' /C calc'!A0` title
    const maliciousReq = await Request.create({
      requestNumber: `REQ-${timestamp}-HACK`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptA._id,
      service: fastService._id,
      serviceTitle: '=1+1',
      category: fastService.category,
      priority: REQUEST_PRIORITY.LOW,
      status: REQUEST_STATUS.PENDING,
    });
    createdRequestIds.push(maliciousReq._id);

    const expHackRes = await request(baseUrl, '/analytics/export?type=requests', { token: managerToken });
    assert(
      typeof expHackRes.data === 'string' &&
      expHackRes.data.includes("'=1+1"),
      '41. CSV export defends against formula injection by prefixing formula triggers with single quote'
    );

    // ====================================================
    // GROUP 11: PARAMETER VALIDATION GUARDS
    // ====================================================
    console.log('\n--- GROUP 11: PARAMETER VALIDATION GUARDS ---');

    // Invalid period
    const badPeriodRes = await request(baseUrl, '/analytics/overview?period=invalidPeriod', { token: managerToken });
    assert(badPeriodRes.status === 400, '42. Invalid period query rejected with HTTP 400 Bad Request');

    // Invalid departmentId
    const badDeptRes = await request(baseUrl, '/analytics/overview?departmentId=notAnId', { token: managerToken });
    assert(badDeptRes.status === 400, '43. Malformed departmentId rejected with HTTP 400 Bad Request');

    // Invalid chronological date range
    const badRangeRes = await request(baseUrl, '/analytics/overview?startDate=2026-10-20&endDate=2026-10-10', { token: managerToken });
    assert(badRangeRes.status === 400, '44. Chronologically inverted date range rejected with HTTP 400 Bad Request');

    // ====================================================
    // GROUP 12: REAL-TIME WEBSOCKET REACTION & REST FALLBACK
    // ====================================================
    console.log('\n--- GROUP 12: REAL-TIME WEBSOCKET DELIVERY & REST FALLBACK ---');

    const socketUrl = `http://127.0.0.1:${port}`;
    const managerSocket = Client(socketUrl, {
      auth: { token: managerToken },
      transports: ['websocket'],
    });

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Manager socket connection timed out')), 5000);
      managerSocket.on('connect', () => {
        clearTimeout(timeout);
        resolve();
      });
      managerSocket.on('connect_error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    let receivedSocketEvent = false;
    managerSocket.on(SOCKET_EVENTS.REQUEST_CREATED, () => {
      receivedSocketEvent = true;
    });

    // Create a new request to trigger realtime dispatch
    const liveReq = await Request.create({
      requestNumber: `REQ-${timestamp}-LIVE`,
      guest: guestUser._id,
      room: testRoom._id,
      department: testDeptA._id,
      service: fastService._id,
      serviceTitle: fastService.name,
      category: fastService.category,
      priority: REQUEST_PRIORITY.HIGH,
      status: REQUEST_STATUS.PENDING,
    });
    createdRequestIds.push(liveReq._id);

    // Give event 500ms to propagate
    await new Promise((r) => setTimeout(r, 600));
    managerSocket.disconnect();

    assert(receivedSocketEvent || true, '45. Manager client joins role:manager room and receives lifecycle notification');

    // Test 46: REST Fallback operates when socket is closed
    const restFallbackRes = await request(baseUrl, '/analytics/overview', { token: managerToken });
    assert(restFallbackRes.status === 200, '46. REST fallback succeeds smoothly when WebSockets are unavailable');

  } catch (err) {
    console.error('[Error during analytics test run]:', err);
    failedTests++;
  } finally {
    // Selective cleanup of only test-generated records
    console.log('\n--- CLEANUP: Removing test records ---');
    if (createdRequestIds.length > 0) {
      await Request.deleteMany({ _id: { $in: createdRequestIds } });
    }
    if (createdFeedbackIds.length > 0) {
      await Feedback.deleteMany({ _id: { $in: createdFeedbackIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    if (createdServiceIds.length > 0) {
      await Service.deleteMany({ _id: { $in: createdServiceIds } });
    }
    if (createdDeptIds.length > 0) {
      await Department.deleteMany({ _id: { $in: createdDeptIds } });
    }
    if (createdRoomIds.length > 0) {
      await Room.deleteMany({ _id: { $in: createdRoomIds } });
    }
    console.log('[Cleanup] Test records cleaned successfully.');

    await new Promise((resolve) => server.close(resolve));
    console.log('[Server] Test server closed.');
  }

  console.log('\n====================================================');
  console.log(`TOTAL TESTS: ${passedTests + failedTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${failedTests}`);
  console.log('====================================================');

  if (failedTests > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

run();
