import path from 'path';
import { fileURLToPath } from 'url';
import { body } from 'express-validator';
import PDFDocument from 'pdfkit';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { sendPushToAdmins } from '../utils/push.js';
import { formatOrderId, parseOrderId } from '../utils/orderIdFormat.js';
import { sendOrderConfirmationEmail, sendNewOrderAdminEmail } from '../utils/orderEmails.js';

const SHIPPING_FEE = 400;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo.png');

export const createOrderValidators = [
  body('firstName').trim().notEmpty().withMessage('First name is required.'),
  body('lastName').trim().notEmpty().withMessage('Last name is required.'),
  body('email').trim().isEmail().withMessage('A valid email is required.'),
  body('phone').trim().isLength({ min: 7 }).withMessage('A valid phone number is required.'),
  body('address1').trim().notEmpty().withMessage('Address is required.'),
  body('city').trim().notEmpty().withMessage('City is required.'),
  body('postalCode').trim().notEmpty().withMessage('Postal code is required.'),
  body('paymentMethod').isIn(['cod', 'bank_transfer']).withMessage('Invalid payment method.'),
  body('items').custom((items) => {
    const parsed = typeof items === 'string' ? JSON.parse(items) : items;
    if (!Array.isArray(parsed) || !parsed.length) throw new Error('Cart is empty.');
    return true;
  }),
];

