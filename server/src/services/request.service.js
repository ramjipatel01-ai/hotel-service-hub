import Request from '../models/Request.js';
import Service from '../models/Service.js';
import Department from '../models/Department.js';
import Room from '../models/Room.js';
import User from '../models/User.js';
import { generateRequestNumber } from '../utils/dbUtils.js';
import {
  USER_ROLES,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  HISTORY_ACTION,
} from '../config/constants.js';
import { createAuditRecord, getRequestHistoryTrail } from './audit.service.js';
import { allocateStaffToRequest, validateStaffForAssignment } from './assignment.service.js';
import { dispatchLifecycleNotifications } from './notification.service.js';
import { assignUniqueRoomToGuest } from './roomAssignment.service.js';
import {
  emitRequestCreated,
  emitRequestAssigned,
  emitRequestAccepted,
  emitRequestStarted,
  emitRequestCompleted,
  emitRequestConfirmed,
  emitRequestCancelled,
  emitRequestUpdated,
} from './realtime.service.js';

/**
 * Valid allowed transitions in the Request State Machine
 */
const ALLOWED_TRANSITIONS = {
  [REQUEST_STATUS.PENDING]: [REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.ASSIGNED]: [REQUEST_STATUS.ACCEPTED, REQUEST_STATUS.ASSIGNED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.ACCEPTED]: [REQUEST_STATUS.IN_PROGRESS, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.IN_PROGRESS]: [REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CANCELLED],
  [REQUEST_STATUS.COMPLETED]: [REQUEST_STATUS.CONFIRMED],
  [REQUEST_STATUS.CONFIRMED]: [], // Terminal
  [REQUEST_STATUS.CANCELLED]: [], // Terminal
};

/**
 * Creates a new service request initiated by an authenticated guest
 *
 * @param {Object} options
 * @param {Object} options.guestUser - Authenticated User document
 * @param {Object} options.data - Request body payload
 * @returns {Promise<Object>} Created and populated request
 */
