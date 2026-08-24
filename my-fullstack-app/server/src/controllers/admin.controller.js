import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import { body, query } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { saveMedia } from '../utils/media.js';
import { sendOrderStatusEmail } from '../utils/orderEmails.js';

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
// One-time cleanup: move any images still saved on local disk (from before
// uploads were switched to database storage) into the media table, so they
// stop being at risk of disappearing on the next redeploy. Safe to run more
// than once — anything already using a /media/ url is simply skipped.
// ---------------------------------------------------------------------------

// Every column this cleanup is allowed to touch — an explicit allow-list, not
// something derived from caller input. table/idColumn/urlColumn get
// interpolated into raw SQL below (identifiers can't be parameterized with
// `?`), so this list is what keeps that interpolation from ever becoming a
// SQL injection vector: migrateColumn refuses to run for anything not in it.
const MIGRATABLE_COLUMNS = [
  { key: 'products_image', table: 'products', idColumn: 'id', urlColumn: 'image_url' },
  { key: 'products_hover', table: 'products', idColumn: 'id', urlColumn: 'hover_image_url' },
  { key: 'products_gallery', table: 'products', idColumn: 'id', urlColumn: 'image3_url' },
  { key: 'categories', table: 'categories', idColumn: 'id', urlColumn: 'image_url' },
  { key: 'promo_banner', table: 'promo_banner', idColumn: 'id', urlColumn: 'image_url' },
  { key: 'hero_banner', table: 'hero_banner', idColumn: 'id', urlColumn: 'image_url' },
  { key: 'reviews', table: 'reviews', idColumn: 'id', urlColumn: 'image_url' },
];

async function migrateColumn({ table, idColumn, urlColumn }) {
  const isAllowed = MIGRATABLE_COLUMNS.some(
    (c) => c.table === table && c.idColumn === idColumn && c.urlColumn === urlColumn
  );
  if (!isAllowed) throw new Error(`migrateColumn: "${table}.${urlColumn}" is not in the allow-list.`);

  const [rows] = await pool.query(
    `SELECT ${idColumn} AS id, ${urlColumn} AS url FROM ${table} WHERE ${urlColumn} LIKE '/uploads/%'`
  );
  let migrated = 0;
  let missing = 0;
  for (const row of rows) {
    const filePath = path.join(process.cwd(), row.url.replace(/^\//, ''));
    if (!fs.existsSync(filePath)) {
      missing += 1;
      continue;
    }
    const buffer = fs.readFileSync(filePath);
    const mediaId = await saveMedia(buffer, 'image/jpeg');
    await pool.query(`UPDATE ${table} SET ${urlColumn} = ? WHERE ${idColumn} = ?`, [`/media/${mediaId}`, row.id]);
    migrated += 1;
  }
  return { migrated, missing };
}

export const migrateLegacyImages = catchAsync(async (req, res) => {
  const results = {};
  for (const column of MIGRATABLE_COLUMNS) {
    results[column.key] = await migrateColumn(column);
  }
  const totalMigrated = Object.values(results).reduce((sum, r) => sum + r.migrated, 0);
  const totalMissing = Object.values(results).reduce((sum, r) => sum + r.missing, 0);
  res.json({
    message: `Migrated ${totalMigrated} image(s) into the database.${totalMissing ? ` ${totalMissing} referenced file(s) were not found on disk.` : ''}`,
    results,
  });
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

// Lets a SuperAdmin pull a review that's already live on the storefront
// (e.g. flagged after the fact) — separate from reject, which is only for
// reviews still pending approval.
export const deleteReview = catchAsync(async (req, res) => {
  const [result] = await pool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Review not found.');
  res.status(204).send();
});

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const listOrders = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 200');
  res.json({ orders: rows });
});

// Streams a bank-transfer payment slip to an authorized admin/staff viewer.
// Not reachable without a valid staff/admin session (see admin.routes.js) —
// slips used to be served as plain static files, which meant anyone with the
// URL could view a customer's payment proof with no login at all.
export const getOrderSlip = catchAsync(async (req, res) => {
  const [[order]] = await pool.query('SELECT payment_slip_url FROM orders WHERE id = ?', [req.params.id]);
  if (!order || !order.payment_slip_url) throw new ApiError(404, 'No payment slip for this order.');

  // payment_slip_url is always "/uploads/slips/<filename>" (set by the server
  // itself at checkout, never from user input) — path.basename() strips any
  // directory components anyway, so this can never resolve outside the slips
  // folder no matter what ends up in that column.
  const filename = path.basename(order.payment_slip_url);
  const filePath = path.join(process.cwd(), 'uploads', 'slips', filename);
  if (!fs.existsSync(filePath)) throw new ApiError(404, 'Payment slip file not found.');

  res.set('Cache-Control', 'private, no-store');
  res.sendFile(filePath);
});

// Full detail for one order — the customer's contact/shipping info plus every
// line item, for staff packing the order. Unlike the customer-facing getOrder
// (order.controller.js), this has no ownership check: anyone in the admin
// panel (staff or SuperAdmin) is already trusted to see any order.
export const getOrderDetail = catchAsync(async (req, res) => {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) throw new ApiError(404, 'Order not found.');
  const [items] = await pool.query(
    'SELECT id, product_id, product_name, variant_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?',
    [order.id]
  );
  res.json({ order, items });
});

export const updateOrderStatusValidators = [
  body('status').isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled']).withMessage('Invalid status.'),
];

export const updateOrderStatus = catchAsync(async (req, res) => {
  checkValidation(req);
  const [result] = await pool.query('UPDATE orders SET status = ? WHERE id = ?', [req.body.status, req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Order not found.');
  res.json({ message: 'Order status updated.' });

  // Email the customer about the change — runs after the response is
  // already sent, and a failed email (bad SMTP creds, etc.) shouldn't ever
  // fail the status update itself, so any error here is just logged.
  const [[order]] = await pool.query('SELECT id, email, first_name, status FROM orders WHERE id = ?', [req.params.id]);
  if (order) {
    sendOrderStatusEmail(order).catch((err) => console.error('Failed to send order status email:', err.message));
  }
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
    // Counts a product once even if both it and one of its decants are low —
    // this mirrors the "Low Stock Only" filter in the products list, so the
    // dashboard tile and the filtered list always agree on the same number.
    pool.query(`
      SELECT COUNT(DISTINCT p.id) AS lowStockCount
      FROM products p
      WHERE p.is_active = 1 AND (
        p.stock <= p.low_stock_threshold
        OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.stock <= p.low_stock_threshold)
      )
    `),
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
