import { Router } from 'express';
import * as newsletterController from '../controllers/newsletter.controller.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/subscribe', publicWriteLimiter, newsletterController.subscribeValidators, newsletterController.subscribe);

export default router;