export async function createGuestRequest({ guestUser, data }) {
  // 1. Verify guest account is active
  if (!guestUser.isActive) {
    const error = new Error('Guest account is deactivated.');
    error.statusCode = 403;
    throw error;
  }

  // 2. Derive room: Ensure guest has an assigned unique room
  if (!guestUser.room) {
    await assignUniqueRoomToGuest(guestUser);
  }

  // Verify the room exists and is active/occupied
  let room = await Room.findById(guestUser.room);
  if (!room) {
    await assignUniqueRoomToGuest(guestUser);
    room = await Room.findById(guestUser.room);
  }

  if (!room) {
    const error = new Error('The room assigned to your profile does not exist in the hotel registry.');
    error.statusCode = 400;
    throw error;
  }

  // 3. Validate service exists
  const service = await Service.findById(data.serviceId);
  if (!service) {
    const error = new Error('Selected service not found.');
    error.statusCode = 404;
    throw error;
  }

  // 4. Validate service is active
  if (!service.isActive) {
    const error = new Error(`Service "${service.name}" is currently unavailable or inactive.`);
    error.statusCode = 400;
    throw error;
  }

  // 5. Resolve department strictly from service
  const department = await Department.findById(service.department);
  if (!department || !department.isActive) {
    const error = new Error('The hotel department providing this service is currently unavailable.');
    error.statusCode = 400;
    throw error;
  }

  // 6. Validate quantity against service configuration
  let quantity = 1;
  if (service.allowQuantity && data.quantity !== undefined) {
    const requestedQty = Number(data.quantity);
    if (requestedQty > service.maxQuantity) {
      const error = new Error(`Requested quantity (${requestedQty}) exceeds service maximum allowed (${service.maxQuantity}).`);
      error.statusCode = 400;
      throw error;
    }
    quantity = Math.max(1, requestedQty);
  }

  // 7. Resolve priority: Use requested if valid, otherwise service defaultPriority
  let resolvedPriority = service.defaultPriority || REQUEST_PRIORITY.NORMAL;
  if (data.priority && Object.values(REQUEST_PRIORITY).includes(data.priority)) {
    resolvedPriority = data.priority;
  }

  // 8. Generate race-condition resistant Request Number
  const requestNumber = await generateRequestNumber(Request);

  // 9. Create Request Document
  const newRequest = new Request({
    requestNumber,
    guest: guestUser._id,
    room: room._id,
    department: department._id,
    service: service._id,
    serviceTitle: service.name,
    category: service.category,
    priority: resolvedPriority,
    status: REQUEST_STATUS.PENDING,
    quantity,
    description: data.description ? data.description.trim() : '',
    specialInstructions: data.specialInstructions ? data.specialInstructions.trim() : '',
    preferredTime: data.preferredTime ? new Date(data.preferredTime) : null,
    imageUrl: data.imageUrl || null,
  });

  await newRequest.save();

  // 10. Create initial immutable audit trail record
  await createAuditRecord({
    requestId: newRequest._id,
    performedBy: guestUser._id,
    previousStatus: null,
    newStatus: REQUEST_STATUS.PENDING,
    action: HISTORY_ACTION.CREATED,
    notes: 'Service request initiated by guest.',
  });

  // 11. Attempt smart staff workload allocation
  const allocatedStaff = await allocateStaffToRequest(department._id);
  if (allocatedStaff) {
    // Atomic assign update
    const updated = await Request.findOneAndUpdate(
      { _id: newRequest._id, status: REQUEST_STATUS.PENDING },
      {
        $set: {
          assignedStaff: allocatedStaff._id,
          assignedAt: new Date(),
          status: REQUEST_STATUS.ASSIGNED,
        },
      },
      { new: true }
    );

    if (updated) {
      newRequest.assignedStaff = allocatedStaff._id;
      newRequest.assignedAt = updated.assignedAt;
      newRequest.status = REQUEST_STATUS.ASSIGNED;

      // Log assignment in audit history
      await createAuditRecord({
        requestId: newRequest._id,
        performedBy: guestUser._id,
        previousStatus: REQUEST_STATUS.PENDING,
        newStatus: REQUEST_STATUS.ASSIGNED,
        action: HISTORY_ACTION.ASSIGNED,
        notes: `Automatically assigned to ${allocatedStaff.name} based on lowest active workload.`,
      });

      // Dispatch assignment notification
      await dispatchLifecycleNotifications('ASSIGNED', newRequest);
    }
  }

  // 12. Dispatch creation notification
  await dispatchLifecycleNotifications('CREATED', newRequest);

  // Return populated request
  const populatedRequest = await Request.findById(newRequest._id)
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType floor')
    .populate('department', 'name code')
    .populate('service', 'name category price estimatedDurationMinutes')
    .populate('assignedStaff', 'name email role isOnDuty')
    .lean();

  // 13. Dispatch real-time socket events
  emitRequestCreated(populatedRequest);
  if (allocatedStaff) {
    emitRequestAssigned(populatedRequest);
  }

  return populatedRequest;
}

/**
 * Central State Machine transition engine.
 * Atomically validates transition legality, actor authorization, updates lifecycle
 * timestamps, records immutable audit history, and emits notifications.
 *
 * @param {Object} options
 * @param {string} options.requestId - Target Request ID
 * @param {string} options.targetStatus - Desired target status
 * @param {Object} options.actor - Authenticated User document
 * @param {string} [options.action] - HISTORY_ACTION type
 * @param {string} [options.notes] - Note or reason
 * @returns {Promise<Object>} Updated request document
 */
