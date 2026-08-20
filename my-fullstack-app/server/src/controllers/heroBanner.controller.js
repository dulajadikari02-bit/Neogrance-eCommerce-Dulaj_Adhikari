import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';

const mapHeroBanner = (b) => ({
  id: b.id,
  title: b.title,
  subtitle: b.subtitle,
  image: b.image_url,
  buttonText: b.button_text,
  buttonLink: b.button_link,
  isActive: !!b.is_active,
});

// Public — only ever returns a hero banner when it's switched on, so the
// homepage naturally falls back to its default look while it's off.
export const getHeroBanner = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM hero_banner WHERE is_active = 1 ORDER BY updated_at DESC LIMIT 1');
  if (!rows.length) throw new ApiError(404, 'No active hero banner.');
  res.json({ heroBanner: mapHeroBanner(rows[0]) });
});

// Admin — returns the banner regardless of active state, so admin can still
// find and re-activate it after switching it off.
export const adminGetHeroBanner = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM hero_banner ORDER BY updated_at DESC LIMIT 1');
  if (!rows.length) throw new ApiError(404, 'No hero banner has been created yet.');
  res.json({ heroBanner: mapHeroBanner(rows[0]) });
});

export const heroBannerValidators = [
  body('title').optional({ checkFalsy: true }).trim().isLength({ max: 190 }),
  body('subtitle').optional({ checkFalsy: true }).trim().isLength({ max: 190 }),
  body('buttonText').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body('buttonLink').optional({ checkFalsy: true }).trim().isLength({ max: 300 }),
];

export const updateHeroBanner = catchAsync(async (req, res) => {
  checkValidation(req);
  const { title, subtitle, buttonText, buttonLink } = req.body;
  // Not filtered by is_active — otherwise saving while the banner is switched
  // off would fail to find the existing row and insert a duplicate instead.
  const [rows] = await pool.query('SELECT * FROM hero_banner ORDER BY updated_at DESC LIMIT 1');
  const existing = rows[0];
  const imageUrl = req.file ? `/uploads/hero/${req.file.filename}` : (req.body.imageUrl || existing?.image_url || null);
  const isActive = req.body.isActive === undefined
    ? (existing ? existing.is_active : 1)
    : (req.body.isActive === 'true' || req.body.isActive === true ? 1 : 0);

  if (existing) {
    await pool.query(
      `UPDATE hero_banner SET title=?, subtitle=?, image_url=?, button_text=?, button_link=?, is_active=? WHERE id = ?`,
      [title || null, subtitle || null, imageUrl, buttonText || null, buttonLink || null, isActive, existing.id]
    );
  } else {
    await pool.query(
      `INSERT INTO hero_banner (title, subtitle, image_url, button_text, button_link, is_active)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [title || null, subtitle || null, imageUrl, buttonText || null, buttonLink || null, isActive]
    );
  }

  const [updated] = await pool.query('SELECT * FROM hero_banner ORDER BY updated_at DESC LIMIT 1');
  res.json({ heroBanner: mapHeroBanner(updated[0]) });
});
