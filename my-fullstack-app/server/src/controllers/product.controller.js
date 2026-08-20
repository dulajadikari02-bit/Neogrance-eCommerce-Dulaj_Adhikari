import { body, query } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { sendPushToAdmins } from '../utils/push.js';
import { mapProduct, mapAdminProduct, PRODUCT_BASE_SELECT as BASE_SELECT } from '../utils/productMapper.js';
import { deleteMediaByUrl } from '../utils/media.js';

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ---------------------------------------------------------------------------
// Public listing
// ---------------------------------------------------------------------------

export const listValidators = [
  query('gender').optional().isIn(['men', 'women', 'unisex']),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  query('offset').optional().isInt({ min: 0 }).toInt(),
];

export const listProducts = catchAsync(async (req, res) => {
  checkValidation(req);
  const { gender, category, search } = req.query;
  const limit = req.query.limit || 24;
  const offset = req.query.offset || 0;

  // Build the SQL WHERE clause piece by piece, only adding a condition
  // (and its matching "?" placeholder) for filters the caller actually sent.
  const where = ['p.is_active = 1'];
  const params = [];

  if (gender) {
    where.push('(p.gender = ? OR p.gender = "unisex")');
    params.push(gender);
  }
  if (category) {
    where.push('c.slug = ?');
    params.push(category);
  }
  if (search) {
    where.push('p.name LIKE ?');
    params.push(`%${search}%`);
  }

  const sql = `${BASE_SELECT} WHERE ${where.join(' AND ')} ORDER BY p.created_at DESC LIMIT ? OFFSET ?`;
  const [rows] = await pool.query(sql, [...params, limit, offset]);
  res.json({ products: rows.map(mapProduct) });
});

// "Top rated" is really a popularity score: sales count matters most, views count a
// little, and having lots of good reviews boosts it further. Not just the highest star rating.
export const topRated = catchAsync(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 24);
  const sql = `
    SELECT p.*, c.name AS category_name,
      (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS avg_rating,
      (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count,
      (p.sold_count * 3 + p.view_count * 1
        + COALESCE((SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved'), 0)
          * (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') * 2
      ) AS score
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.is_active = 1
    ORDER BY score DESC, p.created_at DESC
    LIMIT ?
  `;
  const [rows] = await pool.query(sql, [limit]);
  res.json({ products: rows.map(mapProduct) });
});

export const newArrivals = catchAsync(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 8, 24);
  const sql = `${BASE_SELECT} WHERE p.is_active = 1 ORDER BY p.created_at DESC LIMIT ?`;
  const [rows] = await pool.query(sql, [limit]);
  res.json({ products: rows.map(mapProduct) });
});

export const getProduct = catchAsync(async (req, res) => {
  const { idOrSlug } = req.params;
  const isNumeric = /^\d+$/.test(idOrSlug);
  const sql = `${BASE_SELECT} WHERE ${isNumeric ? 'p.id = ?' : 'p.slug = ?'} AND p.is_active = 1`;
  const [rows] = await pool.query(sql, [idOrSlug]);
  if (!rows.length) throw new ApiError(404, 'Product not found.');
  const product = rows[0];

  await pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [product.id]);
  product.view_count += 1;

  const [variants] = await pool.query(
    'SELECT id, name, label, price, ml, sort_order FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC',
    [product.id]
  );
  const [reviews] = await pool.query(
    `SELECT id, reviewer_name, rating, review_text, image_url, created_at FROM reviews
     WHERE product_id = ? AND status = 'approved' ORDER BY created_at DESC LIMIT 20`,
    [product.id]
  );

  let relatedProducts = [];
  if (product.category_id) {
    const [relatedRows] = await pool.query(
      `${BASE_SELECT} WHERE p.category_id = ? AND p.id != ? AND p.is_active = 1 ORDER BY p.sold_count DESC, p.created_at DESC LIMIT 4`,
      [product.category_id, product.id]
    );
    relatedProducts = relatedRows.map(mapProduct);
  }

  res.json({
    product: mapProduct(product),
    variants: variants.map((v) => ({ id: v.id, name: v.name, label: v.label, price: Number(v.price), ml: v.ml })),
    reviews,
    relatedProducts,
  });
});

// ---------------------------------------------------------------------------
// Reviews
// ---------------------------------------------------------------------------

export const reviewValidators = [
  body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5.'),
  body('reviewText').trim().isLength({ min: 5, max: 2000 }).withMessage('Review must be at least 5 characters.'),
];

