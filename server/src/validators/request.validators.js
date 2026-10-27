import { REQUEST_PRIORITY, REQUEST_STATUS } from '../config/constants.js';
import { isValidObjectId } from '../utils/dbUtils.js';

/**
 * Validates request creation input payload
 * @param {Object} data - req.body
 * @returns {Array<string>} Array of validation error messages, empty if valid
 */
export function validateCreateRequestInput(data) {
  const errors = [];

  // serviceId validation
  if (!data.serviceId) {
    errors.push('serviceId is required.');
  } else if (!isValidObjectId(data.serviceId)) {
    errors.push('serviceId must be a valid MongoDB ObjectId.');
  }

  // priority validation (optional in body; if provided must match enum)
  if (data.priority !== undefined) {
    if (!Object.values(REQUEST_PRIORITY).includes(data.priority)) {
      errors.push(`priority must be one of: ${Object.values(REQUEST_PRIORITY).join(', ')}.`);
    }
  }

  // quantity validation
  if (data.quantity !== undefined) {
    const qty = Number(data.quantity);
    if (!Number.isInteger(qty) || qty < 1) {
      errors.push('quantity must be a positive integer greater than or equal to 1.');
    } else if (qty > 100) {
      errors.push('quantity cannot exceed 100.');
    }
  }

  // description validation
  if (data.description !== undefined && typeof data.description !== 'string') {
    errors.push('description must be a string.');
  } else if (data.description && data.description.length > 1000) {
    errors.push('description cannot exceed 1000 characters.');
  }

  // specialInstructions validation
  if (data.specialInstructions !== undefined && typeof data.specialInstructions !== 'string') {
    errors.push('specialInstructions must be a string.');
  } else if (data.specialInstructions && data.specialInstructions.length > 500) {
    errors.push('specialInstructions cannot exceed 500 characters.');
  }

  // preferredTime validation
  if (data.preferredTime !== undefined && data.preferredTime !== null && data.preferredTime !== '') {
    const parsedDate = new Date(data.preferredTime);
    if (isNaN(parsedDate.getTime())) {
      errors.push('preferredTime must be a valid ISO date/time string.');
    }
  }

  // imageUrl validation
  if (data.imageUrl !== undefined && data.imageUrl !== null && data.imageUrl !== '') {
    if (typeof data.imageUrl !== 'string') {
      errors.push('imageUrl must be a string.');
    } else if (data.imageUrl.length > 500) {
      errors.push('imageUrl cannot exceed 500 characters.');
    } else {
      // Basic URL or safe relative upload path validation
      const urlPattern = /^(https?:\/\/[^\s$.?#].[^\s]*|\/uploads\/[a-zA-Z0-9_\-./]+)$/i;
      if (!urlPattern.test(data.imageUrl)) {
        errors.push('imageUrl must be a valid HTTP(S) URL or a safe relative uploads path.');
      }
    }
  }

  return errors;
}

/**
 * Validates manual assignment input payload
 * @param {Object} data - req.body
 * @returns {Array<string>} Array of validation error messages, empty if valid
 */
export function validateAssignRequestInput(data) {
  const errors = [];

  if (!data.staffId) {
    errors.push('staffId is required for assignment.');
  } else if (!isValidObjectId(data.staffId)) {
    errors.push('staffId must be a valid MongoDB ObjectId.');
  }

  return errors;
}

/**
 * Validates work note payload
 * @param {Object} data - req.body
 * @returns {Array<string>} Array of validation error messages, empty if valid
 */
export function validateAddNoteInput(data) {
  const errors = [];

  if (!data.notes || typeof data.notes !== 'string' || data.notes.trim().length === 0) {
    errors.push('notes content is required.');
  } else if (data.notes.trim().length > 1000) {
    errors.push('notes content cannot exceed 1000 characters.');
  }

  return errors;
}

/**
 * Validates cancellation payload
 * @param {Object} data - req.body
 * @returns {Array<string>} Array of validation error messages, empty if valid
 */
export function validateCancelRequestInput(data) {
  const errors = [];

  if (data.reason !== undefined && typeof data.reason !== 'string') {
    errors.push('cancellation reason must be a string.');
  } else if (data.reason && data.reason.trim().length > 500) {
    errors.push('cancellation reason cannot exceed 500 characters.');
  }

  return errors;
}
