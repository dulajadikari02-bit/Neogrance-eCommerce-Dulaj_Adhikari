import { Router } from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import productRoutes from './product.routes.js';
import categoryRoutes from './category.routes.js';
import orderRoutes from './order.routes.js';
import newsletterRoutes from './newsletter.routes.js';
import bannerRoutes from './banner.routes.js';
import contactRoutes from './contact.routes.js';
import adminRoutes from './admin.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/orders', orderRoutes);
router.use('/newsletter', newsletterRoutes);
router.use('/banner', bannerRoutes);
router.use('/contact', contactRoutes);
router.use('/admin', adminRoutes);

export default router;
