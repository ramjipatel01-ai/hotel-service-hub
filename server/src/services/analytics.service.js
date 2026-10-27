import mongoose from 'mongoose';
import Request from '../models/Request.js';
import Department from '../models/Department.js';
import Service from '../models/Service.js';
import User from '../models/User.js';
import Feedback from '../models/Feedback.js';
import { REQUEST_STATUS, REQUEST_PRIORITY, USER_ROLES } from '../config/constants.js';

/**
 * Resolves standard date ranges based on period preset or custom dates.
 * Dates are handled in UTC / ISO format to prevent off-by-one errors.
 *
 * @param {string} period - 'today' | 'last7days' | 'last30days' | 'thisMonth' | 'previousMonth' | 'custom'
 * @param {string|Date} startDate
 * @param {string|Date} endDate
 * @returns {{ start: Date, end: Date, periodName: string }}
 */
export function resolveDateRange(period = 'last30days', startDate = null, endDate = null) {
  const now = new Date();

  if (startDate && endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    // If user passed a date-only string like YYYY-MM-DD, set end to end of that day
    if (typeof endDate === 'string' && endDate.length <= 10) {
      end.setUTCHours(23, 59, 59, 999);
    }
    return { start, end, periodName: 'custom' };
  }

  let start;
  let end = new Date(now);

  switch (period) {
    case 'today': {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
      break;
    }
    case 'last7days': {
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      start.setUTCHours(0, 0, 0, 0);
      break;
    }
    case 'thisMonth': {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
      break;
    }
    case 'previousMonth': {
      start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1, 0, 0, 0, 0));
      // Last day of previous month
      end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
      break;
    }
    case 'last30days':
    default: {
      start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      start.setUTCHours(0, 0, 0, 0);
      break;
    }
  }

  return { start, end, periodName: period || 'last30days' };
}

/**
 * Builds base match query applying date range and optional department filter
 */
function buildBaseMatch(dateRange, departmentId, dateField = 'createdAt') {
  const match = {
    [dateField]: { $gte: dateRange.start, $lte: dateRange.end },
  };

  if (departmentId) {
    match.department = new mongoose.Types.ObjectId(departmentId);
  }

  return match;
}

/**
 * 1. Overview KPIs
 * Calculates totals, status breakdown, resolution rates, average turnaround times, and overdue count.
 */
