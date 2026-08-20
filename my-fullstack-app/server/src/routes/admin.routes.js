import { Router } from 'express';
import * as adminController from '../controllers/admin.controller.js';
import * as productController from '../controllers/product.controller.js';
import * as categoryController from '../controllers/category.controller.js';
import * as bannerController from '../controllers/banner.controller.js';
import * as heroBannerController from '../controllers/heroBanner.controller.js';
import * as newsletterController from '../controllers/newsletter.controller.js';
import * as contactController from '../controllers/contact.controller.js';
import { requireAuth, requireAdmin, requireStaffOrAdmin } from '../middleware/auth.js';
import { uploadProductImage, uploadProductImages, uploadBannerImage, uploadHeroBannerImage, processImages } from '../middleware/upload.js';

const router = Router();
// Staff and SuperAdmin (role 'admin') both get into the admin panel; routes that are
// SuperAdmin-only layer requireAdmin on top below. See middleware/auth.js for the split.
router.use(requireAuth, requireStaffOrAdmin);

// Dashboard — staff sees it too, but the controller omits revenue unless role is admin.
router.get('/dashboard', adminController.dashboardSummary);

// One-time cleanup tool — moves any remaining disk-based images into the database.
router.post('/migrate-legacy-images', requireAdmin, adminController.migrateLegacyImages);
router.get('/analytics/category-sales', requireAdmin, adminController.categorySalesAnalytics);
router.get('/analytics/profit-trend', requireAdmin, adminController.profitTrend);

// Push notification device tokens — staff want order/low-stock alerts too.
router.post('/push-token', adminController.registerPushToken);
router.delete('/push-token', adminController.unregisterPushToken);

// Products — staff can view the catalog and update stock; everything else
// (create, full edit, activate/deactivate, delete) is a SuperAdmin merchandising decision.
router.get('/products', productController.adminListProducts);
router.get('/products/low-stock', productController.lowStockProducts);
router.put('/products/bulk-stock', productController.bulkUpdateStockValidators, productController.bulkUpdateStock);
router.put('/products/bulk-status', requireAdmin, productController.bulkUpdateStatusValidators, productController.bulkUpdateStatus);
router.get('/products/:id', productController.adminGetProduct);
router.post('/products', requireAdmin, uploadProductImages, processImages(1200), productController.productValidators, productController.createProduct);
router.put('/products/:id', requireAdmin, uploadProductImages, processImages(1200), productController.productValidators, productController.updateProduct);
router.put('/products/:id/status', requireAdmin, productController.statusValidators, productController.updateProductStatus);
router.put('/products/:id/stock', productController.updateStockValidators, productController.updateStock);
router.delete('/products/:id', requireAdmin, productController.deleteProduct);

// Categories — SuperAdmin only (shapes the storefront's structure).
router.get('/categories', requireAdmin, categoryController.listCategories);
router.post('/categories', requireAdmin, uploadProductImage.single('image'), processImages(1200), categoryController.categoryValidators, categoryController.createCategory);
router.put('/categories/:id', requireAdmin, uploadProductImage.single('image'), processImages(1200), categoryController.categoryValidators, categoryController.updateCategory);
router.delete('/categories/:id', requireAdmin, categoryController.deleteCategory);

// Reviews — SuperAdmin only.
router.get('/reviews', requireAdmin, adminController.listReviewsValidators, adminController.listReviews);
router.put('/reviews/:id/approve', requireAdmin, adminController.approveReview);
router.put('/reviews/:id/reject', requireAdmin, adminController.rejectReview);

// Promo banner — SuperAdmin only.
router.get('/banner', requireAdmin, bannerController.adminGetBanner);
router.put('/banner', requireAdmin, uploadBannerImage.single('image'), processImages(1920), bannerController.bannerValidators, bannerController.updateBanner);

// Homepage hero banner (the big banner at the very top) — SuperAdmin only.
router.get('/hero-banner', requireAdmin, heroBannerController.adminGetHeroBanner);
router.put('/hero-banner', requireAdmin, uploadHeroBannerImage.single('image'), processImages(1920), heroBannerController.heroBannerValidators, heroBannerController.updateHeroBanner);

// Orders — staff's core duty: process orders.
router.get('/orders', adminController.listOrders);
router.put('/orders/:id/status', adminController.updateOrderStatusValidators, adminController.updateOrderStatus);

// Customers — SuperAdmin only (surfaces per-customer revenue).
router.get('/customers', requireAdmin, adminController.listCustomers);

// Newsletter — SuperAdmin only.
router.get('/newsletter', requireAdmin, newsletterController.listSubscribers);

// Contact inquiries — SuperAdmin only.
router.get('/contact-messages', requireAdmin, contactController.listContactMessages);
router.put('/contact-messages/:id/read', requireAdmin, contactController.markContactMessageRead);
router.delete('/contact-messages/:id', requireAdmin, contactController.deleteContactMessage);

// Staff accounts — SuperAdmin only.
router.get('/staff', requireAdmin, adminController.listStaff);
router.post('/staff', requireAdmin, adminController.createStaffValidators, adminController.createStaff);
router.put('/staff/:id/revoke', requireAdmin, adminController.revokeStaff);

export default router;
