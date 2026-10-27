import mongoose from 'mongoose';
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
import { isValidObjectId, generateRequestNumber } from '../src/utils/dbUtils.js';

console.log('====================================================');
console.log('   HOTEL SERVICE HUB — Models & Schema Verification ');
console.log('====================================================');

const models = [
  { name: 'User', model: User },
  { name: 'Department', model: Department },
  { name: 'Service', model: Service },
  { name: 'Room', model: Room },
  { name: 'Request', model: Request },
  { name: 'RequestHistory', model: RequestHistory },
  { name: 'Feedback', model: Feedback },
  { name: 'Notification', model: Notification },
];

let totalErrors = 0;

// 1. Verify Model Compilation & Indexes
for (const { name, model } of models) {
  if (!model || !(model.prototype instanceof mongoose.Model)) {
    console.error(`\x1b[31m[FAIL]\x1b[0m ${name} is not a valid Mongoose model.`);
    totalErrors++;
  } else {
    const indexes = model.schema.indexes();
    console.log(`\x1b[32m[PASS]\x1b[0m Model: ${name.padEnd(16)} | Paths: ${Object.keys(model.schema.paths).length.toString().padStart(2)} | Indexes: ${indexes.length}`);
  }
}

// 2. Verify Utility Functions
console.log('\n--- Verifying Database Utilities ---');
const testId = new mongoose.Types.ObjectId();
const isValid = isValidObjectId(testId.toString());
const isInvalid = isValidObjectId('not-a-valid-object-id');

if (isValid && !isInvalid) {
  console.log('\x1b[32m[PASS]\x1b[0m isValidObjectId() behaves correctly.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m isValidObjectId() validation failed.');
  totalErrors++;
}

const sampleReqNumber = await generateRequestNumber();
const reqNumberRegex = /^REQ-\d{8}-\d{4}$/;
if (reqNumberRegex.test(sampleReqNumber)) {
  console.log(`\x1b[32m[PASS]\x1b[0m generateRequestNumber() format valid: ${sampleReqNumber}`);
} else {
  console.error(`\x1b[31m[FAIL]\x1b[0m generateRequestNumber() format mismatch: ${sampleReqNumber}`);
  totalErrors++;
}

// 3. Verify Model Schema Validation (without connecting to DB)
console.log('\n--- Verifying Schema In-Memory Validation ---');

// Test User Validation
const validUserDoc = new User({
  name: 'Verification User',
  email: 'test@hotelhub.com',
  password: 'hashedpassword123',
  role: USER_ROLES.GUEST,
});
const userValErr = validUserDoc.validateSync();
if (!userValErr) {
  console.log('\x1b[32m[PASS]\x1b[0m User document validation passed.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m User validation error:', userValErr.message);
  totalErrors++;
}

// Test User Email Validation failure
const invalidUserDoc = new User({
  name: 'V',
  email: 'invalid-email-string',
  password: '123',
  role: 'UNKNOWN_ROLE',
});
const invalidUserErr = invalidUserDoc.validateSync();
if (invalidUserErr && invalidUserErr.errors.email && invalidUserErr.errors.role) {
  console.log('\x1b[32m[PASS]\x1b[0m User invalid constraints correctly caught.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m User invalid constraints not detected properly.');
  totalErrors++;
}

// Test Request Validation
const validReqDoc = new Request({
  requestNumber: sampleReqNumber,
  guest: testId,
  room: testId,
  department: testId,
  service: testId,
  serviceTitle: 'Extra Towels',
  category: SERVICE_CATEGORIES.HOUSEKEEPING,
  priority: REQUEST_PRIORITY.NORMAL,
  status: REQUEST_STATUS.PENDING,
});
const reqValErr = validReqDoc.validateSync();
if (!reqValErr) {
  console.log('\x1b[32m[PASS]\x1b[0m Request document validation passed.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Request validation error:', reqValErr.message);
  totalErrors++;
}

// Test Feedback Rating Bounds (1 to 5)
const invalidFeedback = new Feedback({
  request: testId,
  guest: testId,
  department: testId,
  rating: 7, // Invalid > 5
});
const fbErr = invalidFeedback.validateSync();
if (fbErr && fbErr.errors.rating) {
  console.log('\x1b[32m[PASS]\x1b[0m Feedback rating > 5 correctly rejected.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Feedback rating bound not enforced.');
  totalErrors++;
}

console.log('====================================================');
if (totalErrors === 0) {
  console.log('\x1b[32m%s\x1b[0m', '  ALL 8 MODELS & UTILITIES VERIFIED SUCCESSFULLY!   ');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('\x1b[31m%s\x1b[0m', `  VERIFICATION FAILED WITH ${totalErrors} ERROR(S)    `);
  console.log('====================================================');
  process.exit(1);
}
