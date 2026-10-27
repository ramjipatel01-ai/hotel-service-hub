/**
 * Validation utilities for HOTEL SERVICE HUB (Client)
 */

/**
 * Strict Email validation
 * Rejects invalid format, gibberish usernames, repeated chars, fake domains
 * @param {string} email
 * @returns {string|null} Error message or null if valid
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string' || !email.trim()) {
    return 'Email address is required.';
  }

  const trimmed = email.trim().toLowerCase();

  // Standard RFC compliant email regex
  const emailRegex = /^[a-zA-Z0-9]([a-zA-Z0-9._%+-]*[a-zA-Z0-9])?@([a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return 'Please enter a valid email address (e.g. name@gmail.com).';
  }

  const parts = trimmed.split('@');
  if (parts.length !== 2) return 'Invalid email structure.';
  const [localPart, domain] = parts;

  // Username length rules
  if (localPart.length < 3) {
    return 'Email username must be at least 3 characters long.';
  }
  if (localPart.length > 64) {
    return 'Email username cannot exceed 64 characters.';
  }

  // Must contain at least one letter
  if (!/[a-zA-Z]/.test(localPart)) {
    return 'Email username must contain at least one letter.';
  }

  // Cannot contain consecutive special chars
  if (/\.{2,}|_{2,}|-{2,}|\+{2,}/.test(localPart)) {
    return 'Email contains invalid consecutive special characters.';
  }

  // Reject single repeated character (e.g. aaaaa@, 11111@)
  if (/^(.)\1+$/.test(localPart)) {
    return 'Please enter a genuine email address, not repeated characters.';
  }

  // Reject common fake/placeholder usernames
  const fakeUsernames = [
    'test', 'asdf', 'asdfgh', 'asdfghjkl', 'qwerty', 'qwertyuiop',
    'fake', 'sample', 'dummy', 'temp', 'random', '123456', 'none',
  ];
  if (fakeUsernames.includes(localPart)) {
    return 'Please enter an authentic personal or work email address.';
  }

  // Domain rules
  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (tld.length < 2) {
    return 'Email domain must have a valid extension (e.g., .com, .in).';
  }

  const fakeDomains = ['example.com', 'test.com', 'fake.com', 'temp.com', 'dummy.com', 'sample.com'];
  if (fakeDomains.includes(domain)) {
    return 'Please use an active email domain (e.g., gmail.com, yahoo.com).';
  }

  return null;
}

/**
 * Strict Phone Number validation (Indian 10-digit mobile standards)
 * Rejects random numbers, non-Indian prefixes, repeated digits, sequential dummy numbers
 * @param {string} phone
 * @param {boolean} isRequired
 * @returns {string|null} Error message or null if valid
 */
export function validatePhone(phone, isRequired = false) {
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    if (isRequired) return 'Phone number is required.';
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
    return 'Phone number must be a valid 10-digit mobile number (e.g., +91 98765 43210).';
  }

  // Indian mobile numbers must start with 6, 7, 8, or 9
  if (!/^[6-9]/.test(core10)) {
    return 'Indian mobile numbers must start with 6, 7, 8, or 9.';
  }

  // Reject all identical repeated digits (e.g. 9999999999, 8888888888, 7777777777)
  if (/^(.)\1{9}$/.test(core10)) {
    return 'Please enter a genuine mobile number, not repeated digits.';
  }

  // Reject common dummy/sequential patterns
  const sequentialPatterns = [
    '1234567890', '0123456789', '9876543210', '0987654321',
    '9898989898', '9797979797', '9696969696', '9191919191',
    '9090909090', '8989898989', '7878787878', '6767676767',
  ];
  if (sequentialPatterns.includes(core10)) {
    return 'Please enter an authentic mobile number, not a sequential test number.';
  }

  // Must have at least 4 unique digits
  const uniqueDigits = new Set(core10.split(''));
  if (uniqueDigits.size < 4) {
    return 'Please enter a valid mobile number with authentic digits.';
  }

  return null;
}