export const createReview = catchAsync(async (req, res) => {
  checkValidation(req);
  const productId = req.params.id;
  const [[product]] = await pool.query('SELECT id, name FROM products WHERE id = ?', [productId]);
  if (!product) throw new ApiError(404, 'Product not found.');

  const [[user]] = await pool.query('SELECT name FROM users WHERE id = ?', [req.user.id]);
  if (!user) throw new ApiError(401, 'Session is no longer valid.');

  const { rating, reviewText } = req.body;
  const imageUrl = req.file ? req.file.url : null;
  await pool.query(
    `INSERT INTO reviews (product_id, user_id, reviewer_name, rating, review_text, image_url, status)
     VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
    [productId, req.user.id, user.name, rating, reviewText, imageUrl]
  );
  res.status(201).json({ message: 'Thanks! Your review will appear once approved by our team.' });

  sendPushToAdmins('New Review Submitted', `${user.name} left a ${rating}-star review on "${product.name}".`, {
    type: 'review',
  });
});

export const approvedReviews = catchAsync(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 6, 24);
  const [rows] = await pool.query(
    `SELECT r.id, r.reviewer_name, r.rating, r.review_text, r.created_at, p.name AS product_name
     FROM reviews r JOIN products p ON p.id = r.product_id
     WHERE r.status = 'approved' ORDER BY r.created_at DESC LIMIT ?`,
    [limit]
  );
  res.json({ reviews: rows });
});

// ---------------------------------------------------------------------------
// Admin: product listing / CRUD
// ---------------------------------------------------------------------------

export const adminListProducts = catchAsync(async (req, res) => {
  const { search, categoryId, lowStockOnly } = req.query;
  const where = [];
  const params = [];

  if (search) {
    where.push('(p.name LIKE ? OR p.sku LIKE ? OR p.id = ?)');
    params.push(`%${search}%`, `%${search}%`, Number(search) || 0);
  }
  if (categoryId) {
    where.push('p.category_id = ?');
    params.push(categoryId);
  }
  if (lowStockOnly === 'true') {
    where.push('p.stock <= p.low_stock_threshold');
  }

  const sql = `${BASE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.created_at DESC`;
  const [rows] = await pool.query(sql, params);
  res.json({ products: rows.map(mapAdminProduct) });
});

export const adminGetProduct = catchAsync(async (req, res) => {
  const [rows] = await pool.query(`${BASE_SELECT} WHERE p.id = ?`, [req.params.id]);
  if (!rows.length) throw new ApiError(404, 'Product not found.');
  const [variants] = await pool.query(
    'SELECT id, name, label, price, ml, sort_order FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC',
    [req.params.id]
  );
  res.json({ product: mapAdminProduct(rows[0]), variants: variants.map((v) => ({ ...v, price: Number(v.price) })) });
});

export const productValidators = [
  body('name').trim().isLength({ min: 2, max: 190 }).withMessage('Name is required.'),
  body('price').isFloat({ min: 0 }).withMessage('Price must be a positive number.'),
  body('costPrice').isFloat({ min: 0 }).withMessage('Cost price is required.'),
  body('bottleMl').isInt({ min: 1 }).withMessage('Full bottle size (ml) is required.'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or more.'),
  body('gender').isIn(['men', 'women', 'unisex']).withMessage('Gender must be men, women, or unisex.'),
  body('categoryId').optional({ checkFalsy: true }).isInt().withMessage('Invalid category.'),
  body('lowStockThreshold').optional({ checkFalsy: true }).isInt({ min: 0 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 5000 }),
  body('topNotes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('heartNotes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('baseNotes').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('variants').custom((value, { req }) => {
    const fullBottleAvailable = req.body.fullBottleAvailable === 'true' || req.body.fullBottleAvailable === true;
    let variants = [];
    try {
      variants = typeof value === 'string' ? JSON.parse(value) : (value || []);
    } catch {
      variants = [];
    }
    if (!fullBottleAvailable && (!Array.isArray(variants) || variants.length === 0)) {
      throw new Error('At least one size must be available.');
    }
    return true;
  }),
];

// Turns a product name into a URL-friendly slug, and if that slug is already
// taken by another product, keeps trying "-2", "-3", etc. until a free one is found.
async function uniqueSlug(name, excludeId = null) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await pool.query(
      `SELECT id FROM products WHERE slug = ? ${excludeId ? 'AND id != ?' : ''}`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (!rows.length) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

// Replaces all of a product's variants with the given list, inside the caller's transaction.
async function replaceVariants(conn, productId, variantsJson) {
  if (variantsJson === undefined) return;
  let variants;
  try {
    variants = typeof variantsJson === 'string' ? JSON.parse(variantsJson) : variantsJson;
  } catch {
    throw new ApiError(400, 'Invalid variants payload.');
  }
  if (!Array.isArray(variants)) throw new ApiError(400, 'Variants must be a list.');

  // Simplest way to keep variants in sync with the form: delete all the old
  // ones and insert the new list fresh, rather than trying to update each one individually.
  await conn.query('DELETE FROM product_variants WHERE product_id = ?', [productId]);
  for (let i = 0; i < variants.length; i++) {
    const v = variants[i];
    if (!v.name || v.price === undefined || v.price === '') continue;
    await conn.query(
      'INSERT INTO product_variants (product_id, name, label, price, ml, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
      [productId, v.name, v.label || null, Number(v.price), v.ml || null, i]
    );
  }
}

export const createProduct = catchAsync(async (req, res) => {
  checkValidation(req);
  const { name, description, topNotes, heartNotes, baseNotes, price, costPrice, bottleMl, stock, lowStockThreshold, categoryId, gender } = req.body;
  const fullBottleAvailable = req.body.fullBottleAvailable === undefined
    ? true
    : (req.body.fullBottleAvailable === 'true' || req.body.fullBottleAvailable === true);
  const slug = await uniqueSlug(name);
  const sku = `NEO-${Date.now().toString(36).toUpperCase()}`;

  const files = req.files || {};
  const mainFile = files.mainImage?.[0];
  const hoverFile = files.hoverImage?.[0];
  const galleryFile = files.galleryImage?.[0];

  const imageUrl = mainFile ? mainFile.url : req.body.imageUrl;
  if (!imageUrl) throw new ApiError(400, 'A main product image is required.');
  const hoverImageUrl = hoverFile ? hoverFile.url : imageUrl;
  const image3Url = galleryFile ? galleryFile.url : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const [result] = await conn.query(
      `INSERT INTO products (name, slug, description, top_notes, heart_notes, base_notes, price, cost_price, bottle_ml, full_bottle_available, stock, low_stock_threshold, category_id, gender, image_url, hover_image_url, image3_url, sku)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description || null, topNotes || null, heartNotes || null, baseNotes || null, price, costPrice || null, bottleMl || null, fullBottleAvailable ? 1 : 0, stock, lowStockThreshold || 5, categoryId || null, gender, imageUrl, hoverImageUrl, image3Url, sku]
    );
    await replaceVariants(conn, result.insertId, req.body.variants);
    await conn.commit();
    res.status(201).json({ id: result.insertId, slug });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export const updateProduct = catchAsync(async (req, res) => {
  checkValidation(req);
  const { id } = req.params;
  const [[existing]] = await pool.query('SELECT * FROM products WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Product not found.');

  const { name, description, topNotes, heartNotes, baseNotes, price, stock, lowStockThreshold, categoryId, gender, isActive } = req.body;
  // Blank strings mean "left untouched" (matches the checkFalsy validator, which treats them as not-provided too).
  const costPrice = req.body.costPrice === '' ? undefined : req.body.costPrice;
  const bottleMl = req.body.bottleMl === '' ? undefined : req.body.bottleMl;
  const fullBottleAvailable = req.body.fullBottleAvailable === undefined
    ? existing.full_bottle_available
    : (req.body.fullBottleAvailable === 'true' || req.body.fullBottleAvailable === true ? 1 : 0);
  const slug = name && name !== existing.name ? await uniqueSlug(name, id) : existing.slug;

  const files = req.files || {};
  const mainFile = files.mainImage?.[0];
  const hoverFile = files.hoverImage?.[0];
  const galleryFile = files.galleryImage?.[0];

  const imageUrl = mainFile ? mainFile.url : (req.body.imageUrl || existing.image_url);
  const hoverImageUrl = hoverFile ? hoverFile.url : existing.hover_image_url;
  const image3Url = galleryFile ? galleryFile.url : existing.image3_url;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `UPDATE products SET name=?, slug=?, description=?, top_notes=?, heart_notes=?, base_notes=?, price=?, cost_price=?, bottle_ml=?, full_bottle_available=?, stock=?, low_stock_threshold=?,
         category_id=?, gender=?, image_url=?, hover_image_url=?, image3_url=?, is_active=?
       WHERE id = ?`,
      [
        name || existing.name,
        slug,
        description ?? existing.description,
        topNotes ?? existing.top_notes,
        heartNotes ?? existing.heart_notes,
        baseNotes ?? existing.base_notes,
        price ?? existing.price,
        costPrice ?? existing.cost_price,
        bottleMl ?? existing.bottle_ml,
        fullBottleAvailable,
        stock ?? existing.stock,
        lowStockThreshold ?? existing.low_stock_threshold,
        categoryId ?? existing.category_id,
        gender || existing.gender,
        imageUrl,
        hoverImageUrl,
        image3Url,
        isActive === undefined ? existing.is_active : (isActive === 'true' || isActive === true ? 1 : 0),
        id,
      ]
    );
    await replaceVariants(conn, id, req.body.variants);
    await conn.commit();
    res.json({ message: 'Product updated.' });

    // Clean up whichever old images just got replaced — but only once we're
    // sure nothing else still points at them (e.g. the hover image often
    // just reuses the main image's url, so don't delete that shared row).
    const stillInUse = [imageUrl, hoverImageUrl, image3Url].filter(Boolean);
    if (mainFile && existing.image_url && !stillInUse.includes(existing.image_url)) {
      deleteMediaByUrl(existing.image_url).catch(() => {});
    }
    if (hoverFile && existing.hover_image_url && !stillInUse.includes(existing.hover_image_url)) {
      deleteMediaByUrl(existing.hover_image_url).catch(() => {});
    }
    if (galleryFile && existing.image3_url && !stillInUse.includes(existing.image3_url)) {
      deleteMediaByUrl(existing.image3_url).catch(() => {});
    }
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export const deleteProduct = catchAsync(async (req, res) => {
  const [[existing]] = await pool.query(
    'SELECT image_url, hover_image_url, image3_url FROM products WHERE id = ?',
    [req.params.id]
  );
  if (!existing) throw new ApiError(404, 'Product not found.');

  const [result] = await pool.query('DELETE FROM products WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Product not found.');
  res.status(204).send();

  // Same image can be reused across slots (e.g. no hover image uploaded),
  // so dedupe before deleting to avoid trying to delete an already-gone row.
  const urls = new Set([existing.image_url, existing.hover_image_url, existing.image3_url].filter(Boolean));
  for (const url of urls) deleteMediaByUrl(url).catch(() => {});
});

export const statusValidators = [
  body('isActive').isBoolean().withMessage('isActive must be true or false.'),
];

export const updateProductStatus = catchAsync(async (req, res) => {
  checkValidation(req);
  const isActive = req.body.isActive === true || req.body.isActive === 'true';
  const [result] = await pool.query('UPDATE products SET is_active = ? WHERE id = ?', [isActive ? 1 : 0, req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Product not found.');
  res.json({ message: isActive ? 'Product activated.' : 'Product deactivated.' });
});

export const lowStockProducts = catchAsync(async (req, res) => {
  const sql = `${BASE_SELECT} WHERE p.is_active = 1 AND p.stock <= p.low_stock_threshold ORDER BY p.stock ASC`;
  const [rows] = await pool.query(sql);
  res.json({ products: rows.map(mapProduct) });
});

// ---------------------------------------------------------------------------
// Stock updates — the narrow slice of product editing Staff accounts get,
// separate from the full product-edit form which is SuperAdmin-only.
// ---------------------------------------------------------------------------

export const updateStockValidators = [
  body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or more.'),
];

export const updateStock = catchAsync(async (req, res) => {
  checkValidation(req);
  const [result] = await pool.query('UPDATE products SET stock = ? WHERE id = ?', [req.body.stock, req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Product not found.');
  res.json({ message: 'Stock updated.' });
});

export const bulkUpdateStockValidators = [
  body('productIds').isArray({ min: 1 }).withMessage('Select at least one product.'),
  body('stock').isInt({ min: 0 }).withMessage('Stock must be zero or more.'),
];

export const bulkUpdateStock = catchAsync(async (req, res) => {
  checkValidation(req);
  const ids = req.body.productIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) throw new ApiError(400, 'Select at least one product.');

  const [result] = await pool.query(
    `UPDATE products SET stock = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    [req.body.stock, ...ids]
  );
  res.json({ message: `Stock updated for ${result.affectedRows} product(s).`, updated: result.affectedRows });
});

export const bulkUpdateStatusValidators = [
  body('productIds').isArray({ min: 1 }).withMessage('Select at least one product.'),
  body('isActive').isBoolean().withMessage('isActive must be true or false.'),
];

export const bulkUpdateStatus = catchAsync(async (req, res) => {
  checkValidation(req);
  const ids = req.body.productIds.map(Number).filter((id) => Number.isInteger(id) && id > 0);
  if (!ids.length) throw new ApiError(400, 'Select at least one product.');
  const isActive = req.body.isActive === true || req.body.isActive === 'true';

  const [result] = await pool.query(
    `UPDATE products SET is_active = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
    [isActive ? 1 : 0, ...ids]
  );
  res.json({
    message: `${result.affectedRows} product(s) ${isActive ? 'activated' : 'deactivated'}.`,
    updated: result.affectedRows,
  });
});
