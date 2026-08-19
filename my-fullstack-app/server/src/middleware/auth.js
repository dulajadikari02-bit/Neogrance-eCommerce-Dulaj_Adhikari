import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { ApiError } from '../utils/catchAsync.js';
import { pool } from '../config/db.js';

// Find the login token, either from the browser cookie or from an
// "Authorization: Bearer <token>" header (used by non-browser clients).
function extractToken(req) {
  if (req.cookies?.[COOKIE_NAME]) return req.cookies[COOKIE_NAME];
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) return header.slice(7);
  return null;
}

// Populates req.user if a valid token is present; never rejects the request.
export function attachUser(req, res, next) {
  const token = extractToken(req);
  if (!token) return next();
  try {
    req.user = verifyToken(token);
  } catch {
    // ignore invalid/expired token, treat request as unauthenticated
  }
  next();
}

// Rejects the request unless a valid token is present.
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) return next(new ApiError(401, 'Please log in to continue.'));
  try {
    req.user = verifyToken(token);
    next();
  } catch {
    next(new ApiError(401, 'Invalid or expired session, please log in again.'));
  }
}

// 'admin' is the SuperAdmin role — full access, including revenue and destructive actions.
export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return next(new ApiError(403, 'Admin access required.'));
  }
  next();
}

// 'staff' is a restricted admin role — order processing and stock updates only.
// Lets both staff and admin into the admin panel; individual routes layer requireAdmin
// on top where an action is SuperAdmin-only (see admin.routes.js).
//
// This is the one admin-panel gate that hits the DB instead of trusting the JWT's role
// claim: a SuperAdmin revoking someone's staff access needs to take effect immediately,
// not whenever their (up to 7-day) token happens to expire. It refreshes req.user.role
// with the current value, so requireAdmin and every controller downstream see it too.
export async function requireStaffOrAdmin(req, res, next) {
  if (!req.user) return next(new ApiError(403, 'Admin access required.'));
  try {
    // Ask the database for this user's role right now, instead of trusting
    // the role saved inside their token (which could be out of date).
    const [[row]] = await pool.query('SELECT role FROM users WHERE id = ?', [req.user.id]);
    if (!row || (row.role !== 'staff' && row.role !== 'admin')) {
      return next(new ApiError(403, 'Admin access required.'));
    }
    req.user.role = row.role;
    next();
  } catch (err) {
    next(err);
  }
}