export const createOrder = catchAsync(async (req, res) => {
  checkValidation(req);
  const { firstName, lastName, email, phone, address1, city, postalCode, paymentMethod } = req.body;
  const items = typeof req.body.items === 'string' ? JSON.parse(req.body.items) : req.body.items;

  // Use one connection for the whole checkout and wrap it in a transaction:
  // either every step (stock check, stock update, saving the order) succeeds together,
  // or if anything fails, everything is rolled back so we never save a broken order.
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    let subtotal = 0;
    const lineItems = [];
    const newlyLowStock = [];

    // Lock rows in a consistent order across all transactions (ascending product id).
    // Without this, two checkouts sharing two products but in opposite cart order can
    // each hold one lock and wait on the other's — a classic deadlock. MySQL kills one
    // side with ER_LOCK_DEADLOCK; sorting first makes that scenario structurally impossible.
    const sortedItems = [...items].sort((a, b) => Number(a.productId) - Number(b.productId));

    for (const item of sortedItems) {
      const quantity = Number(item.quantity) || 0;
      if (!item.productId || quantity < 1) throw new ApiError(400, 'Invalid cart item.');

      // "FOR UPDATE" locks this product's row until the transaction ends, so two
      // customers checking out at the same moment can't both buy the last item in stock.
      const [[product]] = await conn.query('SELECT * FROM products WHERE id = ? FOR UPDATE', [item.productId]);
      if (!product || !product.is_active) throw new ApiError(400, `Product ${item.productId} is no longer available.`);

      let unitPrice = Number(product.price);
      let variantName = null;
      // unitCost mirrors unitPrice's resolution below — snapshotted at sale time since
      // product_variants rows get fully deleted/recreated on every product edit, so a
      // historical order can never safely re-derive cost from live product/variant data.
      let unitCost = product.cost_price != null ? Number(product.cost_price) : null;
      let variant = null;
      if (item.variantId) {
        // Decants carry their own stock, separate from the full bottle's — lock
        // and check that instead of the product's own stock for this line item.
        [[variant]] = await conn.query(
          'SELECT * FROM product_variants WHERE id = ? AND product_id = ? FOR UPDATE',
          [item.variantId, product.id]
        );
        if (variant) {
          if (variant.stock < quantity) {
            throw new ApiError(400, `Only ${variant.stock} left in stock for "${product.name}" (${variant.name}).`);
          }
          unitPrice = Number(variant.price);
          variantName = variant.name;
          unitCost = (variant.ml && product.cost_price != null && product.bottle_ml)
            ? (Number(product.cost_price) / Number(product.bottle_ml)) * Number(variant.ml)
            : null;
        }
      }
      if (!variant && product.stock < quantity) {
        throw new ApiError(400, `Only ${product.stock} left in stock for "${product.name}".`);
      }

      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;
      lineItems.push({ productId: product.id, productName: product.name, variantName, unitPrice, unitCost, quantity, lineTotal });

      if (variant) {
        await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [quantity, variant.id]);
        await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [quantity, product.id]);
      } else {
        // If this order is what pushes stock at or below the low-stock threshold,
        // remember it so we can send an admin alert after the order is saved.
        const remainingStock = product.stock - quantity;
        if (product.stock > product.low_stock_threshold && remainingStock <= product.low_stock_threshold) {
          newlyLowStock.push({ name: product.name, remainingStock });
        }
        await conn.query('UPDATE products SET stock = stock - ?, sold_count = sold_count + ? WHERE id = ?', [
          quantity,
          quantity,
          product.id,
        ]);
      }
    }

    const shippingFee = SHIPPING_FEE;
    const total = subtotal + shippingFee;
    const paymentSlipUrl = req.file ? `/uploads/slips/${req.file.filename}` : null;

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, first_name, last_name, email, phone, address1, city, postal_code, payment_method, payment_slip_url, subtotal, shipping_fee, total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [req.user?.id || null, firstName, lastName, email, phone, address1, city, postalCode, paymentMethod, paymentSlipUrl, subtotal, shippingFee, total]
    );
    const orderId = orderResult.insertId;

    for (const item of lineItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, variant_name, unit_price, unit_cost, quantity, line_total)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [orderId, item.productId, item.productName, item.variantName, item.unitPrice, item.unitCost, item.quantity, item.lineTotal]
      );
    }

    await conn.commit();
    res.status(201).json({ orderId, subtotal, shippingFee, total });

    // The cart the customer just checked out is now stale — clear their
    // server-synced cart so it doesn't reappear on their next visit/device.
    // This runs after the response is already sent and doesn't block anything —
    // if it happens to fail, we just ignore it rather than breaking the order.
    if (req.user?.id) {
      pool.query('DELETE FROM cart_items WHERE user_id = ?', [req.user.id]).catch(() => {});
    }

    sendPushToAdmins(
      'New Order Received',
      `Order #${orderId} — Rs. ${total.toLocaleString()} (${paymentMethod === 'bank_transfer' ? 'Bank Transfer' : 'COD'})`,
      { type: 'order', orderId }
    );
    for (const p of newlyLowStock) {
      sendPushToAdmins('Low Stock Warning', `"${p.name}" is down to ${p.remainingStock} left in stock.`, { type: 'low_stock' });
    }

    sendOrderConfirmationEmail({ id: orderId, firstName, email, paymentMethod, subtotal, shippingFee, total }, lineItems).catch((err) =>
      console.error('Failed to send order confirmation email:', err.message)
    );

    // Every order gets its own admin email, and each one carries the full
    // pending queue as of right now — so whichever email is newest in the
    // admin's inbox is a complete, up-to-date picture of what's outstanding.
    pool.query("SELECT * FROM orders WHERE status = 'pending' ORDER BY created_at DESC")
      .then(([pendingOrders]) =>
        sendNewOrderAdminEmail(
          { id: orderId, firstName, lastName, email, phone, address1, city, postalCode, paymentMethod, subtotal, shippingFee, total },
          lineItems,
          pendingOrders
        )
      )
      .catch((err) => console.error('Failed to send new-order admin email:', err.message));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

// Only the customer who placed this order (or an admin) is allowed to see it.
// Guest orders (no user_id) skip this check since anyone with the order ID could be the guest.
function assertCanViewOrder(order, req) {
  const isOwner = req.user && order.user_id === req.user.id;
  const isAdmin = req.user && req.user.role === 'admin';
  if (order.user_id && !isOwner && !isAdmin) throw new ApiError(403, 'You cannot view this order.');
}

