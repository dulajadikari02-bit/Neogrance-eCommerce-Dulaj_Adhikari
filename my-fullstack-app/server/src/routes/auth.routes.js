import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as authController from '../controllers/auth.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many attempts, please try again later.' },
});

router.post('/register', authLimiter, authController.registerValidators, authController.register);
router.post('/login', authLimiter, authController.loginValidators, authController.login);
router.post('/google', authLimiter, authController.googleAuth);
router.post('/forgot-password', authLimiter, authController.forgotPasswordValidators, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPasswordValidators, authController.resetPassword);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

export default router;
