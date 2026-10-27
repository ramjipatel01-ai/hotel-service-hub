import api from './api.js';

/**
 * Fetch Executive KPI Overview (Volume, Statuses, Turnaround times, Resolution rate)
 */
export async function getAnalyticsOverview(params = {}) {
  const response = await api.get('/analytics/overview', { params });
  return response.data;
}

/**
 * Fetch Request Volume Daily Trends
 */
export async function getRequestTrends(params = {}) {
  const response = await api.get('/analytics/trends', { params });
  return response.data;
}

/**
 * Fetch Departmental Workload & Performance Breakdown
 */
export async function getDepartmentAnalytics(params = {}) {
  const response = await api.get('/analytics/departments', { params });
  return response.data;
}

/**
 * Fetch Staff Workload & Performance Leaderboard
 */
export async function getStaffPerformance(params = {}) {
  const response = await api.get('/analytics/staff-performance', { params });
  return response.data;
}

/**
 * Fetch Real-Time SLA Monitoring & Overdue Queues
 */
export async function getSLAMonitoring(params = {}) {
  const response = await api.get('/analytics/sla', { params });
  return response.data;
}

/**
 * Fetch Guest Satisfaction Ratings & Feedback
 */
export async function getGuestSatisfaction(params = {}) {
  const response = await api.get('/analytics/guest-satisfaction', { params });
  return response.data;
}

/**
 * Fetch Most Frequently Requested Services Ranking
 */
export async function getTopServices(params = {}) {
  const response = await api.get('/analytics/top-services', { params });
  return response.data;
}

/**
 * Fetch Request Priority Distribution
 */
export async function getPriorityDistribution(params = {}) {
  const response = await api.get('/analytics/priority-distribution', { params });
  return response.data;
}

/**
 * Download Report as CSV
 */
export async function downloadReportCSV(params = {}) {
  const response = await api.get('/analytics/export', {
    params,
    responseType: 'blob',
  });

  const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Extract filename from header or use default
  const disposition = response.headers?.['content-disposition'];
  let filename = `report-${params.type || 'requests'}-${Date.now()}.csv`;
  if (disposition && disposition.indexOf('filename=') !== -1) {
    const matches = /filename="?([^"]+)"?/.exec(disposition);
    if (matches && matches[1]) {
      filename = matches[1];
    }
  }

  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);

  return { success: true, filename };
}