export async function getAnalyticsOverview({ period, startDate, endDate, departmentId }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const match = buildBaseMatch(dateRange, departmentId, 'createdAt');

  const [statsResult] = await Request.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.PENDING] }, 1, 0] },
        },
        assigned: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.ASSIGNED] }, 1, 0] },
        },
        accepted: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.ACCEPTED] }, 1, 0] },
        },
        inProgress: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.IN_PROGRESS] }, 1, 0] },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.COMPLETED] }, 1, 0] },
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.CONFIRMED] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.CANCELLED] }, 1, 0] },
        },
        urgent: {
          $sum: { $cond: [{ $eq: ['$priority', REQUEST_PRIORITY.URGENT] }, 1, 0] },
        },
        // Turnaround Time calculations (only count valid non-negative durations)
        validResponseDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$acceptedAt', null] },
                  { $gte: ['$acceptedAt', '$createdAt'] },
                ],
              },
              {
                $divide: [
                  { $subtract: ['$acceptedAt', '$createdAt'] },
                  60000, // Convert ms to minutes
                ],
              },
              '$$REMOVE',
            ],
          },
        },
        validCompletionDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$completedAt', null] },
                  { $gte: ['$completedAt', '$createdAt'] },
                ],
              },
              {
                $divide: [
                  { $subtract: ['$completedAt', '$createdAt'] },
                  60000, // Convert ms to minutes
                ],
              },
              '$$REMOVE',
            ],
          },
        },
      },
    },
  ]);

  const raw = statsResult || {
    total: 0,
    pending: 0,
    assigned: 0,
    accepted: 0,
    inProgress: 0,
    completed: 0,
    confirmed: 0,
    cancelled: 0,
    urgent: 0,
    validResponseDurations: [],
    validCompletionDurations: [],
  };

  const total = raw.total;
  const activeInProgress = raw.accepted + raw.inProgress;
  const resolved = raw.completed + raw.confirmed;

  // Resolution Rate formula: (completed + confirmed) / total * 100
  // Handled safely without NaN or Infinity
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
  const completionRate = total > 0 ? Math.round((raw.completed / total) * 100) : 0;
  const cancellationRate = total > 0 ? Math.round((raw.cancelled / total) * 100) : 0;

  // Average response time in minutes
  const respTimes = raw.validResponseDurations || [];
  const avgResponseTime = respTimes.length > 0
    ? Math.round((respTimes.reduce((acc, v) => acc + v, 0) / respTimes.length) * 10) / 10
    : null;

  // Average completion time in minutes
  const compTimes = raw.validCompletionDurations || [];
  const avgCompletionTime = compTimes.length > 0
    ? Math.round((compTimes.reduce((acc, v) => acc + v, 0) / compTimes.length) * 10) / 10
    : null;

  // Calculate current outstanding overdue requests
  const now = new Date();
  const overdueMatch = {
    status: {
      $in: [
        REQUEST_STATUS.PENDING,
        REQUEST_STATUS.ASSIGNED,
        REQUEST_STATUS.ACCEPTED,
        REQUEST_STATUS.IN_PROGRESS,
      ],
    },
  };
  if (departmentId) {
    overdueMatch.department = new mongoose.Types.ObjectId(departmentId);
  }

  const activeRequests = await Request.find(overdueMatch)
    .populate('service', 'estimatedDurationMinutes')
    .select('createdAt service')
    .lean();

  let overdueCount = 0;
  activeRequests.forEach((req) => {
    const durationMinutes = req.service?.estimatedDurationMinutes || 30;
    const elapsedMinutes = (now.getTime() - new Date(req.createdAt).getTime()) / 60000;
    if (elapsedMinutes > durationMinutes) {
      overdueCount++;
    }
  });

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    totalRequests: total,
    pendingRequests: raw.pending,
    assignedRequests: raw.assigned,
    inProgressRequests: activeInProgress,
    completedRequests: raw.completed,
    confirmedRequests: raw.confirmed,
    resolvedRequests: resolved,
    cancelledRequests: raw.cancelled,
    urgentRequests: raw.urgent,
    resolutionRate,
    completionRate,
    cancellationRate,
    avgResponseTimeMinutes: avgResponseTime,
    avgCompletionTimeMinutes: avgCompletionTime,
    outstandingOverdueRequests: overdueCount,
    responseObservationCount: respTimes.length,
    completionObservationCount: compTimes.length,
  };
}

/**
 * 2. Request Volume Trends
 * Daily time series grouping for created, completed, confirmed, and cancelled counts.
 */