export async function transitionRequestStatus({
  requestId,
  targetStatus,
  actor,
  action,
  notes = null,
}) {
  // 1. Fetch current request state
  const existingRequest = await Request.findById(requestId);
  if (!existingRequest) {
    const error = new Error('Request not found.');
    error.statusCode = 404;
    throw error;
  }

  const currentStatus = existingRequest.status;

  // 2. Validate state machine transition legality
  const allowedNextStatuses = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowedNextStatuses.includes(targetStatus)) {
    const error = new Error(
      `Invalid transition: Cannot move request from "${currentStatus}" to "${targetStatus}".`
    );
    error.statusCode = 400;
    throw error;
  }

  // 3. Validate actor role & ownership permissions
  const timestampUpdates = {};
  let resolvedAction = action;

  switch (targetStatus) {
    case REQUEST_STATUS.ACCEPTED:
      // Must be assigned staff or admin
      if (actor.role === USER_ROLES.STAFF) {
        if (!existingRequest.assignedStaff || String(existingRequest.assignedStaff) !== String(actor._id)) {
          const error = new Error('Only the assigned staff member can accept this request.');
          error.statusCode = 403;
          throw error;
        }
        if (!actor.isOnDuty) {
          const error = new Error('Staff member must be on duty to accept requests.');
          error.statusCode = 400;
          throw error;
        }
      } else if (actor.role !== USER_ROLES.ADMIN) {
        const error = new Error('Unauthorized: Only assigned staff or admin can accept requests.');
        error.statusCode = 403;
        throw error;
      }
      timestampUpdates.acceptedAt = new Date();
      resolvedAction = resolvedAction || HISTORY_ACTION.ACCEPTED;
      break;

    case REQUEST_STATUS.IN_PROGRESS:
      // Must be assigned staff or admin
      if (actor.role === USER_ROLES.STAFF) {
        if (!existingRequest.assignedStaff || String(existingRequest.assignedStaff) !== String(actor._id)) {
          const error = new Error('Only the assigned staff member can start work on this request.');
          error.statusCode = 403;
          throw error;
        }
      } else if (actor.role !== USER_ROLES.ADMIN) {
        const error = new Error('Unauthorized: Only assigned staff or admin can start work on requests.');
        error.statusCode = 403;
        throw error;
      }
      timestampUpdates.startedAt = new Date();
      resolvedAction = resolvedAction || HISTORY_ACTION.STARTED;
      break;

    case REQUEST_STATUS.COMPLETED:
      // Must be assigned staff or admin
      if (actor.role === USER_ROLES.STAFF) {
        if (!existingRequest.assignedStaff || String(existingRequest.assignedStaff) !== String(actor._id)) {
          const error = new Error('Only the assigned staff member can complete this request.');
          error.statusCode = 403;
          throw error;
        }
      } else if (actor.role !== USER_ROLES.ADMIN) {
        const error = new Error('Unauthorized: Only assigned staff or admin can complete requests.');
        error.statusCode = 403;
        throw error;
      }
      timestampUpdates.completedAt = new Date();
      resolvedAction = resolvedAction || HISTORY_ACTION.COMPLETED;
      break;

    case REQUEST_STATUS.CONFIRMED:
      // Must be the guest who created the request (or admin)
      if (actor.role === USER_ROLES.GUEST) {
        if (String(existingRequest.guest) !== String(actor._id)) {
          const error = new Error('You can only confirm your own service requests.');
          error.statusCode = 403;
          throw error;
        }
      } else if (actor.role !== USER_ROLES.ADMIN) {
        const error = new Error('Unauthorized: Only the guest owner or admin can confirm completion.');
        error.statusCode = 403;
        throw error;
      }
      timestampUpdates.confirmedAt = new Date();
      resolvedAction = resolvedAction || HISTORY_ACTION.CONFIRMED;
      break;

    case REQUEST_STATUS.CANCELLED:
      // Guest can only cancel their own request, and only while PENDING or ASSIGNED
      if (actor.role === USER_ROLES.GUEST) {
        if (String(existingRequest.guest) !== String(actor._id)) {
          const error = new Error('You can only cancel your own service requests.');
          error.statusCode = 403;
          throw error;
        }
        if (![REQUEST_STATUS.PENDING, REQUEST_STATUS.ASSIGNED].includes(currentStatus)) {
          const error = new Error(`Cannot cancel request once work has started (current status: "${currentStatus}").`);
          error.statusCode = 400;
          throw error;
        }
      } else if (actor.role !== USER_ROLES.ADMIN) {
        const error = new Error('Unauthorized: Only the guest owner or admin can cancel requests.');
        error.statusCode = 403;
        throw error;
      }
      timestampUpdates.cancelledAt = new Date();
      timestampUpdates.cancellationReason = notes || 'Cancelled by user';
      resolvedAction = resolvedAction || HISTORY_ACTION.CANCELLED;
      break;

    default:
      break;
  }

  // 4. Critical Concurrency Protection: Atomic Compare-and-Set
  // Ensures two concurrent operations do not both succeed or race
  const updatedRequest = await Request.findOneAndUpdate(
    {
      _id: requestId,
      status: currentStatus, // Concurrency barrier: matches exact current status
    },
    {
      $set: {
        status: targetStatus,
        ...timestampUpdates,
      },
    },
    { new: true }
  );

  if (!updatedRequest) {
    const error = new Error(
      'Conflict: Request status was updated by another concurrent operation. Please refresh.'
    );
    error.statusCode = 409;
    throw error;
  }

  // 5. Record immutable audit entry
  await createAuditRecord({
    requestId: updatedRequest._id,
    performedBy: actor._id,
    previousStatus: currentStatus,
    newStatus: targetStatus,
    action: resolvedAction,
    notes,
  });

  // 6. Dispatch persistent notifications
  await dispatchLifecycleNotifications(targetStatus, updatedRequest, {
    reason: notes,
    performedByRole: actor.role,
  });

  const populatedRequest = await Request.findById(updatedRequest._id)
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType floor')
    .populate('department', 'name code')
    .populate('service', 'name category price estimatedDurationMinutes')
    .populate('assignedStaff', 'name email role isOnDuty')
    .lean();

  // 7. Dispatch real-time socket events
  switch (targetStatus) {
    case REQUEST_STATUS.ACCEPTED:
      emitRequestAccepted(populatedRequest);
      break;
    case REQUEST_STATUS.IN_PROGRESS:
      emitRequestStarted(populatedRequest);
      break;
    case REQUEST_STATUS.COMPLETED:
      emitRequestCompleted(populatedRequest);
      break;
    case REQUEST_STATUS.CONFIRMED:
      emitRequestConfirmed(populatedRequest);
      break;
    case REQUEST_STATUS.CANCELLED:
      emitRequestCancelled(populatedRequest, notes);
      break;
    default:
      emitRequestUpdated(populatedRequest, resolvedAction, notes);
      break;
  }

  return populatedRequest;
}

