import * as analyticsService from '../services/analytics.service.js';

/**
 * @route   GET /api/analytics/overview
 * @desc    Get executive KPI metrics (volume, status breakdown, resolution rate, averages)
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getOverview(req, res) {
  try {
    const { period, startDate, endDate, departmentId } = req.query;
    const data = await analyticsService.getAnalyticsOverview({
      period,
      startDate,
      endDate,
      departmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Overview analytics retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Overview Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve overview analytics.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/trends
 * @desc    Get daily time-series request volume trends
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getTrends(req, res) {
  try {
    const { period, startDate, endDate, departmentId } = req.query;
    const data = await analyticsService.getRequestTrends({
      period,
      startDate,
      endDate,
      departmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Request volume trends retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Trends Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve request trends.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/departments
 * @desc    Get departmental performance, volume, and turnaround breakdown
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getDepartments(req, res) {
  try {
    const { period, startDate, endDate } = req.query;
    const data = await analyticsService.getDepartmentAnalytics({
      period,
      startDate,
      endDate,
    });

    return res.status(200).json({
      success: true,
      message: 'Department analytics retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Departments Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve department analytics.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/staff-performance
 * @desc    Get staff leaderboard, completion counts, active loads, and ratings
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getStaffPerformance(req, res) {
  try {
    const { period, startDate, endDate, departmentId } = req.query;
    const data = await analyticsService.getStaffPerformance({
      period,
      startDate,
      endDate,
      departmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Staff performance metrics retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Staff Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve staff performance metrics.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/sla
 * @desc    Get real-time SLA monitoring, overdue requests, and approaching deadlines
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getSLAMonitoring(req, res) {
  try {
    const { departmentId } = req.query;
    const data = await analyticsService.getSLAMonitoring({ departmentId });

    return res.status(200).json({
      success: true,
      message: 'SLA monitoring data retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics SLA Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve SLA monitoring metrics.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/guest-satisfaction
 * @desc    Get guest rating distributions, CSAT averages, and feedback
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getGuestSatisfaction(req, res) {
  try {
    const { period, startDate, endDate, departmentId } = req.query;
    const data = await analyticsService.getGuestSatisfaction({
      period,
      startDate,
      endDate,
      departmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Guest satisfaction metrics retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Satisfaction Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve guest satisfaction data.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/top-services
 * @desc    Get top requested services ranking
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getTopServices(req, res) {
  try {
    const { period, startDate, endDate, departmentId, limit } = req.query;
    const data = await analyticsService.getTopServices({
      period,
      startDate,
      endDate,
      departmentId,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: 'Top services retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Top Services Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve top services.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/priority-distribution
 * @desc    Get request priority distribution and urgent status breakdown
 * @access  Protected (MANAGER, ADMIN)
 */
export async function getPriorityDistribution(req, res) {
  try {
    const { period, startDate, endDate, departmentId } = req.query;
    const data = await analyticsService.getPriorityDistribution({
      period,
      startDate,
      endDate,
      departmentId,
    });

    return res.status(200).json({
      success: true,
      message: 'Priority distribution retrieved successfully',
      data,
    });
  } catch (error) {
    console.error('[Analytics Priority Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve priority distribution.',
      error: error.message,
    });
  }
}

/**
 * @route   GET /api/analytics/export
 * @desc    Export report dataset as CSV with formula injection defense
 * @access  Protected (MANAGER, ADMIN)
 */
export async function exportReport(req, res) {
  try {
    const { type, period, startDate, endDate, departmentId } = req.query;
    const { csvContent, filename } = await analyticsService.exportReportCSV({
      type,
      period,
      startDate,
      endDate,
      departmentId,
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.status(200).send(csvContent);
  } catch (error) {
    console.error('[Analytics Export Error]:', error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to export analytics report.',
      error: error.message,
    });
  }
}
