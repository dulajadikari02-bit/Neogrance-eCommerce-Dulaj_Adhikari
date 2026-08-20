import { Router } from 'express';
import * as productController from '../controllers/product.controller.js';
import { requireAuth } from '../middleware/auth.js';
import { uploadReviewImage, processImages } from '../middleware/upload.js';
import { publicWriteLimiter } from '../middleware/rateLimit.js';

const router = Router();

router.get('/top-rated', productController.topRated);
router.get('/new-arrivals', productController.newArrivals);
router.get('/reviews/approved', productController.approvedReviews);
router.get('/', productController.listValidators, productController.listProducts);
router.get('/:idOrSlug', productController.getProduct);

router.post(
  '/:id/reviews',
  publicWriteLimiter,
  requireAuth,
  uploadReviewImage.single('reviewImage'),
  processImages('reviews', 1000),
  productController.reviewValidators,
  productController.createReview
);

export default router;
