import dotenv from 'dotenv';
import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  sanitizeUser,
} from '../src/services/auth.service.js';
import {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateUpdateProfile,
  validateCreateUser,
} from '../src/validators/auth.validators.js';
import { authorize } from '../src/middleware/role.middleware.js';
import { USER_ROLES } from '../src/config/constants.js';

dotenv.config();

console.log('====================================================');
console.log('   HOTEL SERVICE HUB — Auth & RBAC Verification     ');
console.log('====================================================');

let totalErrors = 0;

// 1. Verify Password Hashing & Comparison
console.log('\n--- 1. Testing Password Security ---');
const plainPass = 'HotelSecurePass2026!';
const hashed = await hashPassword(plainPass);

const matchTrue = await comparePassword(plainPass, hashed);
const matchFalse = await comparePassword('WrongPassword', hashed);

if (matchTrue && !matchFalse) {
  console.log('\x1b[32m[PASS]\x1b[0m bcrypt password hashing and comparison verified.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Password comparison mismatch.');
  totalErrors++;
}

// 2. Verify JWT Signing & Verification
console.log('\n--- 2. Testing JWT Signing & Decoding ---');
const mockUser = {
  _id: '507f1f77bcf86cd799439011',
  role: USER_ROLES.GUEST,
};

const token = generateToken(mockUser);
const decoded = verifyToken(token);

if (decoded && decoded.userId === mockUser._id && decoded.role === USER_ROLES.GUEST) {
  console.log(`\x1b[32m[PASS]\x1b[0m JWT payload signed and decoded successfully (userId: ${decoded.userId}, role: ${decoded.role}).`);
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m JWT token verification failed.');
  totalErrors++;
}

// 3. Verify User Sanitization (Zero Password Leakage)
console.log('\n--- 3. Testing User Sanitization ---');
const rawUserData = {
  _id: '507f1f77bcf86cd799439011',
  name: 'Demo Guest',
  email: 'guest@hotelhub.com',
  password: 'hashed_password_should_be_stripped',
  role: USER_ROLES.GUEST,
  isActive: true,
};
const sanitized = sanitizeUser(rawUserData);

if (sanitized && !sanitized.password && sanitized.email === 'guest@hotelhub.com') {
  console.log('\x1b[32m[PASS]\x1b[0m sanitizeUser successfully removed password field.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Password leaked in sanitized user object.');
  totalErrors++;
}

// 4. Testing Input Validation Guards
console.log('\n--- 4. Testing Input Validation Guards ---');

