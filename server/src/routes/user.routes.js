import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  updateMyDutyStatus,
  createUser,
  listUsers,
  updateUserStatus,
  updateUserRole,
  switchMyRole,
} from '../controllers/user.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  validateUpdateProfile,
  validateCreateUser,
} from '../validators/auth.validators.js';

const router = Router();

// Current User Profile & Development Role Switcher
router.get('/me', authenticate, getProfile);
router.patch('/me', authenticate, validateUpdateProfile, updateProfile);
router.patch('/me/on-duty', authenticate, updateMyDutyStatus);
router.patch('/me/switch-role', authenticate, switchMyRole);

// Administrative User Management
router.post(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  validateCreateUser,
  createUser
);

router.get(
  '/',
  authenticate,
  authorize(USER_ROLES.ADMIN, USER_ROLES.MANAGER),
  listUsers
);

router.patch(
  '/:id/status',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  updateUserStatus
);

router.patch(
  '/:id/role',
  authenticate,
  authorize(USER_ROLES.ADMIN),
  updateUserRole
);

export default router;