/**
 * Manually assigns or reassigns a request to a staff member (Admin only)
 *
 * @param {Object} options
 * @param {string} options.requestId - Target request ID
 * @param {string} options.staffId - Target staff member User ID
 * @param {Object} options.actor - Authenticated User document (Admin)
 * @returns {Promise<Object>} Updated request
 */
export async function assignRequest({ requestId, staffId, actor }) {
  if (actor.role !== USER_ROLES.ADMIN) {
    const error = new Error('Unauthorized: Only administrators can manually assign or reassign requests.');
    error.statusCode = 403;
    throw error;
  }

  const request = await Request.findById(requestId);
  if (!request) {
    const error = new Error('Request not found.');
    error.statusCode = 404;
    throw error;
  }

  // Terminal requests cannot be assigned
  if ([REQUEST_STATUS.COMPLETED, REQUEST_STATUS.CONFIRMED, REQUEST_STATUS.CANCELLED].includes(request.status)) {
    const error = new Error(`Cannot assign request in terminal status "${request.status}".`);
    error.statusCode = 400;
    throw error;
  }

  // Validate the assigned staff member
  const validation = await validateStaffForAssignment(staffId, request.department);
  if (!validation.valid) {
    const error = new Error(validation.reason);
    error.statusCode = 400;
    throw error;
  }

  const staff = validation.staff;
  const isReassignment = Boolean(request.assignedStaff);
  const previousStatus = request.status;
  const action = isReassignment ? HISTORY_ACTION.REASSIGNED : HISTORY_ACTION.ASSIGNED;

  // Atomic update
  const updatedRequest = await Request.findOneAndUpdate(
    { _id: requestId },
    {
      $set: {
        assignedStaff: staff._id,
        assignedAt: new Date(),
        status: REQUEST_STATUS.ASSIGNED,
      },
    },
    { new: true }
  );

  // Record audit history preserving old and new assignment details
  await createAuditRecord({
    requestId: updatedRequest._id,
    performedBy: actor._id,
    previousStatus,
    newStatus: REQUEST_STATUS.ASSIGNED,
    action,
    notes: `${isReassignment ? 'Reassigned' : 'Assigned'} to ${staff.name} by administrator ${actor.name}.`,
  });

  // Dispatch assignment notification
  await dispatchLifecycleNotifications('ASSIGNED', updatedRequest);

  const populatedRequest = await Request.findById(updatedRequest._id)
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType floor')
    .populate('department', 'name code')
    .populate('service', 'name category price estimatedDurationMinutes')
    .populate('assignedStaff', 'name email role isOnDuty')
    .lean();

  // Dispatch real-time socket event
  emitRequestAssigned(populatedRequest);

  return populatedRequest;
}