export const getOrder = catchAsync(async (req, res) => {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) throw new ApiError(404, 'Order not found.');
  assertCanViewOrder(order, req);

  // unit_cost is margin data — deliberately excluded here since this endpoint is customer/guest-facing.
  const [items] = await pool.query(
    'SELECT id, order_id, product_id, product_name, variant_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?',
    [order.id]
  );
  res.json({ order, items });
});

// Generates a one-page PDF invoice and streams it straight to the response —
// nothing is saved to disk. The invoice is the only place a customer ever
// sees their order's public ID (formatted, e.g. "neo_00042").
export const getInvoice = catchAsync(async (req, res) => {
  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) throw new ApiError(404, 'Order not found.');
  assertCanViewOrder(order, req);

  const [items] = await pool.query(
    'SELECT product_name, variant_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?',
    [order.id]
  );

  const publicId = formatOrderId(order.id);
  const doc = new PDFDocument({ size: 'A4', margin: 50 });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${publicId}-invoice.pdf"`);
  doc.pipe(res);

  const LEFT = 50;
  const RIGHT = 545;
  const WIDTH = RIGHT - LEFT;
  const BLACK = '#0a0a0a';
  const GRAY = '#555555';
  const FAINT = '#999999';
  const LINE = '#e5e5e5';
  const orderDate = new Date(order.created_at).toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });

  // ---- Header: logo (on its own dark chip, since the logo art is white-on-
  // transparent) on the left, "INVOICE" + date on the right. ----
  doc.roundedRect(LEFT, 40, 150, 54, 4).fill(BLACK);
  doc.image(LOGO_PATH, LEFT + 15, 55, { fit: [120, 24], align: 'center' });

  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(22).text('INVOICE', LEFT, 44, { width: WIDTH, align: 'right' });
  doc.fillColor(GRAY).font('Helvetica').fontSize(10).text(orderDate, LEFT, 72, { width: WIDTH, align: 'right' });

  doc.moveTo(LEFT, 112).lineTo(RIGHT, 112).strokeColor(BLACK).lineWidth(1.5).stroke();

  // ---- From / Bill To ----
  const infoTop = 132;
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('FROM', LEFT, infoTop);
  doc.fillColor(GRAY).font('Helvetica').fontSize(10)
    .text('Neogrance', LEFT, infoTop + 15)
    .text('Kuliyapitiya, Sri Lanka', LEFT, infoTop + 30)
    .text('+94 76 160 7224', LEFT, infoTop + 45)
    .text('neo@neogrance.com', LEFT, infoTop + 60);

  const billX = LEFT + WIDTH / 2;
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text('BILL TO', billX, infoTop);
  doc.fillColor(GRAY).font('Helvetica').fontSize(10)
    .text(`${order.first_name} ${order.last_name}`, billX, infoTop + 15)
    .text(order.address1, billX, infoTop + 30)
    .text(`${order.city}, ${order.postal_code}`, billX, infoTop + 45)
    .text(order.phone, billX, infoTop + 60)
    .text(order.email, billX, infoTop + 75);

  doc.fillColor(FAINT).font('Helvetica').fontSize(9).text(
    `Order ID: ${publicId}    •    Payment: ${order.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery'}`,
    LEFT, infoTop + 95
  );

  // ---- Line items table ----
  const col = { name: LEFT + 12, qty: 355, price: 400, total: 470 };
  let tableTop = infoTop + 125;
  doc.roundedRect(LEFT, tableTop, WIDTH, 28, 3).fill(BLACK);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(9);
  doc.text('ITEM DESCRIPTION', col.name, tableTop + 10);
  doc.text('QTY', col.qty, tableTop + 10, { width: 40, align: 'center' });
  doc.text('UNIT PRICE', col.price, tableTop + 10, { width: 65, align: 'right' });
  doc.text('TOTAL', col.total, tableTop + 10, { width: 65, align: 'right' });

  let y = tableTop + 28;
  doc.font('Helvetica').fontSize(10);
  for (const item of items) {
    const rowHeight = item.variant_name ? 34 : 24;
    doc.fillColor(BLACK).font('Helvetica-Bold').text(item.product_name, col.name, y + 8, { width: 290 });
    if (item.variant_name) {
      doc.fillColor(FAINT).font('Helvetica').fontSize(9).text(item.variant_name, col.name, y + 21, { width: 290 });
      doc.fontSize(10);
    }
    doc.fillColor(GRAY).font('Helvetica').text(String(item.quantity), col.qty, y + 8, { width: 40, align: 'center' });
    doc.text(`Rs. ${Number(item.unit_price).toLocaleString()}`, col.price, y + 8, { width: 65, align: 'right' });
    doc.fillColor(BLACK).font('Helvetica-Bold').text(`Rs. ${Number(item.line_total).toLocaleString()}`, col.total, y + 8, { width: 65, align: 'right' });
    y += rowHeight;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(1).stroke();
  }

  // ---- Totals ----
  const totalsX = billX;
  const totalsW = RIGHT - billX;
  y += 14;
  doc.fillColor(GRAY).font('Helvetica').fontSize(10);
  doc.text('Subtotal', totalsX, y, { width: totalsW - 90 });
  doc.fillColor(BLACK).text(`Rs. ${Number(order.subtotal).toLocaleString()}`, totalsX + totalsW - 90, y, { width: 90, align: 'right' });
  y += 18;
  doc.fillColor(GRAY).text('Shipping', totalsX, y, { width: totalsW - 90 });
  doc.fillColor(BLACK).text(`Rs. ${Number(order.shipping_fee).toLocaleString()}`, totalsX + totalsW - 90, y, { width: 90, align: 'right' });

  y += 26;
  doc.roundedRect(totalsX, y, totalsW, 34, 3).fill(BLACK);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11);
  doc.text('TOTAL DUE', totalsX + 14, y + 11);
  doc.text(`Rs. ${Number(order.total).toLocaleString()}`, totalsX, y + 11, { width: totalsW - 14, align: 'right' });

  // ---- Thank you + footer ----
  y += 60;
  doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(12).text('Thank you for your business.', LEFT, y, { width: WIDTH, align: 'center' });

  y += 40;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(LINE).lineWidth(1).stroke();
  y += 20;

  const footerColW = WIDTH / 3;
  const footerCol = (title, lines, x) => {
    doc.fillColor(BLACK).font('Helvetica-Bold').fontSize(9).text(title, x, y);
    doc.fillColor(GRAY).font('Helvetica').fontSize(9);
    lines.forEach((line, i) => doc.text(line, x, y + 14 + i * 13, { width: footerColW - 10 }));
  };
  footerCol('Questions?', ['neo@neogrance.com', '+94 76 160 7224'], LEFT);
  footerCol('Track Your Order', ['neogrance.com/track-order', `Use ${publicId} + your email`], LEFT + footerColW);
  footerCol('Note', ['Keep this invoice — it has', 'the order ID for tracking.'], LEFT + footerColW * 2);

  doc.end();
});

// ---------------------------------------------------------------------------
// Guest order tracking — no login required, order ID + email is the
// knowledge factor that proves the requester placed the order.
// ---------------------------------------------------------------------------

export const trackOrderValidators = [
  // Customers type back the public code we gave them (e.g. "neo_00042"), not
  // the raw database id — parseOrderId() turns that back into a real id.
  body('orderId').custom((value) => parseOrderId(value) !== null).withMessage('A valid order ID is required.'),
  body('email').trim().isEmail().withMessage('A valid email is required.'),
];

export const trackOrder = catchAsync(async (req, res) => {
  checkValidation(req);
  const { email } = req.body;
  const orderId = parseOrderId(req.body.orderId);

  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ? AND email = ?', [orderId, email]);
  if (!order) throw new ApiError(404, "No order found with that ID and email — double-check both and try again.");

  // unit_cost is margin data — deliberately excluded here since this endpoint is customer/guest-facing.
  const [items] = await pool.query(
    'SELECT id, order_id, product_id, product_name, variant_name, unit_price, quantity, line_total FROM order_items WHERE order_id = ?',
    [order.id]
  );
  res.json({ order, items });
});
