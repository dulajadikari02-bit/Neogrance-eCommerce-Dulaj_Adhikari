import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import * as cartController from '../controllers/cart.controller.js';
import * as wishlistController from '../controllers/wishlist.controller.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
router.use(requireAuth);

router.put('/me', userController.updateProfileValidators, userController.updateProfile);
router.get('/me/orders', userController.myOrders);

router.get('/me/addresses', userController.listAddresses);
router.post('/me/addresses', userController.addressValidators, userController.createAddress);
router.put('/me/addresses/:id', userController.addressValidators, userController.updateAddress);
router.delete('/me/addresses/:id', userController.deleteAddress);
router.put('/me/addresses/:id/default', userController.setDefaultAddress);

// Server-synced cart (guest carts live in localStorage instead — see CartContext)
router.get('/me/cart', cartController.listCart);
router.post('/me/cart', cartController.addCartItemValidators, cartController.addCartItem);
router.post('/me/cart/merge', cartController.mergeCartValidators, cartController.mergeCart);
router.put('/me/cart/:id', cartController.updateCartItemValidators, cartController.updateCartItem);
router.delete('/me/cart/:id', cartController.removeCartItem);
router.delete('/me/cart', cartController.clearCart);

// Server-synced wishlist (guest wishlists live in localStorage instead)
router.get('/me/wishlist', wishlistController.listWishlist);
router.post('/me/wishlist', wishlistController.addWishlistItemValidators, wishlistController.addWishlistItem);
router.post('/me/wishlist/merge', wishlistController.mergeWishlistValidators, wishlistController.mergeWishlist);
router.delete('/me/wishlist/:productId', wishlistController.removeWishlistItem);

export default router;
