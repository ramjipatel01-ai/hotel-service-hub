import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorize } from '../middleware/role.middleware.js';
import { USER_ROLES } from '../config/constants.js';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  getServices,
  createService,
  updateService,
  deleteService,
  getRooms,
  createRoom,
  updateRoom,
  deleteRoom,
  getStaffDirectory,
} from '../controllers/catalog.controller.js';

const router = Router();

// Catalog query endpoints (accessible to authenticated users)
router.get('/departments', getDepartments);
router.get('/services', getServices);
router.get('/rooms', getRooms);
router.get('/staff', getStaffDirectory);

// Department administrative endpoints
router.post('/departments', authenticate, authorize(USER_ROLES.ADMIN), createDepartment);
router.patch('/departments/:id', authenticate, authorize(USER_ROLES.ADMIN), updateDepartment);
router.delete('/departments/:id', authenticate, authorize(USER_ROLES.ADMIN), deleteDepartment);

// Service catalog administrative endpoints
router.post('/services', authenticate, authorize(USER_ROLES.ADMIN), createService);
router.patch('/services/:id', authenticate, authorize(USER_ROLES.ADMIN), updateService);
router.delete('/services/:id', authenticate, authorize(USER_ROLES.ADMIN), deleteService);

// Room inventory administrative endpoints
router.post('/rooms', authenticate, authorize(USER_ROLES.ADMIN), createRoom);
router.patch('/rooms/:id', authenticate, authorize(USER_ROLES.ADMIN), updateRoom);
router.delete('/rooms/:id', authenticate, authorize(USER_ROLES.ADMIN), deleteRoom);

export default router;
