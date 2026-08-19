import bcrypt from 'bcryptjs';
import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { signToken, cookieOptions, COOKIE_NAME } from '../utils/jwt.js';

const publicUser = (u) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  phone: u.phone,
  role: u.role,
});

export const registerValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be at least 2 characters.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

export const loginValidators = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required.'),
];

export const register = catchAsync(async (req, res) => {
  checkValidation(req);
  const { name, email, password } = req.body;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw new ApiError(409, 'An account with that email already exists.');

  // Never store the plain password — hash it first so even we can't read it back.
  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
    [name, email, passwordHash]
  );

  const user = { id: result.insertId, name, email, phone: null, role: 'customer' };
  // Log the new user in right away by creating their token and saving it as a cookie.
  const token = signToken({ id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  // Also returned in the body (not just the cookie) so native/mobile clients that can't
  // rely on browser cookies can store it themselves and send it as a Bearer token.
  res.status(201).json({ user: publicUser(user), token });
});

export const login = catchAsync(async (req, res) => {
  checkValidation(req);
  const { email, password } = req.body;

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  const user = rows[0];
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  // Compare the typed password against the stored hash (we never store the real password).
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) throw new ApiError(401, 'Invalid email or password.');

  const token = signToken({ id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.json({ user: publicUser(user), token });
});

export const logout = catchAsync(async (req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: undefined });
  res.json({ message: 'Logged out.' });
});

export const me = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [req.user.id]);
  const user = rows[0];
  if (!user) throw new ApiError(401, 'Session is no longer valid.');
  res.json({ user: publicUser(user) });
});