export async function getRequestTrends({ period, startDate, endDate, departmentId }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const match = buildBaseMatch(dateRange, departmentId, 'createdAt');

  // Aggregation for daily created requests
  const createdDaily = await Request.aggregate([
    { $match: match },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // Aggregation for daily completed requests (using completedAt timestamp)
  const completedMatch = {
    completedAt: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (departmentId) {
    completedMatch.department = new mongoose.Types.ObjectId(departmentId);
  }
  const completedDaily = await Request.aggregate([
    { $match: completedMatch },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$completedAt' },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Aggregation for daily confirmed requests (using confirmedAt timestamp)
  const confirmedMatch = {
    confirmedAt: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (departmentId) {
    confirmedMatch.department = new mongoose.Types.ObjectId(departmentId);
  }
  const confirmedDaily = await Request.aggregate([
    { $match: confirmedMatch },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$confirmedAt' },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Aggregation for daily cancelled requests (using cancelledAt timestamp)
  const cancelledMatch = {
    cancelledAt: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (departmentId) {
    cancelledMatch.department = new mongoose.Types.ObjectId(departmentId);
  }
  const cancelledDaily = await Request.aggregate([
    { $match: cancelledMatch },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$cancelledAt' },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  // Map results by date string
  const createdMap = new Map(createdDaily.map((d) => [d._id, d.count]));
  const completedMap = new Map(completedDaily.map((d) => [d._id, d.count]));
  const confirmedMap = new Map(confirmedDaily.map((d) => [d._id, d.count]));
  const cancelledMap = new Map(cancelledDaily.map((d) => [d._id, d.count]));

  // Build continuous day-by-day array from start to end
  const trends = [];
  const current = new Date(dateRange.start);
  const endLimit = new Date(dateRange.end);

  while (current <= endLimit) {
    const dateStr = current.toISOString().slice(0, 10);
    trends.push({
      date: dateStr,
      created: createdMap.get(dateStr) || 0,
      completed: completedMap.get(dateStr) || 0,
      confirmed: confirmedMap.get(dateStr) || 0,
      cancelled: cancelledMap.get(dateStr) || 0,
    });
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    trends,
  };
}

/**
 * 3. Department Performance Breakdown
 * Metrics grouped by department, including turnaround times and resolution rates.
 */
export async function getDepartmentAnalytics({ period, startDate, endDate }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const match = buildBaseMatch(dateRange, null, 'createdAt');

  // Aggregation per department
  const deptAggregates = await Request.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$department',
        totalRequests: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.PENDING] }, 1, 0] },
        },
        assigned: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.ASSIGNED] }, 1, 0] },
        },
        inProgress: {
          $sum: {
            $cond: [
              { $in: ['$status', [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS]] },
              1,
              0,
            ],
          },
        },
        completed: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.COMPLETED] }, 1, 0] },
        },
        confirmed: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.CONFIRMED] }, 1, 0] },
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$status', REQUEST_STATUS.CANCELLED] }, 1, 0] },
        },
        urgent: {
          $sum: { $cond: [{ $eq: ['$priority', REQUEST_PRIORITY.URGENT] }, 1, 0] },
        },
        validResponseDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$acceptedAt', null] },
                  { $gte: ['$acceptedAt', '$createdAt'] },
                ],
              },
              {
                $divide: [{ $subtract: ['$acceptedAt', '$createdAt'] }, 60000],
              },
              '$$REMOVE',
            ],
          },
        },
        validCompletionDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$completedAt', null] },
                  { $gte: ['$completedAt', '$createdAt'] },
                ],
              },
              {
                $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 60000],
              },
              '$$REMOVE',
            ],
          },
        },
      },
    },
  ]);

  // Fetch all departments (to preserve historical and active departments with 0 requests)
  const allDepartments = await Department.find({}).lean();
  const aggMap = new Map(deptAggregates.map((a) => [String(a._id), a]));

  const departments = allDepartments.map((dept) => {
    const agg = aggMap.get(String(dept._id));
    const total = agg ? agg.totalRequests : 0;
    const completed = agg ? agg.completed : 0;
    const confirmed = agg ? agg.confirmed : 0;
    const resolved = completed + confirmed;
    const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;

    const respTimes = agg?.validResponseDurations || [];
    const avgResponse = respTimes.length > 0
      ? Math.round((respTimes.reduce((a, b) => a + b, 0) / respTimes.length) * 10) / 10
      : null;

    const compTimes = agg?.validCompletionDurations || [];
    const avgCompletion = compTimes.length > 0
      ? Math.round((compTimes.reduce((a, b) => a + b, 0) / compTimes.length) * 10) / 10
      : null;

    return {
      departmentId: dept._id,
      name: dept.name,
      code: dept.code,
      icon: dept.icon || 'Building',
      isActive: dept.isActive,
      totalRequests: total,
      pendingRequests: agg ? agg.pending : 0,
      assignedRequests: agg ? agg.assigned : 0,
      inProgressRequests: agg ? agg.inProgress : 0,
      completedRequests: completed,
      confirmedRequests: confirmed,
      cancelledRequests: agg ? agg.cancelled : 0,
      urgentRequests: agg ? agg.urgent : 0,
      resolutionRate,
      avgResponseTimeMinutes: avgResponse,
      avgCompletionTimeMinutes: avgCompletion,
    };
  });

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    departments,
  };
}

/**
 * 4. Staff Performance & Workload Leaderboard
 * Metrics for each staff member including assigned load, completed tickets, turnaround, and guest ratings.
 */
