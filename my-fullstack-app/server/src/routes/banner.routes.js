import { Router } from 'express';
import * as bannerController from '../controllers/banner.controller.js';

const router = Router();

router.get('/', bannerController.getBanner);

export default router;
