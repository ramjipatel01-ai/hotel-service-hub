import api from './api.js';

/**
 * Frontend Service Request API Client
 * Centralizes all HTTP communication for service request lifecycle and management.
 */

/**
 * Creates a new guest service request
 * @param {Object} data - { serviceId, priority, quantity, description, specialInstructions, preferredTime, imageUrl }
 * @returns {Promise<Object>} API response
 */
export async function createRequest(data) {
  const response = await api.post('/requests', data);
  return response.data;
}

/**
 * Fetches paginated requests filtered by role and optional query parameters
 * @param {Object} [params] - { status, priority, department, service, assignedStaff, room, startDate, endDate, search, page, limit, assignedToMe }
 * @returns {Promise<Object>} API response
 */
export async function getRequests(params = {}) {
  const response = await api.get('/requests', { params });
  return response.data;
}

/**
 * Fetches request details and full audit history by ID
 * @param {string} id - Request ObjectId
 * @returns {Promise<Object>} API response
 */
export async function getRequestById(id) {
  const response = await api.get(`/requests/${id}`);
  return response.data;
}

/**
 * Staff accepts assigned request
 * @param {string} id - Request ObjectId
 * @param {Object} [data] - { notes }
 * @returns {Promise<Object>} API response
 */
export async function acceptRequest(id, data = {}) {
  const response = await api.patch(`/requests/${id}/accept`, data);
  return response.data;
}

/**
 * Staff starts work on request
 * @param {string} id - Request ObjectId
 * @param {Object} [data] - { notes }
 * @returns {Promise<Object>} API response
 */
export async function startRequest(id, data = {}) {
  const response = await api.patch(`/requests/${id}/start`, data);
  return response.data;
}

/**
 * Staff marks request as completed
 * @param {string} id - Request ObjectId
 * @param {Object} [data] - { notes }
 * @returns {Promise<Object>} API response
 */
export async function completeRequest(id, data = {}) {
  const response = await api.patch(`/requests/${id}/complete`, data);
  return response.data;
}

/**
 * Guest confirms completion
 * @param {string} id - Request ObjectId
 * @param {Object} [data] - { notes }
 * @returns {Promise<Object>} API response
 */
export async function confirmRequest(id, data = {}) {
  const response = await api.patch(`/requests/${id}/confirm`, data);
  return response.data;
}

/**
 * Guest or Admin cancels request
 * @param {string} id - Request ObjectId
 * @param {string} reason - Cancellation reason
 * @returns {Promise<Object>} API response
 */
export async function cancelRequest(id, reason = '') {
  const response = await api.patch(`/requests/${id}/cancel`, { reason });
  return response.data;
}

/**
 * Admin assigns or reassigns staff
 * @param {string} id - Request ObjectId
 * @param {string} staffId - Staff user ObjectId
 * @returns {Promise<Object>} API response
 */
export async function assignRequest(id, staffId) {
  const response = await api.patch(`/requests/${id}/assign`, { staffId });
  return response.data;
}

/**
 * Adds an operational work note to a request
 * @param {string} id - Request ObjectId
 * @param {string} notes - Work note text
 * @returns {Promise<Object>} API response
 */
export async function addRequestNote(id, notes) {
  const response = await api.post(`/requests/${id}/notes`, { notes });
  return response.data;
}

/**
 * Fetches the immutable audit trail for a request
 * @param {string} id - Request ObjectId
 * @returns {Promise<Object>} API response
 */
export async function getRequestHistory(id) {
  const response = await api.get(`/requests/${id}/history`);
  return response.data;
}

/**
 * Admin overrides request priority
 * @param {string} id - Request ObjectId
 * @param {string} priority - LOW, NORMAL, HIGH, URGENT
 * @param {string} [reason] - Reason for priority escalation
 * @returns {Promise<Object>} API response
 */
export async function updateRequestPriority(id, priority, reason = '') {
  const response = await api.patch(`/requests/${id}/priority`, { priority, reason });
  return response.data;
}


export default {
  createRequest,
  getRequests,
  getRequestById,
  acceptRequest,
  startRequest,
  completeRequest,
  confirmRequest,
  cancelRequest,
  assignRequest,
  updateRequestPriority,
  addRequestNote,
  getRequestHistory,
};