export async function getStaffPerformance({ period, startDate, endDate, departmentId }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const staffFilter = { role: USER_ROLES.STAFF };
  if (departmentId) {
    staffFilter.department = new mongoose.Types.ObjectId(departmentId);
  }

  const staffMembers = await User.find(staffFilter)
    .populate('department', 'name code')
    .select('name email department isOnDuty isActive')
    .lean();

  const staffIds = staffMembers.map((s) => s._id);

  // Aggregation of request performance per staff member within the date range
  const requestAgg = await Request.aggregate([
    {
      $match: {
        assignedStaff: { $in: staffIds },
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    {
      $group: {
        _id: '$assignedStaff',
        assignedCount: { $sum: 1 },
        completedCount: {
          $sum: {
            $cond: [
              { $in: ['$status', [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CONFIRMED]] },
              1,
              0,
            ],
          },
        },
        validResponseDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$acceptedAt', null] },
                  { $gte: ['$acceptedAt', '$createdAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$acceptedAt', '$createdAt'] }, 60000] },
              '$$REMOVE',
            ],
          },
        },
        validCompletionDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$completedAt', null] },
                  { $gte: ['$completedAt', '$createdAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 60000] },
              '$$REMOVE',
            ],
          },
        },
      },
    },
  ]);

  // Current active workload (independent of date range, representing real-time state)
  const activeWorkloadAgg = await Request.aggregate([
    {
      $match: {
        assignedStaff: { $in: staffIds },
        status: {
          $in: [REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.IN_PROGRESS],
        },
      },
    },
    {
      $group: {
        _id: '$assignedStaff',
        activeCount: { $sum: 1 },
      },
    },
  ]);

  // Feedback ratings aggregation per staff member
  const feedbackAgg = await Feedback.aggregate([
    {
      $match: {
        staff: { $in: staffIds },
        createdAt: { $gte: dateRange.start, $lte: dateRange.end },
      },
    },
    {
      $group: {
        _id: '$staff',
        totalRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
  ]);

  const reqMap = new Map(requestAgg.map((r) => [String(r._id), r]));
  const activeMap = new Map(activeWorkloadAgg.map((a) => [String(a._id), a.activeCount]));
  const feedbackMap = new Map(feedbackAgg.map((f) => [String(f._id), f]));

  const staffPerformance = staffMembers.map((staff) => {
    const sId = String(staff._id);
    const rData = reqMap.get(sId);
    const activeLoad = activeMap.get(sId) || 0;
    const fData = feedbackMap.get(sId);

    const respTimes = rData?.validResponseDurations || [];
    const avgResponse = respTimes.length > 0
      ? Math.round((respTimes.reduce((a, b) => a + b, 0) / respTimes.length) * 10) / 10
      : null;

    const compTimes = rData?.validCompletionDurations || [];
    const avgCompletion = compTimes.length > 0
      ? Math.round((compTimes.reduce((a, b) => a + b, 0) / compTimes.length) * 10) / 10
      : null;

    const avgRating = fData ? Math.round(fData.avgRating * 10) / 10 : null;
    const ratingCount = fData ? fData.totalRatings : 0;

    return {
      staffId: staff._id,
      name: staff.name,
      email: staff.email,
      departmentName: staff.department?.name || 'Unassigned',
      departmentCode: staff.department?.code || 'N/A',
      isOnDuty: Boolean(staff.isOnDuty),
      isActive: Boolean(staff.isActive),
      requestsAssigned: rData ? rData.assignedCount : 0,
      requestsCompleted: rData ? rData.completedCount : 0,
      currentActiveWorkload: activeLoad,
      avgResponseTimeMinutes: avgResponse,
      avgCompletionTimeMinutes: avgCompletion,
      avgRating,
      ratingCount,
    };
  });

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    staffPerformance,
  };
}

/**
 * 5. SLA Monitoring & Escalation
 * Detects overdue and approaching-deadline requests using configured Service estimated durations.
 */