/**
 * Appends a staff operational work note without mutating request state
 *
 * @param {Object} options
 * @param {string} options.requestId - Target request ID
 * @param {Object} options.actor - Authenticated User document
 * @param {string} options.notes - Note content
 * @returns {Promise<Object>} Created history entry
 */
export async function addRequestNote({ requestId, actor, notes }) {
  const request = await Request.findById(requestId);
  if (!request) {
    const error = new Error('Request not found.');
    error.statusCode = 404;
    throw error;
  }

  // Access validation: STAFF (in department or assigned) or ADMIN
  if (actor.role === USER_ROLES.STAFF) {
    const matchesDept = String(request.department) === String(actor.department);
    const isAssigned = request.assignedStaff && String(request.assignedStaff) === String(actor._id);
    if (!matchesDept && !isAssigned) {
      const error = new Error('Forbidden: You can only add notes to requests within your department.');
      error.statusCode = 403;
      throw error;
    }
  } else if (actor.role !== USER_ROLES.ADMIN && actor.role !== USER_ROLES.MANAGER) {
    const error = new Error('Forbidden: Only staff, managers, or admins can append operational notes.');
    error.statusCode = 403;
    throw error;
  }

  // Immutable audit record
  const historyEntry = await createAuditRecord({
    requestId: request._id,
    performedBy: actor._id,
    previousStatus: request.status,
    newStatus: request.status,
    action: HISTORY_ACTION.NOTE_ADDED,
    notes,
  });

  // Dispatch real-time socket event
  emitRequestUpdated(request, HISTORY_ACTION.NOTE_ADDED, notes);

  return historyEntry;
}

/**
 * Admin overrides request priority with mandatory audit logging
 *
 * @param {Object} options
 * @param {string} options.requestId - Target request ID
 * @param {string} options.priority - Target priority enum
 * @param {string} [options.reason] - Justification for priority change
 * @param {Object} options.actor - Authenticated User document
 * @returns {Promise<Object>} Updated request document
 */
export async function updateRequestPriority({ requestId, priority, reason = '', actor }) {
  if (actor.role !== USER_ROLES.ADMIN) {
    const error = new Error('Unauthorized: Only administrators can modify request priority.');
    error.statusCode = 403;
    throw error;
  }

  if (!Object.values(REQUEST_PRIORITY).includes(priority)) {
    const error = new Error(`Invalid priority. Must be one of: ${Object.values(REQUEST_PRIORITY).join(', ')}`);
    error.statusCode = 400;
    throw error;
  }

  const request = await Request.findById(requestId);
  if (!request) {
    const error = new Error('Request not found.');
    error.statusCode = 404;
    throw error;
  }

  // Terminal requests cannot be modified
  if ([REQUEST_STATUS.CONFIRMED, REQUEST_STATUS.CANCELLED].includes(request.status)) {
    const error = new Error(`Cannot update priority for request in terminal status "${request.status}".`);
    error.statusCode = 400;
    throw error;
  }

  const previousPriority = request.priority;
  request.priority = priority;
  await request.save();

  // Create immutable audit record
  await createAuditRecord({
    requestId: request._id,
    performedBy: actor._id,
    previousStatus: request.status,
    newStatus: request.status,
    action: HISTORY_ACTION.PRIORITY_CHANGED,
    notes: `Priority changed from ${previousPriority} to ${priority}. Reason: ${reason || 'Admin operational override'}.`,
  });

  const populatedRequest = await Request.findById(request._id)
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType floor')
    .populate('department', 'name code')
    .populate('service', 'name category price estimatedDurationMinutes')
    .populate('assignedStaff', 'name email role isOnDuty')
    .lean();

  // Emit real-time event
  emitRequestUpdated(populatedRequest, HISTORY_ACTION.PRIORITY_CHANGED, reason);

  return populatedRequest;
}

