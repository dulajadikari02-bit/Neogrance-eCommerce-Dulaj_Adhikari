import { Router } from 'express';
import * as heroBannerController from '../controllers/heroBanner.controller.js';

const router = Router();

router.get('/', heroBannerController.getHeroBanner);

export default router;
