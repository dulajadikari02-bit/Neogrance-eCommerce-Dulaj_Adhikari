import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { signToken, cookieOptions, COOKIE_NAME } from '../utils/jwt.js';

const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;

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

  // Any past guest orders placed with this same email (no account existed
  // yet, so user_id was left null) now belong to this new account too, so
  // they show up in "my orders" instead of being stuck as guest-only.
  await pool.query('UPDATE orders SET user_id = ? WHERE email = ? AND user_id IS NULL', [result.insertId, email]);

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

// "Continue with Google" — the frontend hands us the ID token Google issued
// after the user signed in; we verify it really came from Google and really
// is for our app (the audience check), then log the matching account in
// (or create one, since a verified Google email is as good as one they
// proved via a password reset link).
export const googleAuth = catchAsync(async (req, res) => {
  if (!googleClient) throw new ApiError(500, 'Google sign-in is not configured on this server.');
  const { credential } = req.body;
  if (!credential) throw new ApiError(400, 'Missing Google credential.');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: process.env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new ApiError(401, 'Invalid Google sign-in.');
  }
  if (!payload?.email) throw new ApiError(400, 'That Google account has no email.');
  const { email, name } = payload;

  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  let user = rows[0];

  if (!user) {
    // Google accounts never log in with a password, so this is just a
    // random, unusable placeholder to satisfy the column's NOT NULL
    // constraint — not a real credential anyone could guess or use.
    const placeholderHash = await bcrypt.hash(crypto.randomUUID(), 10);
    const [result] = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)',
      [name || email.split('@')[0], email, placeholderHash]
    );
    // Same as regular registration — any past guest orders under this
    // email now belong to the new account too.
    await pool.query('UPDATE orders SET user_id = ? WHERE email = ? AND user_id IS NULL', [result.insertId, email]);
    user = { id: result.insertId, name: name || email.split('@')[0], email, phone: null, role: 'customer' };
  }

  const token = signToken({ id: user.id, role: user.role });
  res.cookie(COOKIE_NAME, token, cookieOptions);
  res.json({ user: publicUser(user), token });
});
