import { Router } from 'express';
import {
  getOverview,
  getTrends,
  getDepartments,
  getStaffPerformance,
  getSLAMonitoring,
  getGuestSatisfaction,
  getTopServices,
  getPriorityDistribution,
  exportReport,
} from '../controllers/analytics.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  validateAnalyticsQuery,
  validateExportQuery,
} from '../validators/analytics.validators.js';

const router = Router();

// All analytics endpoints require authentication and MANAGER or ADMIN role
const requireManagerOrAdmin = [authenticate, authorize(USER_ROLES.MANAGER, USER_ROLES.ADMIN)];

// Executive KPI Overview
router.get('/overview', ...requireManagerOrAdmin, validateAnalyticsQuery, getOverview);

// Request Volume Trends
router.get('/trends', ...requireManagerOrAdmin, validateAnalyticsQuery, getTrends);

// Department Performance & Breakdown
router.get('/departments', ...requireManagerOrAdmin, validateAnalyticsQuery, getDepartments);

// Staff Performance & Leaderboard
router.get('/staff-performance', ...requireManagerOrAdmin, validateAnalyticsQuery, getStaffPerformance);

// Real-Time SLA Monitoring & Overdue Queue
router.get('/sla', ...requireManagerOrAdmin, validateAnalyticsQuery, getSLAMonitoring);

// Guest Satisfaction & Ratings Distribution
router.get('/guest-satisfaction', ...requireManagerOrAdmin, validateAnalyticsQuery, getGuestSatisfaction);

// Top Requested Services
router.get('/top-services', ...requireManagerOrAdmin, validateAnalyticsQuery, getTopServices);

// Priority Distribution Breakdown
router.get('/priority-distribution', ...requireManagerOrAdmin, validateAnalyticsQuery, getPriorityDistribution);

// Report CSV Export
router.get('/export', ...requireManagerOrAdmin, validateExportQuery, validateAnalyticsQuery, exportReport);

export default router;
