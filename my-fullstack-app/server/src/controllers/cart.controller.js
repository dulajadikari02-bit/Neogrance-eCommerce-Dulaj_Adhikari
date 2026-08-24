import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';

const CART_SELECT = `
  SELECT ci.id, ci.product_id, ci.variant_id, ci.quantity,
    p.name, p.image_url, p.is_active,
    v.name AS variant_name, v.price AS variant_price, p.price AS product_price
  FROM cart_items ci
  JOIN products p ON p.id = ci.product_id
  LEFT JOIN product_variants v ON v.id = ci.variant_id
  WHERE ci.user_id = ?
  ORDER BY ci.id ASC
`;

const mapCartRow = (row) => ({
  id: row.id,
  productId: row.product_id,
  variantId: row.variant_id,
  quantity: row.quantity,
  name: row.name,
  image: row.image_url,
  variant: row.variant_name,
  price: Number(row.variant_id ? row.variant_price : row.product_price),
  isActive: !!row.is_active,
});

async function getCart(userId) {
  const [rows] = await pool.query(CART_SELECT, [userId]);
  // A product that's since been deactivated shouldn't be checked out, but we
  // still surface it (isActive: false) rather than silently dropping it, so
  // the cart UI can flag it instead of the item just vanishing unexplained.
  return rows.map(mapCartRow);
}

async function assertProductAndVariant(productId, variantId) {
  const [[product]] = await pool.query('SELECT id, is_active FROM products WHERE id = ?', [productId]);
  if (!product) throw new ApiError(404, 'Product not found.');
  if (variantId) {
    const [[variant]] = await pool.query(
      'SELECT id FROM product_variants WHERE id = ? AND product_id = ?',
      [variantId, productId]
    );
    if (!variant) throw new ApiError(400, 'Invalid product variant.');
  }
}

// NULL-safe upsert — MySQL's UNIQUE constraints treat every NULL as distinct,
// so a product with no variant (variant_id NULL) can't rely on ON DUPLICATE
// KEY UPDATE. `<=>` (NULL-safe equals) finds the existing row correctly either way.
// Adds an item to the cart, or if it's already there (same product + same variant),
// just increases its quantity instead of creating a duplicate row.
async function upsertCartItem(userId, productId, variantId, quantityDelta) {
  const [[existing]] = await pool.query(
    'SELECT id, quantity FROM cart_items WHERE user_id = ? AND product_id = ? AND variant_id <=> ?',
    [userId, productId, variantId]
  );
  if (existing) {
    await pool.query('UPDATE cart_items SET quantity = quantity + ? WHERE id = ?', [quantityDelta, existing.id]);
  } else {
    await pool.query(
      'INSERT INTO cart_items (user_id, product_id, variant_id, quantity) VALUES (?, ?, ?, ?)',
      [userId, productId, variantId, quantityDelta]
    );
  }
}

export const listCart = catchAsync(async (req, res) => {
  res.json({ items: await getCart(req.user.id) });
});

export const addCartItemValidators = [
  body('productId').isInt({ min: 1 }).withMessage('A product is required.'),
  body('variantId').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }),
  body('quantity').optional().isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99.'),
];

export const addCartItem = catchAsync(async (req, res) => {
  checkValidation(req);
  const productId = Number(req.body.productId);
  const variantId = req.body.variantId ? Number(req.body.variantId) : null;
  const quantity = req.body.quantity ? Number(req.body.quantity) : 1;

  await assertProductAndVariant(productId, variantId);
  await upsertCartItem(req.user.id, productId, variantId, quantity);
  res.status(201).json({ items: await getCart(req.user.id) });
});

export const updateCartItemValidators = [
  body('quantity').isInt({ min: 1, max: 99 }).withMessage('Quantity must be between 1 and 99.'),
];

export const updateCartItem = catchAsync(async (req, res) => {
  checkValidation(req);
  const [result] = await pool.query(
    'UPDATE cart_items SET quantity = ? WHERE id = ? AND user_id = ?',
    [req.body.quantity, req.params.id, req.user.id]
  );
  if (!result.affectedRows) throw new ApiError(404, 'Cart item not found.');
  res.json({ items: await getCart(req.user.id) });
});

export const removeCartItem = catchAsync(async (req, res) => {
  await pool.query('DELETE FROM cart_items WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.json({ items: await getCart(req.user.id) });
});

export const clearCart = catchAsync(async (req, res) => {
  await pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
  res.status(204).send();
});

export const mergeCartValidators = [
  body('items').isArray().withMessage('Items must be a list.'),
];

export const mergeCart = catchAsync(async (req, res) => {
  checkValidation(req);
  // The guest cart the customer just built becomes their account's cart —
  // it replaces whatever was left over from a previous, never-checked-out
  // session, rather than combining with it (which would resurrect old items
  // the customer never asked to buy again).
  await pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]);
  for (const item of req.body.items) {
    const productId = Number(item.productId);
    const variantId = item.variantId ? Number(item.variantId) : null;
    const quantity = Math.max(1, Math.min(99, Number(item.quantity) || 1));
    if (!productId) continue;

    try {
      await assertProductAndVariant(productId, variantId);
      await upsertCartItem(req.user.id, productId, variantId, quantity);
    } catch {
      // A guest-cart line for a product/variant that no longer exists —
      // skip it rather than failing the whole merge.
    }
  }
  res.status(201).json({ items: await getCart(req.user.id) });
});
