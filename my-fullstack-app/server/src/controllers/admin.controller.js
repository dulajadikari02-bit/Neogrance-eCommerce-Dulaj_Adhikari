import bcrypt from 'bcryptjs';
import { body, query } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';

// ---------------------------------------------------------------------------
// Push notification device tokens
// ---------------------------------------------------------------------------

export const registerPushToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'A push token is required.');
  await pool.query(
    'INSERT INTO push_tokens (user_id, token) VALUES (?, ?) ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)',
    [req.user.id, token]
  );
  res.status(204).send();
});

export const unregisterPushToken = catchAsync(async (req, res) => {
  const { token } = req.body;
  if (!token) throw new ApiError(400, 'A push token is required.');
  await pool.query('DELETE FROM push_tokens WHERE token = ?', [token]);
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Review moderation
// ---------------------------------------------------------------------------

export const listReviewsValidators = [
  query('status').optional().isIn(['pending', 'approved', 'rejected']),
];

export const listReviews = catchAsync(async (req, res) => {
  checkValidation(req);
  const status = req.query.status || 'pending';
  const [rows] = await pool.query(
    `SELECT r.*, p.name AS product_name FROM reviews r
     JOIN products p ON p.id = r.product_id
     WHERE r.status = ? ORDER BY r.created_at DESC`,
    [status]
  );
  res.json({ reviews: rows });
});

async function setReviewStatus(id, status) {
  const [result] = await pool.query('UPDATE reviews SET status = ? WHERE id = ?', [status, id]);
  if (!result.affectedRows) throw new ApiError(404, 'Review not found.');
}

export const approveReview = catchAsync(async (req, res) => {
  await setReviewStatus(req.params.id, 'approved');
  res.json({ message: 'Review approved.' });
});

export const rejectReview = catchAsync(async (req, res) => {
  await setReviewStatus(req.params.id, 'rejected');
  res.json({ message: 'Review rejected.' });
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const listOrders = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  res.json({ orders: rows });
});

export const updateOrderStatusValidators = [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status.'),
];

export const updateOrderStatus = catchAsync(async (req, res) => {
  checkValidation(req);
  const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Order not found.');
  res.json({ message: 'Order status updated.' });
});

// ---------------------------------------------------------------------------
// Customers
// ---------------------------------------------------------------------------

export const listCustomers = catchAsync(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT u.id, u.name, u.email, u.phone, u.created_at,
      COUNT(o.id) AS order_count,
      COALESCE(SUM(o.total), 0) AS total_spent
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY total_spent DESC
  `);
  res.json({
    customers: rows.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      joinedAt: c.created_at,
      orderCount: c.order_count,
      totalSpent: Number(c.total_spent),
    })),
  });
});

// ---------------------------------------------------------------------------
// Analytics
// ---------------------------------------------------------------------------

export const categorySalesAnalytics = catchAsync(async (req, res) => {
  const [rows] = await pool.query(`
    SELECT COALESCE(c.name, 'Uncategorized') AS name, COALESCE(SUM(oi.line_total), 0) AS sales
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id
    LEFT JOIN order_items oi ON oi.product_id = p.id
    LEFT JOIN orders o ON o.id = oi.order_id AND o.status != 'cancelled'
    GROUP BY c.id
    ORDER BY sales DESC
  `);
  res.json({ categorySales: rows.map((r) => ({ name: r.name, sales: Number(r.sales) })) });
});

// Profit sums only line items with a known unit_cost (snapshotted at checkout — see
// order.controller.js). Items with no cost data are excluded, not treated as zero cost,
// so missing cost info can never inflate the profit figure.
// In simple terms: profit = (price the customer paid - what it cost us) x how many were sold.
const PROFIT_EXPR = `SUM(CASE WHEN oi.unit_cost IS NOT NULL THEN (oi.unit_price - oi.unit_cost) * oi.quantity ELSE 0 END)`;

export const profitTrend = catchAsync(async (req, res) => {
  const granularity = req.query.granularity === 'week' ? 'week' : 'month';

  if (granularity === 'week') {
    const [rows] = await pool.query(`
      SELECT
        YEARWEEK(o.created_at, 3) AS bucketKey,
        DATE_SUB(DATE(o.created_at), INTERVAL WEEKDAY(o.created_at) DAY) AS periodStart,
        COALESCE(${PROFIT_EXPR}, 0) AS profit
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status != 'cancelled' AND o.created_at >= DATE_SUB(CURDATE(), INTERVAL 12 WEEK)
      GROUP BY bucketKey, periodStart
      ORDER BY bucketKey ASC
    `);
    return res.json({
      granularity,
      trend: rows.map((r) => ({ period: r.periodStart, profit: Number(r.profit) })),
    });
  }

  const [rows] = await pool.query(`
    SELECT
      DATE_FORMAT(o.created_at, '%Y-%m') AS periodStart,
      COALESCE(${PROFIT_EXPR}, 0) AS profit
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    WHERE o.status != 'cancelled'
      AND o.created_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 11 MONTH)
    GROUP BY periodStart
    ORDER BY periodStart ASC
  `);
  res.json({
    granularity,
    trend: rows.map((r) => ({ period: r.periodStart, profit: Number(r.profit) })),
  });
});

// ---------------------------------------------------------------------------
// Dashboard summary
// ---------------------------------------------------------------------------

export const dashboardSummary = catchAsync(async (req, res) => {
  const isSuperAdmin = req.user.role === 'admin';

  // These 8 counts are all independent — running them in series was 8 round-trips
  // of pure latency for no reason. Promise.all fires them concurrently over the pool.
  // In short: ask the database all these questions at the same time instead of one by one, to save time.
  const [
    [[{ pendingReviews }]],
    [[{ lowStockCount }]],
    [[{ subscriberCount }]],
    [[{ orderCount }]],
    [[{ productCount }]],
    [[{ totalOrders }]],
    [[{ deliveredOrders }]],
    [[{ unreadMessages }]],
    revenueRow,
    profitRow,
  ] = await Promise.all([
    pool.query("SELECT COUNT(*) AS pendingReviews FROM reviews WHERE status = 'pending'"),
    pool.query('SELECT COUNT(*) AS lowStockCount FROM products WHERE is_active = 1 AND stock <= low_stock_threshold'),
    pool.query('SELECT COUNT(*) AS subscriberCount FROM newsletter_subscribers WHERE is_active = 1'),
    pool.query("SELECT COUNT(*) AS orderCount FROM orders WHERE status = 'pending'"),
    pool.query('SELECT COUNT(*) AS productCount FROM products WHERE is_active = 1'),
    pool.query("SELECT COUNT(*) AS totalOrders FROM orders WHERE status != 'cancelled'"),
    pool.query("SELECT COUNT(*) AS deliveredOrders FROM orders WHERE status = 'delivered'"),
    pool.query('SELECT COUNT(*) AS unreadMessages FROM contact_messages WHERE is_read = 0'),
    // Revenue and profit are SuperAdmin-only figures — Staff process orders but don't see the business's takings.
    isSuperAdmin
      ? pool.query("SELECT COALESCE(SUM(total), 0) AS totalRevenue FROM orders WHERE status != 'cancelled'")
      : Promise.resolve(null),
    isSuperAdmin
      ? pool.query(`
          SELECT COALESCE(${PROFIT_EXPR}, 0) AS totalProfit
          FROM order_items oi JOIN orders o ON o.id = oi.order_id
          WHERE o.status != 'cancelled'
        `)
      : Promise.resolve(null),
  ]);
  const totalRevenue = isSuperAdmin ? Number(revenueRow[0][0].totalRevenue) : null;
  const totalProfit = isSuperAdmin ? Number(profitRow[0][0].totalProfit) : null;

  res.json({
    unreadMessages,
    pendingReviews,
    lowStockCount,
    subscriberCount,
    pendingOrders: orderCount,
    productCount,
    totalOrders,
    ...(isSuperAdmin && { totalRevenue, totalProfit }),
    deliveredOrders,
  });
});

// ---------------------------------------------------------------------------
// Staff accounts (SuperAdmin only — see admin.routes.js)
// ---------------------------------------------------------------------------

export const listStaff = catchAsync(async (req, res) => {
  const [rows] = await pool.query(
    "SELECT id, name, email, phone, created_at FROM users WHERE role = 'staff' ORDER BY created_at DESC"
  );
  res.json({ staff: rows });
});

export const createStaffValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name must be at least 2 characters.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
];

export const createStaff = catchAsync(async (req, res) => {
  checkValidation(req);
  const { name, email, password } = req.body;

  const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
  if (existing.length) throw new ApiError(409, 'An account with that email already exists.');

  const passwordHash = await bcrypt.hash(password, 10);
  const [result] = await pool.query(
    "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'staff')",
    [name, email, passwordHash]
  );
  res.status(201).json({ id: result.insertId, name, email });
});

// Reversible — steps a staff account back down to an ordinary customer account
// rather than deleting it, so their action history (if any) stays intact.
export const revokeStaff = catchAsync(async (req, res) => {
  const [result] = await pool.query("UPDATE users SET role = 'customer' WHERE id = ? AND role = 'staff'", [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Staff account not found.');
  res.json({ message: 'Staff access revoked.' });
});
