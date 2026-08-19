import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email, phone: u.phone, role: u.role });

export const updateProfileValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be at least 2 characters.'),
  body('phone').optional({ checkFalsy: true }).trim().isLength({ max: 30 }).withMessage('Phone number is too long.'),
];

export const updateProfile = catchAsync(async (req, res) => {
  checkValidation(req);
  const { name, phone } = req.body;
  await pool.query('UPDATE users SET name = ?, phone = ? WHERE id = ?', [name, phone || null, req.user.id]);
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  res.json({ user: publicUser(rows[0]) });
});

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export const addressValidators = [
  body('label').optional({ checkFalsy: true }).trim().isLength({ max: 60 }),
  body('recipientName').trim().isLength({ min: 2, max: 120 }).withMessage('Recipient name is required.'),
  body('phone').trim().isLength({ min: 7, max: 30 }).withMessage('A valid phone number is required.'),
  body('line1').trim().isLength({ min: 3, max: 190 }).withMessage('Address line 1 is required.'),
  body('line2').optional({ checkFalsy: true }).trim().isLength({ max: 190 }),
  body('city').trim().isLength({ min: 1, max: 100 }).withMessage('City is required.'),
  body('postalCode').trim().isLength({ min: 1, max: 20 }).withMessage('Postal code is required.'),
  body('country').optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
];

const mapAddress = (a) => ({
  id: a.id,
  label: a.label,
  recipientName: a.recipient_name,
  phone: a.phone,
  line1: a.line1,
  line2: a.line2,
  city: a.city,
  postalCode: a.postal_code,
  country: a.country,
  isDefault: !!a.is_default,
});

export const listAddresses = catchAsync(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id DESC',
    [req.user.id]
  );
  res.json({ addresses: rows.map(mapAddress) });
});

// A user can only have one default address at a time, so before setting a new
// default we clear the flag off any address that currently has it.
async function unsetOtherDefaults(userId, conn = pool) {
  await conn.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
}

export const createAddress = catchAsync(async (req, res) => {
  checkValidation(req);
  const { label, recipientName, phone, line1, line2, city, postalCode, country, isDefault } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Make this the default address if the user asked for it, or automatically
    // if it's their very first saved address (so they're never left with no default).
    const [[{ count }]] = await conn.query('SELECT COUNT(*) AS count FROM addresses WHERE user_id = ?', [req.user.id]);
    const makeDefault = !!isDefault || count === 0;
    if (makeDefault) await unsetOtherDefaults(req.user.id, conn);

    const [result] = await conn.query(
      `INSERT INTO addresses (user_id, label, recipient_name, phone, line1, line2, city, postal_code, country, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, label || 'Home', recipientName, phone, line1, line2 || null, city, postalCode, country || 'Sri Lanka', makeDefault ? 1 : 0]
    );

    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM addresses WHERE id = ?', [result.insertId]);
    res.status(201).json({ address: mapAddress(rows[0]) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

async function getOwnedAddress(userId, addressId) {
  const [rows] = await pool.query('SELECT * FROM addresses WHERE id = ? AND user_id = ?', [addressId, userId]);
  if (!rows.length) throw new ApiError(404, 'Address not found.');
  return rows[0];
}

export const updateAddress = catchAsync(async (req, res) => {
  checkValidation(req);
  await getOwnedAddress(req.user.id, req.params.id);
  const { label, recipientName, phone, line1, line2, city, postalCode, country, isDefault } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) await unsetOtherDefaults(req.user.id, conn);

    await conn.query(
      `UPDATE addresses SET label=?, recipient_name=?, phone=?, line1=?, line2=?, city=?, postal_code=?, country=?, is_default=?
       WHERE id = ? AND user_id = ?`,
      [label || 'Home', recipientName, phone, line1, line2 || null, city, postalCode, country || 'Sri Lanka', isDefault ? 1 : 0, req.params.id, req.user.id]
    );
    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM addresses WHERE id = ?', [req.params.id]);
    res.json({ address: mapAddress(rows[0]) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

export const deleteAddress = catchAsync(async (req, res) => {
  await getOwnedAddress(req.user.id, req.params.id);
  await pool.query('DELETE FROM addresses WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
  res.status(204).send();
});

export const setDefaultAddress = catchAsync(async (req, res) => {
  await getOwnedAddress(req.user.id, req.params.id);
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await unsetOtherDefaults(req.user.id, conn);
    await conn.query('UPDATE addresses SET is_default = 1 WHERE id = ? AND user_id = ?', [req.params.id, req.user.id]);
    await conn.commit();
    const [rows] = await pool.query('SELECT * FROM addresses WHERE id = ?', [req.params.id]);
    res.json({ address: mapAddress(rows[0]) });
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// ---------------------------------------------------------------------------
// My orders
// ---------------------------------------------------------------------------

export const myOrders = catchAsync(async (req, res) => {
  const [orders] = await pool.query('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC', [req.user.id]);
  res.json({ orders });
});
