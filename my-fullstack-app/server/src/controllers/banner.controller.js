import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { deleteMediaByUrl } from '../utils/media.js';

const mapBanner = (b) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  description: b.description,
  image: b.image_url,
  buttonText: b.button_text,
  buttonLink: b.button_link,
  isActive: !!b.is_active,
});

// Public — only ever returns a banner when it's switched on, so the storefront
// naturally shows nothing while it's off (no client-side check needed).
export const getBanner = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM promo_banner WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1');
  if (!rows.length) throw new ApiError(404, 'No active promo banner.');
  res.json({ banner: mapBanner(rows[0]) });
});

// Admin — returns the banner regardless of active state, so admin can still
// find and re-activate it after switching it off.
export const adminGetBanner = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM promo_banner ORDER BY updated_at DESC LIMIT 1');
  if (!rows.length) throw new ApiError(404, 'No promo banner has been created yet.');
  res.json({ banner: mapBanner(rows[0]) });
});

export const bannerValidators = [
  body('title').trim().isLength({ min: 2, max: 190 }).withMessage('Title is required.'),
  body('subtitle').optional({ checkFalsy: true }).trim().isLength({ max: 190 }),
  body('description').optional({ checkFalsy: true }).trim().isLength({ max: 500 }),
  body('buttonText').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('buttonLink').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
];

export const updateBanner = catchAsync(async (req, res) => {
  checkValidation(req);
  const { title, subtitle, description, buttonText, buttonLink } = req.body;
  // Not filtered by is_active — otherwise saving while the banner is switched
  // off would fail to find the existing row and insert a duplicate instead.
  const [rows] = await pool.query('SELECT * FROM promo_banner ORDER BY updated_at DESC LIMIT 1');
  const existing = rows[0];
  const imageUrl = req.file ? req.file.url : (req.body.imageUrl || existing?.image_url || null);
  const isActive = req.body.isActive === undefined
    ? (existing ? existing.is_active : 1)
    : (req.body.isActive === 'true' || req.body.isActive === true ? 1 : 0);

  if (existing) {
    await pool.query(
      `UPDATE promo_banner SET title=?, subtitle=?, description=?, image_url=?, button_text=?, button_link=?, is_active=? WHERE id = ?`,
      [title, subtitle || null, description || null, imageUrl, buttonText || null, buttonLink || null, isActive, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO promo_banner (title, subtitle, description, image_url, button_text, button_link, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [title, subtitle || null, description || null, imageUrl, buttonText || null, buttonLink || null, isActive]
    );
  }

  const [updated] = await pool.query('SELECT * FROM promo_banner ORDER BY updated_at DESC LIMIT 1');
  res.json({ banner: mapBanner(updated[0]) });

  if (req.file && existing?.image_url && existing.image_url !== imageUrl) {
    deleteMediaByUrl(existing.image_url).catch(() => {});
  }
});