export async function getSLAMonitoring({ departmentId }) {
  const now = new Date();
  const activeMatch = {
    status: {
      $in: [
        REQUEST_STATUS.PENDING,
        REQUEST_STATUS.ASSIGNED,
        REQUEST_STATUS.ACCEPTED,
        REQUEST_STATUS.IN_PROGRESS,
      ],
    },
  };
  if (departmentId) {
    activeMatch.department = new mongoose.Types.ObjectId(departmentId);
  }

  const activeRequests = await Request.find(activeMatch)
    .populate('service', 'name estimatedDurationMinutes defaultPriority')
    .populate('department', 'name code')
    .populate('room', 'roomNumber floor')
    .populate('assignedStaff', 'name email isOnDuty')
    .populate('guest', 'name')
    .sort({ createdAt: 1 })
    .lean();

  const overdueRequests = [];
  const approachingRequests = [];
  const onTrackRequests = [];

  activeRequests.forEach((req) => {
    const estimatedMinutes = req.service?.estimatedDurationMinutes || 30;
    const thresholdMs = estimatedMinutes * 60 * 1000;
    const elapsedMs = now.getTime() - new Date(req.createdAt).getTime();
    const elapsedMinutes = Math.round(elapsedMs / 60000);
    const deadline = new Date(new Date(req.createdAt).getTime() + thresholdMs);

    const item = {
      requestId: req._id,
      requestNumber: req.requestNumber,
      serviceTitle: req.serviceTitle || req.service?.name || 'General Service',
      departmentName: req.department?.name || 'Unassigned',
      departmentCode: req.department?.code || 'N/A',
      roomNumber: req.room?.roomNumber || 'N/A',
      guestName: req.guest?.name || 'Guest',
      assignedStaffName: req.assignedStaff?.name || 'Unassigned',
      priority: req.priority,
      status: req.status,
      createdAt: req.createdAt,
      deadline: deadline.toISOString(),
      estimatedDurationMinutes: estimatedMinutes,
      elapsedMinutes,
      overdueMinutes: elapsedMs > thresholdMs ? Math.round((elapsedMs - thresholdMs) / 60000) : 0,
      slaStatus:
        elapsedMs > thresholdMs
          ? 'OVERDUE'
          : elapsedMs >= 0.75 * thresholdMs
          ? 'APPROACHING'
          : 'ON_TRACK',
    };

    if (item.slaStatus === 'OVERDUE') {
      overdueRequests.push(item);
    } else if (item.slaStatus === 'APPROACHING') {
      approachingRequests.push(item);
    } else {
      onTrackRequests.push(item);
    }
  });

  return {
    overdueCount: overdueRequests.length,
    approachingCount: approachingRequests.length,
    onTrackCount: onTrackRequests.length,
    totalActiveMonitored: activeRequests.length,
    overdueRequests,
    approachingRequests,
    onTrackRequests,
  };
}

/**
 * 6. Guest Satisfaction Ratings
 * Aggregates Feedback collection: averages, rating distribution, and department breakdown.
 */