/**
 * Retrieves a paginated list of requests with role-based scoping and filters
 *
 * @param {Object} options
 * @param {Object} options.user - Authenticated User document
 * @param {Object} options.query - Express req.query
 * @returns {Promise<{ requests: Array, pagination: Object }>}
 */
export async function getRequestsList({ user, query = {} }) {
  const filter = {};

  // 1. Role-based scoping (CRITICAL SECURITY RULE)
  if (user.role === USER_ROLES.GUEST) {
    // Guests ONLY see their own requests; ignore any client-supplied guest filters
    filter.guest = user._id;
  } else if (user.role === USER_ROLES.STAFF) {
    // Staff restricted to their assigned department
    filter.department = user.department;
    // Allow filtering for tasks specifically assigned to them
    if (query.assignedToMe === 'true') {
      filter.assignedStaff = user._id;
    }
  }
  // ADMIN and MANAGER have global access across departments

  // 2. Query Filters
  if (query.status && Object.values(REQUEST_STATUS).includes(query.status)) {
    filter.status = query.status;
  }

  if (query.priority && Object.values(REQUEST_PRIORITY).includes(query.priority)) {
    filter.priority = query.priority;
  }

  // Admin / Manager can filter by department
  if ([USER_ROLES.ADMIN, USER_ROLES.MANAGER].includes(user.role) && query.department) {
    filter.department = query.department;
  }

  if (query.service) {
    filter.service = query.service;
  }

  if (query.room) {
    filter.room = query.room;
  }

  if (query.assignedStaff) {
    filter.assignedStaff = query.assignedStaff;
  }

  // Date range filters
  if (query.startDate || query.endDate) {
    filter.createdAt = {};
    if (query.startDate) {
      filter.createdAt.$gte = new Date(query.startDate);
    }
    if (query.endDate) {
      const end = new Date(query.endDate);
      end.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = end;
    }
  }

  // Search by requestNumber or description
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [
      { requestNumber: searchRegex },
      { description: searchRegex },
      { serviceTitle: searchRegex },
    ];
  }

  // 3. Pagination & Sorting
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const skip = (page - 1) * limit;

  const total = await Request.countDocuments(filter);
  const pages = Math.ceil(total / limit) || 1;

  const requests = await Request.find(filter)
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType floor')
    .populate('department', 'name code')
    .populate('service', 'name category price estimatedDurationMinutes')
    .populate('assignedStaff', 'name email role isOnDuty')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .lean();

  return {
    requests,
    pagination: {
      page,
      limit,
      total,
      pages,
    },
  };
}

/**
 * Retrieves a detailed request by ID with populated models and history trail,
 * enforcing strict role ownership access control.
 *
 * @param {Object} options
 * @param {string} options.requestId - Target request ID
 * @param {Object} options.user - Authenticated User document
 * @returns {Promise<{ request: Object, history: Array }>}
 */
export async function getRequestDetails({ requestId, user }) {
  const request = await Request.findById(requestId)
    .populate('guest', 'name email phone')
    .populate('room', 'roomNumber roomType floor')
    .populate('department', 'name code')
    .populate('service', 'name category price estimatedDurationMinutes')
    .populate('assignedStaff', 'name email role isOnDuty')
    .lean();

  if (!request) {
    const error = new Error('Request not found.');
    error.statusCode = 404;
    throw error;
  }

  // Access Control verification
  if (user.role === USER_ROLES.GUEST) {
    const guestId = request.guest?._id ? String(request.guest._id) : String(request.guest);
    if (guestId !== String(user._id)) {
      const error = new Error('Forbidden: You do not have permission to view this request.');
      error.statusCode = 403;
      throw error;
    }
  } else if (user.role === USER_ROLES.STAFF) {
    const deptId = request.department?._id ? String(request.department._id) : String(request.department);
    const isAssigned = request.assignedStaff && String(request.assignedStaff._id || request.assignedStaff) === String(user._id);
    if (deptId !== String(user.department) && !isAssigned) {
      const error = new Error('Forbidden: You can only view requests belonging to your department.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Retrieve immutable history trail
  const history = await getRequestHistoryTrail(requestId);

  return {
    request,
    history,
  };
}
