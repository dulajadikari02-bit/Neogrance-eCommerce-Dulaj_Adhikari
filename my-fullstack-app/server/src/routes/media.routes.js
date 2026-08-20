import { Router } from 'express';
import * as mediaController from '../controllers/media.controller.js';

const router = Router();

router.get('/:id', mediaController.getMedia);

export default router;
