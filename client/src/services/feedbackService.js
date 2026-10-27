import api from './api.js';

/**
 * Guest Feedback API Client
 */

/**
 * Submit feedback for a confirmed request
 * @param {Object} data - { requestId, rating, comment }
 * @returns {Promise<Object>} API response
 */
export async function createFeedback(data) {
  const response = await api.post('/feedback', data);
  return response.data;
}

/**
 * Retrieve feedback for a given request
 * @param {string} requestId - Request ObjectId
 * @returns {Promise<Object>} API response
 */
export async function getFeedbackByRequest(requestId) {
  const response = await api.get(`/feedback/request/${requestId}`);
  return response.data;
}

export default {
  createFeedback,
  getFeedbackByRequest,
};
