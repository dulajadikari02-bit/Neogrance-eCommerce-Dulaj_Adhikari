import { Router } from 'express';
import * as contactController from '../controllers/contact.controller.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.post('/', publicWriteLimiter, contactController.createContactValidators, contactController.createContact);

export default router;