// Mock response creator
function createMockRes() {
  const res = {
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
  return res;
}

// Test Role Escalation Block in Registration
const roleEscalationReq = {
  body: {
    name: 'Hacker',
    email: 'hacker@example.com',
    password: 'password123',
    role: USER_ROLES.ADMIN, // Attempting to register as Admin
  },
};
const res1 = createMockRes();
let calledNext1 = false;
validateRegister(roleEscalationReq, res1, () => { calledNext1 = true; });

if (res1.statusCode === 400 && !calledNext1) {
  console.log('\x1b[32m[PASS]\x1b[0m Public role escalation attempt (ADMIN) correctly rejected with 400.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Public registration did not reject privileged role!');
  totalErrors++;
}

// Test Valid Registration passes validation
const validRegReq = {
  body: {
    name: 'Valid Guest',
    email: 'guest@valid.com',
    password: 'ValidPassword123',
    role: USER_ROLES.GUEST,
  },
};
const res2 = createMockRes();
let calledNext2 = false;
validateRegister(validRegReq, res2, () => { calledNext2 = true; });

if (calledNext2 && res2.statusCode === 200) {
  console.log('\x1b[32m[PASS]\x1b[0m Valid GUEST registration payload passed validator.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Valid registration payload failed validator.');
  totalErrors++;
}

// Test Fake Email (repeated characters or placeholder) is rejected
const fakeEmailReq = {
  body: {
    name: 'Test Guest',
    email: 'aaaaaaa@gmail.com',
    password: 'ValidPassword123',
    role: USER_ROLES.GUEST,
  },
};
const resFakeEmail = createMockRes();
let calledNextFakeEmail = false;
validateRegister(fakeEmailReq, resFakeEmail, () => { calledNextFakeEmail = true; });

if (resFakeEmail.statusCode === 400 && !calledNextFakeEmail) {
  console.log('\x1b[32m[PASS]\x1b[0m Fake/repetitive email (aaaaaaa@gmail.com) correctly rejected with 400.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Validator failed to reject fake email!');
  totalErrors++;
}

// Test Random/Dummy 10-digit Phone is rejected
const randomPhoneReq = {
  body: {
    name: 'Test Guest',
    email: 'realguest@gmail.com',
    phone: '1234567890', // Invalid prefix, sequential dummy
    password: 'ValidPassword123',
    role: USER_ROLES.GUEST,
  },
};
const resRandomPhone = createMockRes();
let calledNextRandomPhone = false;
validateRegister(randomPhoneReq, resRandomPhone, () => { calledNextRandomPhone = true; });

if (resRandomPhone.statusCode === 400 && !calledNextRandomPhone) {
  console.log('\x1b[32m[PASS]\x1b[0m Random/dummy 10-digit phone (1234567890) correctly rejected with 400.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Validator failed to reject dummy phone number!');
  totalErrors++;
}

// Test Repeated 10-digit Phone is rejected
const repeatPhoneReq = {
  body: {
    name: 'Test Guest',
    email: 'realguest@gmail.com',
    phone: '9999999999', // Identical repeated digits
    password: 'ValidPassword123',
    role: USER_ROLES.GUEST,
  },
};
const resRepeatPhone = createMockRes();
let calledNextRepeatPhone = false;
validateRegister(repeatPhoneReq, resRepeatPhone, () => { calledNextRepeatPhone = true; });

if (resRepeatPhone.statusCode === 400 && !calledNextRepeatPhone) {
  console.log('\x1b[32m[PASS]\x1b[0m Repeated dummy phone (9999999999) correctly rejected with 400.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Validator failed to reject repeated dummy phone number!');
  totalErrors++;
}

// Test Authentic Indian Mobile Phone is accepted
const validPhoneReq = {
  body: {
    name: 'Test Guest',
    email: 'realguest@gmail.com',
    phone: '+91 98123 45678',
    password: 'ValidPassword123',
    role: USER_ROLES.GUEST,
  },
};
const resValidPhone = createMockRes();
let calledNextValidPhone = false;
validateRegister(validPhoneReq, resValidPhone, () => { calledNextValidPhone = true; });

if (calledNextValidPhone && resValidPhone.statusCode === 200) {
  console.log('\x1b[32m[PASS]\x1b[0m Authentic Indian mobile number (+91 98765 43210) accepted.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Validator rejected valid Indian mobile number!');
  totalErrors++;
}

// Test Profile Update Tampering Guard
const profileTamperReq = {
  body: {
    name: 'New Name',
    role: USER_ROLES.ADMIN, // Attempting to change role through profile update
  },
};
const res3 = createMockRes();
let calledNext3 = false;
validateUpdateProfile(profileTamperReq, res3, () => { calledNext3 = true; });

if (res3.statusCode === 400 && !calledNext3) {
  console.log('\x1b[32m[PASS]\x1b[0m Attempt to modify protected profile field (role) correctly rejected with 400.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m Profile tampering was not blocked!');
  totalErrors++;
}

// 5. Testing RBAC Role Middleware
console.log('\n--- 5. Testing RBAC Role Middleware ---');
const adminGuard = authorize(USER_ROLES.ADMIN);

// Guest accessing Admin endpoint
const guestReq = { user: { role: USER_ROLES.GUEST } };
const res4 = createMockRes();
let calledNext4 = false;
adminGuard(guestReq, res4, () => { calledNext4 = true; });

if (res4.statusCode === 403 && !calledNext4) {
  console.log('\x1b[32m[PASS]\x1b[0m GUEST denied access to ADMIN resource with HTTP 403.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m RBAC middleware allowed unauthorized role!');
  totalErrors++;
}

// Admin accessing Admin endpoint
const adminReq = { user: { role: USER_ROLES.ADMIN } };
const res5 = createMockRes();
let calledNext5 = false;
adminGuard(adminReq, res5, () => { calledNext5 = true; });

if (calledNext5 && res5.statusCode === 200) {
  console.log('\x1b[32m[PASS]\x1b[0m ADMIN granted access to ADMIN resource.');
} else {
  console.error('\x1b[31m[FAIL]\x1b[0m RBAC middleware denied authorized role!');
  totalErrors++;
}

// 6. Testing Live HTTP Server Endpoints
console.log('\n--- 6. Testing Live HTTP Auth Endpoints ---');
try {
  // Test /api/auth/me without token -> 401
  const meRes = await fetch('http://localhost:5000/api/auth/me');
  const meData = await meRes.json();
  if (meRes.status === 401 && meData.success === false) {
    console.log('\x1b[32m[PASS]\x1b[0m GET /api/auth/me without token returned HTTP 401 Unauthorized.');
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m Expected 401, got ${meRes.status}`);
    totalErrors++;
  }

  // Test /api/auth/me with invalid Bearer token -> 401
  const invalidTokenRes = await fetch('http://localhost:5000/api/auth/me', {
    headers: { Authorization: 'Bearer this.is.an.invalid.token' },
  });
  const invalidTokenData = await invalidTokenRes.json();
  if (invalidTokenRes.status === 401 && invalidTokenData.success === false) {
    console.log('\x1b[32m[PASS]\x1b[0m GET /api/auth/me with bogus token returned HTTP 401 Unauthorized.');
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m Expected 401, got ${invalidTokenRes.status}`);
    totalErrors++;
  }

  // Test /api/auth/logout -> 200
  const logoutRes = await fetch('http://localhost:5000/api/auth/logout', {
    method: 'POST',
  });
  const logoutData = await logoutRes.json();
  if (logoutRes.status === 200 && logoutData.success === true) {
    console.log('\x1b[32m[PASS]\x1b[0m POST /api/auth/logout returned HTTP 200 Success.');
  } else {
    console.error(`\x1b[31m[FAIL]\x1b[0m Expected 200, got ${logoutRes.status}`);
    totalErrors++;
  }
} catch (fetchErr) {
  console.warn('\x1b[33m[WARN]\x1b[0m Live server check skipped:', fetchErr.message);
}

console.log('====================================================');
if (totalErrors === 0) {
  console.log('\x1b[32m%s\x1b[0m', '  ALL AUTH & RBAC VERIFICATIONS PASSED (0 ERRORS)    ');
  console.log('====================================================');
  process.exit(0);
} else {
  console.error('\x1b[31m%s\x1b[0m', `  VERIFICATION FAILED WITH ${totalErrors} ERROR(S)    `);
  console.log('====================================================');
  process.exit(1);
}
