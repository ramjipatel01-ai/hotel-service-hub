import { isValidObjectId } from '../utils/dbUtils.js';

const ALLOWED_PERIODS = ['today', 'last7days', 'last30days', 'thisMonth', 'previousMonth', 'custom'];
const ALLOWED_EXPORT_TYPES = ['requests', 'departments', 'staff', 'sla'];

/**
 * Validates query parameters for analytics endpoints:
 * period, startDate, endDate, departmentId
 */
export function validateAnalyticsQuery(req, res, next) {
  const { period, startDate, endDate, departmentId } = req.query;
  const errors = [];

  // Validate period if supplied
  if (period && !ALLOWED_PERIODS.includes(period)) {
    errors.push(`Invalid period "${period}". Must be one of: ${ALLOWED_PERIODS.join(', ')}.`);
  }

  // Validate departmentId if supplied
  if (departmentId && !isValidObjectId(departmentId)) {
    errors.push(`Invalid departmentId "${departmentId}". Must be a valid 24-character hexadecimal ObjectId.`);
  }

  // Validate custom date range
  if (startDate || endDate) {
    if (startDate) {
      const parsedStart = new Date(startDate);
      if (isNaN(parsedStart.getTime())) {
        errors.push(`Invalid startDate "${startDate}". Must be a valid ISO-8601 date string.`);
      }
    }

    if (endDate) {
      const parsedEnd = new Date(endDate);
      if (isNaN(parsedEnd.getTime())) {
        errors.push(`Invalid endDate "${endDate}". Must be a valid ISO-8601 date string.`);
      }
    }

    if (startDate && endDate) {
      const parsedStart = new Date(startDate);
      const parsedEnd = new Date(endDate);
      if (!isNaN(parsedStart.getTime()) && !isNaN(parsedEnd.getTime())) {
        if (parsedStart > parsedEnd) {
          errors.push('startDate cannot be chronologically later than endDate.');
        }

        // Limit maximum date range to 366 days to protect aggregation performance
        const maxRangeMs = 366 * 24 * 60 * 60 * 1000;
        if (parsedEnd.getTime() - parsedStart.getTime() > maxRangeMs) {
          errors.push('Date range exceeds maximum allowed limit of 366 days.');
        }
      }
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed for analytics parameters.',
      errors,
    });
  }

  next();
}

/**
 * Validates export parameters
 */
export function validateExportQuery(req, res, next) {
  const { type } = req.query;
  if (type && !ALLOWED_EXPORT_TYPES.includes(type)) {
    return res.status(400).json({
      success: false,
      message: `Invalid export type "${type}". Allowed types: ${ALLOWED_EXPORT_TYPES.join(', ')}.`,
      errors: [`Type must be one of: ${ALLOWED_EXPORT_TYPES.join(', ')}`],
    });
  }
  next();
}
