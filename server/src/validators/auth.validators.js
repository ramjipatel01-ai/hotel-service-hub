import { USER_ROLES } from '../config/constants.js';

/**
 * Validates strict RFC & genuine email addresses
 */
export function validateEmailString(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email address is required';
  }

  const trimmed = email.trim().toLowerCase();
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@gmail.com)';
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Invalid email structure';
  const [localPart, domain] = parts;

  if (localPart.length < 3) {
    return 'Email username must be at least 3 characters long';
  }
  if (localPart.length > 64) {
    return 'Email username cannot exceed 64 characters';
  }
  if (!/[a-zA-Z]/.test(localPart)) {
    return 'Email username must contain at least one letter';
  }
  if (/\.{2,}|_{2,}|-{2,}|\+{2,}/.test(localPart)) {
    return 'Email cannot contain consecutive special characters';
  }
  if (/^(.)\1+$/.test(localPart)) {
    return 'Please provide a genuine email address, not repeated characters';
  }

  const fakeUsernames = [
    'test', 'asdf', 'asdfgh', 'asdfghjkl', 'qwerty', 'qwertyuiop',
    'fake', 'sample', 'dummy', 'temp', 'random', '123456',
  ];
  if (fakeUsernames.includes(localPart)) {
    return 'Please provide an authentic email address, not a placeholder';
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return 'Email domain must have a valid extension (e.g. .com, .in)';
  }

  const fakeDomains = ['example.com', 'test.com', 'fake.com', 'temp.com', 'dummy.com', 'sample.com'];
  if (fakeDomains.includes(domain)) {
    return 'Please use an active email domain (e.g., gmail.com, yahoo.com)';
  }

  return null;
}

/**
 * Validates Indian 10-digit mobile phone numbers
 */
export function validatePhoneString(phone, isRequired = false) {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    if (isRequired) return 'Phone number is required';
    return null;
  }

  const trimmed = phone.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  let core10 = digitsOnly;
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    core10 = digitsOnly.slice(2);
  } else if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    core10 = digitsOnly.slice(1);
  }

  if (core10.length !== 10) {
    return 'Phone number must be a valid 10-digit mobile number';
  }

  if (!/^[6-9]/.test(core10)) {
    return 'Indian mobile numbers must start with 6, 7, 8, or 9';
  }

  if (/^(.)\1{9}$/.test(core10)) {
    return 'Please enter a genuine mobile number, not repeated digits';
  }

  const sequentialPatterns = [
    '1234567890', '0123456789', '9876543210', '0987654321',
    '9898989898', '9797979797', '9696969696', '9191919191',
    '9090909090', '8989898989', '7878787878', '6767676767',
  ];
  if (sequentialPatterns.includes(core10)) {
    return 'Please enter an authentic mobile number, not a sequential test number';
  }

  const uniqueDigits = new Set(core10.split(''));
  if (uniqueDigits.size < 4) {
    return 'Please enter a valid mobile number with authentic digits';
  }

  return null;
}

/**
 * Validates public guest registration payload
 */
export function validateRegister(req, res, next) {
  const { name, email, password, phone, role } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long');
  }

  const emailError = validateEmailString(email);
  if (emailError) {
    errors.push(emailError);
  }

  if (phone) {
    const phoneError = validatePhoneString(phone, false);
    if (phoneError) {
      errors.push(phoneError);
    }
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long');
  }

  // Security guard: Prevent client-side role escalation during public registration
  if (role && role !== USER_ROLES.GUEST) {
    errors.push('Public registration is restricted to GUEST accounts only');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

/**
 * Validates login payload
 */
export function validateLogin(req, res, next) {
  const { email, password } = req.body;
  const errors = [];

  if (!email || !emailRegex.test(String(email).trim())) {
    errors.push('A valid email address is required');
  }

  if (!password || typeof password !== 'string' || password.length === 0) {
    errors.push('Password is required');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

/**
 * Validates change password payload
 */
export function validateChangePassword(req, res, next) {
  const { currentPassword, newPassword } = req.body;
  const errors = [];

  if (!currentPassword) {
    errors.push('Current password is required');
  }

  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    errors.push('New password must be at least 6 characters long');
  }

  if (currentPassword && newPassword && currentPassword === newPassword) {
    errors.push('New password must be different from current password');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

/**
 * Validates Admin user creation payload
 */
export function validateCreateUser(req, res, next) {
  const { name, email, password, phone, role, department } = req.body;
  const errors = [];

  if (!name || typeof name !== 'string' || name.trim().length < 2) {
    errors.push('Name is required and must be at least 2 characters long');
  }

  const emailError = validateEmailString(email);
  if (emailError) {
    errors.push(emailError);
  }

  if (phone) {
    const phoneError = validatePhoneString(phone, false);
    if (phoneError) {
      errors.push(phoneError);
    }
  }

  if (!password || typeof password !== 'string' || password.length < 6) {
    errors.push('Password is required and must be at least 6 characters long');
  }

  if (!role || !Object.values(USER_ROLES).includes(role)) {
    errors.push(`Role must be one of: ${Object.values(USER_ROLES).join(', ')}`);
  }

  if (role === USER_ROLES.STAFF && !department) {
    errors.push('Department reference is required for STAFF accounts');
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors,
    });
  }

  next();
}

/**
 * Validates self profile update payload
 * Whitelists allowed editable fields only
 */
export function validateUpdateProfile(req, res, next) {
  const forbiddenFields = ['role', 'email', 'password', 'department', 'room', 'isActive'];
  const attemptedForbidden = forbiddenFields.filter((f) => req.body[f] !== undefined);

  if (attemptedForbidden.length > 0) {
    return res.status(400).json({
      success: false,
      message: `Direct modification of protected field(s) disallowed: ${attemptedForbidden.join(', ')}`,
    });
  }

  next();
}

/**
 * Validates Google OAuth payload
 */
export function validateGoogleAuth(req, res, next) {
  const token = req.body?.idToken || req.body?.credential;
  if (!token || typeof token !== 'string' || token.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Google ID token (credential) is required.',
      errors: ['A valid Google ID token string is required'],
    });
  }
  next();
}
