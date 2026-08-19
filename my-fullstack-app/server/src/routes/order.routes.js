import { Router } from 'express';
import * as orderController from '../controllers/order.controller.js';
import { attachUser } from '../middleware/auth.js';
import { uploadPaymentSlip } from '../middleware/upload.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post(
  '/',
  publicWriteLimiter,
  attachUser,
  uploadPaymentSlip.single('paymentSlip'),
  orderController.createOrderValidators,
  orderController.createOrder
);
// Same limiter on tracking too — id+email is a knowledge factor, not a secret;
// without a limit here it's brute-forceable against a guessed/leaked email.
router.post('/track', publicWriteLimiter, orderController.trackOrderValidators, orderController.trackOrder);
router.get('/:id', attachUser, orderController.getOrder);

export default router;
