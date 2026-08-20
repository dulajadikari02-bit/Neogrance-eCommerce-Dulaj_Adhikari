import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { deleteMediaByUrl } from '../utils/media.js';

const mapCategory = (c) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  gender: c.gender,
  type: c.type,
  image: c.image_url,
  displayOrder: c.display_order,
  link: `/category/${c.slug}`,
});

function slugify(text) {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const listCategories = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM categories ORDER BY display_order ASC, id ASC');
  res.json({ categories: rows.map(mapCategory) });
});

export const categoryValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name is required.'),
  body('gender').isIn(['men', 'women', 'unisex']).withMessage('Gender must be men, women, or unisex.'),
  body('type').isIn(['fragrance', 'clothing']).withMessage('Type must be fragrance or clothing.'),
  body('displayOrder').optional({ checkFalsy: true }).isInt({ min: 0 }),
];

// Turns a category name into a URL-friendly slug, adding "-2", "-3", etc.
// if that slug is already used by another category.
async function uniqueSlug(name, excludeId = null) {
  const base = slugify(name);
  let slug = base;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const [rows] = await pool.query(
      `SELECT id FROM categories WHERE slug = ? ${excludeId ? 'AND id != ?' : ''}`,
      excludeId ? [slug, excludeId] : [slug]
    );
    if (!rows.length) return slug;
    n += 1;
    slug = `${base}-${n}`;
  }
}

export const createCategory = catchAsync(async (req, res) => {
  checkValidation(req);
  const { name, gender, type, displayOrder } = req.body;
  const slug = await uniqueSlug(name);
  const imageUrl = req.file ? req.file.url : (req.body.imageUrl || null);

  const [result] = await pool.query(
    'INSERT INTO categories (name, slug, gender, type, image_url, display_order) VALUES (?, ?, ?, ?, ?, ?)',
    [name, slug, gender, type, imageUrl, displayOrder || 0]
  );
  res.status(201).json({ id: result.insertId, slug });
});

export const updateCategory = catchAsync(async (req, res) => {
  checkValidation(req);
  const { id } = req.params;
  const [[existing]] = await pool.query('SELECT * FROM categories WHERE id = ?', [id]);
  if (!existing) throw new ApiError(404, 'Category not found.');

  const { name, gender, type, displayOrder } = req.body;
  const slug = name && name !== existing.name ? await uniqueSlug(name, id) : existing.slug;
  const imageUrl = req.file ? req.file.url : (req.body.imageUrl || existing.image_url);

  await pool.query(
    'UPDATE categories SET name=?, slug=?, gender=?, type=?, image_url=?, display_order=? WHERE id = ?',
    [name || existing.name, slug, gender || existing.gender, type || existing.type, imageUrl, displayOrder ?? existing.display_order, id]
  );
  res.json({ message: 'Category updated.' });

  if (req.file && existing.image_url && existing.image_url !== imageUrl) {
    deleteMediaByUrl(existing.image_url).catch(() => {});
  }
});

export const deleteCategory = catchAsync(async (req, res) => {
  const [[inUse]] = await pool.query('SELECT COUNT(*) AS count FROM products WHERE category_id = ?', [req.params.id]);
  if (inUse.count > 0) {
    throw new ApiError(409, `Cannot delete — ${inUse.count} product(s) still use this category.`);
  }
  const [[existing]] = await pool.query('SELECT image_url FROM categories WHERE id = ?', [req.params.id]);
  if (!existing) throw new ApiError(404, 'Category not found.');

  const [result] = await pool.query('DELETE FROM categories WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Category not found.');
  res.status(204).send();

  if (existing.image_url) deleteMediaByUrl(existing.image_url).catch(() => {});
});
