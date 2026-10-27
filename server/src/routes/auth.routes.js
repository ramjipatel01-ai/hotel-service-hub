import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  getMe,
  changePassword,
  logout,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  validateRegister,
  validateLogin,
  validateGoogleAuth,
  validateChangePassword,
} from '../validators/auth.validators.js';

const router = Router();

// Public Authentication Endpoints
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/google', validateGoogleAuth, googleAuth);
router.post('/logout', logout);

// Protected Authentication Endpoints
router.get('/me', authenticate, getMe);
router.patch('/change-password', authenticate, validateChangePassword, changePassword);

export default router;