export async function getGuestSatisfaction({ period, startDate, endDate, departmentId }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const match = {
    createdAt: { $gte: dateRange.start, $lte: dateRange.end },
  };
  if (departmentId) {
    match.department = new mongoose.Types.ObjectId(departmentId);
  }

  // Aggregate overall rating and star counts
  const [overallResult] = await Feedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        totalRatings: { $sum: 1 },
        avgRating: { $avg: '$rating' },
        star1: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } },
        star2: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
        star3: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
        star4: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
        star5: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]);

  const raw = overallResult || {
    totalRatings: 0,
    avgRating: null,
    star1: 0,
    star2: 0,
    star3: 0,
    star4: 0,
    star5: 0,
  };

  const total = raw.totalRatings;
  const ratingDistribution = [
    { stars: 5, count: raw.star5, percentage: total > 0 ? Math.round((raw.star5 / total) * 100) : 0 },
    { stars: 4, count: raw.star4, percentage: total > 0 ? Math.round((raw.star4 / total) * 100) : 0 },
    { stars: 3, count: raw.star3, percentage: total > 0 ? Math.round((raw.star3 / total) * 100) : 0 },
    { stars: 2, count: raw.star2, percentage: total > 0 ? Math.round((raw.star2 / total) * 100) : 0 },
    { stars: 1, count: raw.star1, percentage: total > 0 ? Math.round((raw.star1 / total) * 100) : 0 },
  ];

  // Department-level feedback rating
  const deptFeedbackAgg = await Feedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$department',
        count: { $sum: 1 },
        avgRating: { $avg: '$rating' },
      },
    },
    {
      $lookup: {
        from: 'departments',
        localField: '_id',
        foreignField: '_id',
        as: 'dept',
      },
    },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    {
      $project: {
        departmentId: '$_id',
        departmentName: { $ifNull: ['$dept.name', 'Unassigned'] },
        count: 1,
        avgRating: { $round: ['$avgRating', 1] },
      },
    },
    { $sort: { avgRating: -1 } },
  ]);

  // Recent reviews with privacy protection
  const recentFeedback = await Feedback.find(match)
    .populate('guest', 'name')
    .populate('department', 'name')
    .populate({
      path: 'request',
      select: 'requestNumber serviceTitle room',
      populate: { path: 'room', select: 'roomNumber' },
    })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const sanitizedFeedback = recentFeedback.map((f) => ({
    id: f._id,
    rating: f.rating,
    comment: f.comment,
    guestName: f.guest?.name || 'Guest',
    serviceTitle: f.request?.serviceTitle || 'Service',
    roomNumber: f.request?.room?.roomNumber || 'N/A',
    departmentName: f.department?.name || 'N/A',
    createdAt: f.createdAt,
  }));

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    averageRating: raw.avgRating ? Math.round(raw.avgRating * 10) / 10 : null,
    totalRatings: total,
    ratingDistribution,
    departmentRatings: deptFeedbackAgg,
    recentFeedback: sanitizedFeedback,
  };
}

/**
 * 7. Top Requested Services
 * Ranking of services by request frequency.
 */
export async function getTopServices({ period, startDate, endDate, departmentId, limit = 10 }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const match = buildBaseMatch(dateRange, departmentId, 'createdAt');

  const topServicesAgg = await Request.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$serviceTitle',
        serviceId: { $first: '$service' },
        departmentId: { $first: '$department' },
        count: { $sum: 1 },
        validCompletionDurations: {
          $push: {
            $cond: [
              {
                $and: [
                  { $ne: ['$completedAt', null] },
                  { $gte: ['$completedAt', '$createdAt'] },
                ],
              },
              { $divide: [{ $subtract: ['$completedAt', '$createdAt'] }, 60000] },
              '$$REMOVE',
            ],
          },
        },
      },
    },
    { $sort: { count: -1 } },
    { $limit: Number(limit) || 10 },
    {
      $lookup: {
        from: 'departments',
        localField: 'departmentId',
        foreignField: '_id',
        as: 'dept',
      },
    },
    { $unwind: { path: '$dept', preserveNullAndEmptyArrays: true } },
    {
      $lookup: {
        from: 'services',
        localField: 'serviceId',
        foreignField: '_id',
        as: 'svc',
      },
    },
    { $unwind: { path: '$svc', preserveNullAndEmptyArrays: true } },
  ]);

  const totalCount = await Request.countDocuments(match);

  const topServices = topServicesAgg.map((item) => {
    const compTimes = item.validCompletionDurations || [];
    const avgComp = compTimes.length > 0
      ? Math.round((compTimes.reduce((a, b) => a + b, 0) / compTimes.length) * 10) / 10
      : null;

    return {
      serviceTitle: item._id,
      departmentName: item.dept?.name || 'Unassigned',
      category: item.svc?.category || 'GENERAL',
      count: item.count,
      sharePercentage: totalCount > 0 ? Math.round((item.count / totalCount) * 100) : 0,
      avgCompletionTimeMinutes: avgComp,
    };
  });

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    totalRequests: totalCount,
    topServices,
  };
}

/**
 * 8. Request Priority Distribution
 * Volume breakdown across LOW, NORMAL, HIGH, URGENT.
 */
