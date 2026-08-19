import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

// Creates a signed login token containing the given data (e.g. user id and role).
// The token proves who the user is without the server needing to store sessions.
export function signToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
}

// Checks that a token is genuine and not expired, and returns the data inside it.
// Throws an error if the token was tampered with or has expired.
export function verifyToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

const isProd = process.env.NODE_ENV === 'production';

export const COOKIE_NAME = 'token';

// Settings for the cookie that stores the login token in the browser.
// httpOnly stops JavaScript on the page from reading it (safer against attacks).
export const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? 'none' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/',
};
