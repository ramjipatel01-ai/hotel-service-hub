import RequestHistory from '../models/RequestHistory.js';
import { HISTORY_ACTION } from '../config/constants.js';

/**
 * Creates an immutable audit trail entry in RequestHistory
 *
 * @param {Object} options
 * @param {string|mongoose.Types.ObjectId} options.requestId - Target request ID
 * @param {string|mongoose.Types.ObjectId} options.performedBy - User ID of actor
 * @param {string|null} [options.previousStatus=null] - Previous request status
 * @param {string} options.newStatus - New request status
 * @param {string} options.action - Action enum from HISTORY_ACTION
 * @param {string|null} [options.notes=null] - Operational notes or reasoning
 * @param {mongoose.ClientSession|null} [options.session=null] - Optional MongoDB transaction session
 * @returns {Promise<Object>} Created RequestHistory document
 */
export async function createAuditRecord({
  requestId,
  performedBy,
  previousStatus = null,
  newStatus,
  action,
  notes = null,
  session = null,
}) {
  if (!requestId) {
    throw new Error('Audit record requires a valid requestId.');
  }
  if (!performedBy) {
    throw new Error('Audit record requires a valid performedBy user ID.');
  }
  if (!newStatus) {
    throw new Error('Audit record requires a valid newStatus.');
  }
  if (!action || !Object.values(HISTORY_ACTION).includes(action)) {
    throw new Error(`Invalid audit action "${action}". Must be a valid HISTORY_ACTION.`);
  }

  const historyEntry = new RequestHistory({
    request: requestId,
    performedBy,
    previousStatus,
    newStatus,
    action,
    notes: notes ? notes.trim() : null,
    timestamp: new Date(),
  });

  if (session) {
    return await historyEntry.save({ session });
  }

  return await historyEntry.save();
}

/**
 * Fetches the immutable history trail for a request ordered chronologically
 *
 * @param {string|mongoose.Types.ObjectId} requestId
 * @returns {Promise<Array<Object>>}
 */
export async function getRequestHistoryTrail(requestId) {
  return await RequestHistory.find({ request: requestId })
    .populate('performedBy', 'name email role')
    .sort({ timestamp: 1 })
    .lean();
}
