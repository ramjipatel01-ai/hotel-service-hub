import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  createFeedback,
  getFeedbackByRequest,
} from '../controllers/feedback.controller.js';

const router = Router();

// All feedback operations require active authentication
router.use(authenticate);

// Guest or Admin submits feedback
router.post('/', authorize(USER_ROLES.GUEST, USER_ROLES.ADMIN), createFeedback);

// View feedback by request ID
router.get('/request/:requestId', getFeedbackByRequest);

export default router;