export async function getPriorityDistribution({ period, startDate, endDate, departmentId }) {
  const dateRange = resolveDateRange(period, startDate, endDate);
  const match = buildBaseMatch(dateRange, departmentId, 'createdAt');

  const priorityAgg = await Request.aggregate([
    { $match: match },
    {
      $group: {
        _id: '$priority',
        count: { $sum: 1 },
      },
    },
  ]);

  const total = await Request.countDocuments(match);
  const aggMap = new Map(priorityAgg.map((p) => [p._id, p.count]));

  const distribution = [
    {
      priority: REQUEST_PRIORITY.LOW,
      count: aggMap.get(REQUEST_PRIORITY.LOW) || 0,
      percentage: total > 0 ? Math.round(((aggMap.get(REQUEST_PRIORITY.LOW) || 0) / total) * 100) : 0,
    },
    {
      priority: REQUEST_PRIORITY.NORMAL,
      count: aggMap.get(REQUEST_PRIORITY.NORMAL) || 0,
      percentage: total > 0 ? Math.round(((aggMap.get(REQUEST_PRIORITY.NORMAL) || 0) / total) * 100) : 0,
    },
    {
      priority: REQUEST_PRIORITY.HIGH,
      count: aggMap.get(REQUEST_PRIORITY.HIGH) || 0,
      percentage: total > 0 ? Math.round(((aggMap.get(REQUEST_PRIORITY.HIGH) || 0) / total) * 100) : 0,
    },
    {
      priority: REQUEST_PRIORITY.URGENT,
      count: aggMap.get(REQUEST_PRIORITY.URGENT) || 0,
      percentage: total > 0 ? Math.round(((aggMap.get(REQUEST_PRIORITY.URGENT) || 0) / total) * 100) : 0,
    },
  ];

  // Urgent requests breakdown by status
  const urgentMatch = { ...match, priority: REQUEST_PRIORITY.URGENT };
  const urgentByStatus = await Request.aggregate([
    { $match: urgentMatch },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    period: dateRange.periodName,
    startDate: dateRange.start.toISOString(),
    endDate: dateRange.end.toISOString(),
    totalRequests: total,
    distribution,
    urgentStatusBreakdown: urgentByStatus.map((u) => ({ status: u._id, count: u.count })),
  };
}

/**
 * Sanitizes a cell string to prevent CSV formula injection (OWASP guideline).
 * Prepends a single quote if the first character is =, +, -, @, \t, or \r.
 */
export function sanitizeCSVCell(value) {
  if (value === null || value === undefined) return '';
  let str = String(value);

  // Check formula injection triggers
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // RFC-4180 escaping: wrap in double quotes if it contains commas, double quotes, or newlines
  if (/[",\n\r]/.test(str)) {
    str = `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * 9. Export Report to CSV
 * Exports filtered dataset safely with formula injection protection.
 */
export async function exportReportCSV({ type = 'requests', period, startDate, endDate, departmentId }) {
  const dateRange = resolveDateRange(period, startDate, endDate);

  if (type === 'departments') {
    const data = await getDepartmentAnalytics({ period, startDate, endDate });
    const headers = [
      'Department Name',
      'Code',
      'Active Status',
      'Total Requests',
      'Pending',
      'Assigned',
      'In Progress',
      'Completed',
      'Confirmed',
      'Cancelled',
      'Urgent',
      'Resolution Rate (%)',
      'Avg Response (min)',
      'Avg Completion (min)',
    ];

    const rows = data.departments.map((d) => [
      d.name,
      d.code,
      d.isActive ? 'Active' : 'Inactive',
      d.totalRequests,
      d.pendingRequests,
      d.assignedRequests,
      d.inProgressRequests,
      d.completedRequests,
      d.confirmedRequests,
      d.cancelledRequests,
      d.urgentRequests,
      `${d.resolutionRate}%`,
      d.avgResponseTimeMinutes !== null ? d.avgResponseTimeMinutes : 'N/A',
      d.avgCompletionTimeMinutes !== null ? d.avgCompletionTimeMinutes : 'N/A',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map(sanitizeCSVCell).join(','))].join('\r\n');
    return { csvContent, filename: `departments-report-${Date.now()}.csv` };
  }

  if (type === 'staff') {
    const data = await getStaffPerformance({ period, startDate, endDate, departmentId });
    const headers = [
      'Staff Name',
      'Email',
      'Department',
      'Duty Status',
      'Account Active',
      'Requests Assigned',
      'Requests Completed',
      'Active Workload',
      'Avg Response (min)',
      'Avg Completion (min)',
      'Avg Rating',
      'Total Ratings',
    ];

    const rows = data.staffPerformance.map((s) => [
      s.name,
      s.email,
      s.departmentName,
      s.isOnDuty ? 'On Duty' : 'Off Duty',
      s.isActive ? 'Active' : 'Inactive',
      s.requestsAssigned,
      s.requestsCompleted,
      s.currentActiveWorkload,
      s.avgResponseTimeMinutes !== null ? s.avgResponseTimeMinutes : 'N/A',
      s.avgCompletionTimeMinutes !== null ? s.avgCompletionTimeMinutes : 'N/A',
      s.avgRating !== null ? `${s.avgRating}/5.0` : 'N/A',
      s.ratingCount,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map(sanitizeCSVCell).join(','))].join('\r\n');
    return { csvContent, filename: `staff-performance-${Date.now()}.csv` };
  }

  if (type === 'sla') {
    const data = await getSLAMonitoring({ departmentId });
    const allItems = [...data.overdueRequests, ...data.approachingRequests, ...data.onTrackRequests];
    const headers = [
      'Request #',
      'Service',
      'Department',
      'Room',
      'Priority',
      'Status',
      'Staff Assignee',
      'Created Time (UTC)',
      'SLA Threshold (min)',
      'Elapsed (min)',
      'Overdue (min)',
      'SLA Status',
    ];

    const rows = allItems.map((r) => [
      r.requestNumber,
      r.serviceTitle,
      r.departmentName,
      r.roomNumber,
      r.priority,
      r.status,
      r.assignedStaffName,
      new Date(r.createdAt).toISOString(),
      r.estimatedDurationMinutes,
      r.elapsedMinutes,
      r.overdueMinutes,
      r.slaStatus,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map(sanitizeCSVCell).join(','))].join('\r\n');
    return { csvContent, filename: `sla-report-${Date.now()}.csv` };
  }

  // Default: Detailed Requests Report
  const match = buildBaseMatch(dateRange, departmentId, 'createdAt');
  const requests = await Request.find(match)
    .populate('department', 'name code')
    .populate('room', 'roomNumber')
    .populate('assignedStaff', 'name')
    .populate('guest', 'name')
    .sort({ createdAt: -1 })
    .limit(1000)
    .lean();

  const headers = [
    'Request #',
    'Service',
    'Department',
    'Room',
    'Priority',
    'Status',
    'Assigned Staff',
    'Guest Name',
    'Created At',
    'Accepted At',
    'Completed At',
    'Response Time (min)',
    'Completion Time (min)',
  ];

  const rows = requests.map((r) => {
    let respMin = 'N/A';
    if (r.acceptedAt && r.createdAt && new Date(r.acceptedAt) >= new Date(r.createdAt)) {
      respMin = Math.round((new Date(r.acceptedAt) - new Date(r.createdAt)) / 60000);
    }

    let compMin = 'N/A';
    if (r.completedAt && r.createdAt && new Date(r.completedAt) >= new Date(r.createdAt)) {
      compMin = Math.round((new Date(r.completedAt) - new Date(r.createdAt)) / 60000);
    }

    return [
      r.requestNumber,
      r.serviceTitle,
      r.department?.name || 'Unassigned',
      r.room?.roomNumber || 'N/A',
      r.priority,
      r.status,
      r.assignedStaff?.name || 'Unassigned',
      r.guest?.name || 'Guest',
      r.createdAt ? new Date(r.createdAt).toISOString() : 'N/A',
      r.acceptedAt ? new Date(r.acceptedAt).toISOString() : 'N/A',
      r.completedAt ? new Date(r.completedAt).toISOString() : 'N/A',
      respMin,
      compMin,
    ];
  });

  const csvContent = [headers.join(','), ...rows.map((r) => r.map(sanitizeCSVCell).join(','))].join('\r\n');
  return { csvContent, filename: `requests-report-${Date.now()}.csv` };
}
