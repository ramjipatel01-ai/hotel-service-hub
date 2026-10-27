import {
  createGuestRequest,
  transitionRequestStatus,
  assignRequest as assignRequestService,
  addRequestNote,
  getRequestsList,
  getRequestDetails,
  updateRequestPriority,
} from '../services/request.service.js';
import { getRequestHistoryTrail } from '../services/audit.service.js';
import {
  validateCreateRequestInput,
  validateAssignRequestInput,
  validateAddNoteInput,
  validateCancelRequestInput,
} from '../validators/request.validators.js';
import { isValidObjectId } from '../utils/dbUtils.js';
import { REQUEST_STATUS } from '../config/constants.js';

/**
 * Handle new service request creation by guest
 * POST /api/requests
 */
export async function createRequest(req, res, next) {
  try {
    const validationErrors = validateCreateRequestInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for request creation.',
        errors: validationErrors,
      });
    }

    const request = await createGuestRequest({
      guestUser: req.user,
      data: req.body,
    });

    return res.status(201).json({
      success: true,
      message: 'Service request created successfully.',
      data: request,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get paginated list of requests with role-based scoping and query filters
 * GET /api/requests
 */
export async function getRequests(req, res, next) {
  try {
    const result = await getRequestsList({
      user: req.user,
      query: req.query,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get request details by ID with populated references and audit trail
 * GET /api/requests/:id
 */
export async function getRequestById(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const result = await getRequestDetails({
      requestId: id,
      user: req.user,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff accepts assigned request
 * PATCH /api/requests/:id/accept
 */
export async function acceptRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const updated = await transitionRequestStatus({
      requestId: id,
      targetStatus: REQUEST_STATUS.ACCEPTED,
      actor: req.user,
      notes: req.body?.notes || 'Request accepted by assigned staff.',
    });

    return res.status(200).json({
      success: true,
      message: 'Request accepted successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff starts work on accepted request
 * PATCH /api/requests/:id/start
 */
export async function startRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const updated = await transitionRequestStatus({
      requestId: id,
      targetStatus: REQUEST_STATUS.IN_PROGRESS,
      actor: req.user,
      notes: req.body?.notes || 'Work started on request.',
    });

    return res.status(200).json({
      success: true,
      message: 'Work on request has started.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff completes work on in-progress request
 * PATCH /api/requests/:id/complete
 */
export async function completeRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const updated = await transitionRequestStatus({
      requestId: id,
      targetStatus: REQUEST_STATUS.COMPLETED,
      actor: req.user,
      notes: req.body?.notes || 'Service completed by staff.',
    });

    return res.status(200).json({
      success: true,
      message: 'Request marked as completed.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Guest confirms completion of request
 * PATCH /api/requests/:id/confirm
 */
export async function confirmRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const updated = await transitionRequestStatus({
      requestId: id,
      targetStatus: REQUEST_STATUS.CONFIRMED,
      actor: req.user,
      notes: req.body?.notes || 'Guest confirmed satisfactory service.',
    });

    return res.status(200).json({
      success: true,
      message: 'Service completion confirmed by guest.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Guest or Admin cancels request
 * PATCH /api/requests/:id/cancel
 */
export async function cancelRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const validationErrors = validateCancelRequestInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for cancellation.',
        errors: validationErrors,
      });
    }

    const updated = await transitionRequestStatus({
      requestId: id,
      targetStatus: REQUEST_STATUS.CANCELLED,
      actor: req.user,
      notes: req.body?.reason || 'Request cancelled.',
    });

    return res.status(200).json({
      success: true,
      message: 'Request cancelled successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin assigns or reassigns staff member
 * PATCH /api/requests/:id/assign
 */
export async function assignRequest(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const validationErrors = validateAssignRequestInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for staff assignment.',
        errors: validationErrors,
      });
    }

    const updated = await assignRequestService({
      requestId: id,
      staffId: req.body.staffId,
      actor: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Request assigned successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Staff or Admin adds an operational work note to a request
 * POST /api/requests/:id/notes
 */
export async function addNote(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const validationErrors = validateAddNoteInput(req.body);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed for work note.',
        errors: validationErrors,
      });
    }

    const noteEntry = await addRequestNote({
      requestId: id,
      actor: req.user,
      notes: req.body.notes,
    });

    return res.status(201).json({
      success: true,
      message: 'Work note added successfully.',
      data: noteEntry,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get immutable request history trail
 * GET /api/requests/:id/history
 */
export async function getRequestHistory(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    // Verify user has access to view this request
    await getRequestDetails({
      requestId: id,
      user: req.user,
    });

    const history = await getRequestHistoryTrail(id);

    return res.status(200).json({
      success: true,
      data: history,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Admin overrides request priority
 * PATCH /api/requests/:id/priority
 */
export async function updatePriority(req, res, next) {
  try {
    const { id } = req.params;
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid request ID format.',
      });
    }

    const { priority, reason } = req.body;
    if (!priority) {
      return res.status(400).json({
        success: false,
        message: 'Target priority is required.',
      });
    }

    const updated = await updateRequestPriority({
      requestId: id,
      priority,
      reason,
      actor: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Request priority updated to ${priority} successfully.`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
}
