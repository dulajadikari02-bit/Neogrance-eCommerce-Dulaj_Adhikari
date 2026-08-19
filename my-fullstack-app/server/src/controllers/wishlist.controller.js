import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { mapProduct, PRODUCT_BASE_SELECT } from '../utils/productMapper.js';

// Deactivated products drop out of the wishlist view silently — matches how
// they're already invisible everywhere else on the storefront.
async function getWishlist(userId) {
  const [rows] = await pool.query(
    `${PRODUCT_BASE_SELECT}
     JOIN wishlist_items w ON w.product_id = p.id
     WHERE w.user_id = ? AND p.is_active = 1
     ORDER BY w.created_at DESC`,
    [userId]
  );
  return rows.map(mapProduct);
}

export const listWishlist = catchAsync(async (req, res) => {
  res.json({ products: await getWishlist(req.user.id) });
});

export const addWishlistItemValidators = [
  body('productId').isInt({ min: 1 }).withMessage('A product is required.'),
];

export const addWishlistItem = catchAsync(async (req, res) => {
  checkValidation(req);
  const productId = Number(req.body.productId);
  const [[product]] = await pool.query('SELECT id FROM products WHERE id = ?', [productId]);
  if (!product) throw new ApiError(404, 'Product not found.');

  // INSERT IGNORE quietly does nothing if this product is already in the wishlist,
  // instead of throwing a duplicate-entry error.
  await pool.query('INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
  res.status(201).json({ products: await getWishlist(req.user.id) });
});

export const removeWishlistItem = catchAsync(async (req, res) => {
  await pool.query('DELETE FROM wishlist_items WHERE user_id = ? AND product_id = ?', [req.user.id, req.params.productId]);
  res.json({ products: await getWishlist(req.user.id) });
});

export const mergeWishlistValidators = [
  body('productIds').isArray().withMessage('productIds must be a list.'),
];

export const mergeWishlist = catchAsync(async (req, res) => {
  checkValidation(req);
  const ids = req.body.productIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  for (const productId of ids) {
    await pool.query('INSERT IGNORE INTO wishlist_items (user_id, product_id) VALUES (?, ?)', [req.user.id, productId]);
  }
  res.status(201).json({ products: await getWishlist(req.user.id) });
});
