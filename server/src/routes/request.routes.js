import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  createRequest,
  getRequests,
  getRequestById,
  acceptRequest,
  startRequest,
  completeRequest,
  confirmRequest,
  cancelRequest,
  assignRequest,
  updatePriority,
  addNote,
  getRequestHistory,
} from '../controllers/request.controller.js';

const router = Router();

// All request operations require active authentication
router.use(authenticate);

// Request creation (Guests or Admin dispatch)
router.post('/', authorize(USER_ROLES.GUEST, USER_ROLES.ADMIN), createRequest);

// List requests (Role-aware query filtering & pagination)
router.get('/', getRequests);

// Get request details by ID
router.get('/:id', getRequestById);

// Staff lifecycle transitions
router.patch('/:id/accept', authorize(USER_ROLES.STAFF, USER_ROLES.ADMIN), acceptRequest);
router.patch('/:id/start', authorize(USER_ROLES.STAFF, USER_ROLES.ADMIN), startRequest);
router.patch('/:id/complete', authorize(USER_ROLES.STAFF, USER_ROLES.ADMIN), completeRequest);

// Guest confirmation
router.patch('/:id/confirm', authorize(USER_ROLES.GUEST, USER_ROLES.ADMIN), confirmRequest);

// Cancellation (Guest or Admin)
router.patch('/:id/cancel', authorize(USER_ROLES.GUEST, USER_ROLES.ADMIN), cancelRequest);

// Admin manual assignment / reassignment
router.patch('/:id/assign', authorize(USER_ROLES.ADMIN), assignRequest);
router.patch('/:id/reassign', authorize(USER_ROLES.ADMIN), assignRequest);
router.patch('/:id/priority', authorize(USER_ROLES.ADMIN), updatePriority);

// Operational work notes
router.post(
  '/:id/notes',
  authorize(USER_ROLES.STAFF, USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  addNote
);

// History timeline
router.get('/:id/history', getRequestHistory);

export default router;
