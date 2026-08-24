import { sendMail, emailLayout } from './mailer.js';
import { formatOrderId } from './orderIdFormat.js';

function orderIdRow(order) {
  return `<p style="font-size: 13px; color:#b3b3b3; margin: 0 0 20px;">Order ID: <strong style="color:#ffffff;">${formatOrderId(order.id)}</strong></p>`;
}

function trackLink() {
  const url = `${process.env.CLIENT_URL || 'https://neogrance.com'}/track-order`;
  return `<p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">You can check your order status anytime at
    <a href="${url}" style="color:#ffffff; text-decoration: underline;">${url}</a> using this order ID and the email address you checked out with.</p>`;
}

// ---------------------------------------------------------------------------
// Sent the moment an order is placed.
// ---------------------------------------------------------------------------

export async function sendOrderConfirmationEmail(order, items) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; font-size: 13px; color:#e5e5e5;">
            ${item.productName}${item.variantName ? `<br><span style="color:#777; font-size:11px;">${item.variantName}</span>` : ''}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; font-size: 13px; color:#e5e5e5; text-align:center;">×${item.quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #1f1f1f; font-size: 13px; color:#ffffff; text-align:right;">Rs. ${Number(item.lineTotal).toLocaleString()}</td>
        </tr>`
    )
    .join('');

  const html = emailLayout({
    preheader: `Your Neogrance order has been placed — ${formatOrderId(order.id)}`,
    headline: `Thanks for your order, ${order.firstName}!`,
    bodyHtml: `
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">
        We've received your order${order.paymentMethod === 'bank_transfer' ? " and it's awaiting confirmation of your payment slip" : ''}.
      </p>
      ${orderIdRow(order)}
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        ${rows}
      </table>
      <table style="width:100%; margin-top: 8px;">
        <tr><td style="font-size:12px; color:#888; padding:3px 0;">Subtotal</td><td style="font-size:12px; color:#e5e5e5; text-align:right; padding:3px 0;">Rs. ${Number(order.subtotal).toLocaleString()}</td></tr>
        <tr><td style="font-size:12px; color:#888; padding:3px 0;">Shipping</td><td style="font-size:12px; color:#e5e5e5; text-align:right; padding:3px 0;">Rs. ${Number(order.shippingFee).toLocaleString()}</td></tr>
        <tr><td style="font-size:14px; color:#ffffff; font-weight:bold; padding:10px 0 0; border-top:1px solid #1f1f1f;">Total</td><td style="font-size:14px; color:#ffffff; font-weight:bold; text-align:right; padding:10px 0 0; border-top:1px solid #1f1f1f;">Rs. ${Number(order.total).toLocaleString()}</td></tr>
      </table>
      <div style="margin-top:24px;">${trackLink()}</div>
    `,
  });

  await sendMail({ to: order.email, subject: `Order Confirmed — ${formatOrderId(order.id)}`, html });
}

// ---------------------------------------------------------------------------
// Sent to the admin inbox every time an order is placed — the new order's
// own detail, plus a running list of every order still pending, so whoever
// reads the latest email has the full outstanding queue without needing to
// open the dashboard first.
// ---------------------------------------------------------------------------

export async function sendNewOrderAdminEmail(order, items, pendingOrders) {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
  if (!adminEmail) return; // not configured — skip quietly, same as every other email here

  const itemRows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #1f1f1f; font-size: 12px; color:#e5e5e5;">
            ${item.productName}${item.variantName ? `<br><span style="color:#777; font-size:10px;">${item.variantName}</span>` : ''}
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #1f1f1f; font-size: 12px; color:#e5e5e5; text-align:center;">×${item.quantity}</td>
          <td style="padding: 8px 0; border-bottom: 1px solid #1f1f1f; font-size: 12px; color:#ffffff; text-align:right;">Rs. ${Number(item.lineTotal).toLocaleString()}</td>
        </tr>`
    )
    .join('');

  const pendingRows = pendingOrders.length
    ? pendingOrders
        .map(
          (o) => `
        <tr>
          <td style="padding: 7px 0; border-bottom: 1px solid #1f1f1f; font-size: 11px; color:#e5e5e5; font-family: monospace;">${formatOrderId(o.id)}</td>
          <td style="padding: 7px 0; border-bottom: 1px solid #1f1f1f; font-size: 11px; color:#e5e5e5;">${o.first_name} ${o.last_name}</td>
          <td style="padding: 7px 0; border-bottom: 1px solid #1f1f1f; font-size: 11px; color:#ffffff; text-align:right;">Rs. ${Number(o.total).toLocaleString()}</td>
        </tr>`
        )
        .join('')
    : `<tr><td colspan="3" style="padding: 8px 0; font-size: 11px; color:#777;">No other pending orders.</td></tr>`;

  const html = emailLayout({
    preheader: `New order ${formatOrderId(order.id)} — Rs. ${Number(order.total).toLocaleString()}`,
    headline: `New Order — ${formatOrderId(order.id)}`,
    bodyHtml: `
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">
        ${order.firstName} ${order.lastName} just placed an order${order.paymentMethod === 'bank_transfer' ? ' via bank transfer — awaiting slip approval' : ' (Cash on Delivery)'}.
      </p>
      <table style="width:100%; margin: 12px 0 20px;">
        <tr><td style="font-size:12px; color:#888; padding:2px 0;">Email</td><td style="font-size:12px; color:#e5e5e5; text-align:right;">${order.email}</td></tr>
        <tr><td style="font-size:12px; color:#888; padding:2px 0;">Phone</td><td style="font-size:12px; color:#e5e5e5; text-align:right;">${order.phone}</td></tr>
        <tr><td style="font-size:12px; color:#888; padding:2px 0;">Address</td><td style="font-size:12px; color:#e5e5e5; text-align:right;">${order.address1}, ${order.city}</td></tr>
      </table>
      <table style="width:100%; border-collapse: collapse; margin-bottom: 12px;">${itemRows}</table>
      <table style="width:100%;">
        <tr><td style="font-size:14px; color:#ffffff; font-weight:bold; padding:10px 0 0; border-top:1px solid #1f1f1f;">Total</td><td style="font-size:14px; color:#ffffff; font-weight:bold; text-align:right; padding:10px 0 0; border-top:1px solid #1f1f1f;">Rs. ${Number(order.total).toLocaleString()}</td></tr>
      </table>

      <h2 style="font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color:#ffffff; margin: 28px 0 12px; padding-top: 20px; border-top: 1px solid #1f1f1f;">
        Pending Orders (${pendingOrders.length})
      </h2>
      <table style="width:100%; border-collapse: collapse;">${pendingRows}</table>
    `,
  });

  await sendMail({
    to: adminEmail,
    subject: `New Order — ${formatOrderId(order.id)} (Rs. ${Number(order.total).toLocaleString()})`,
    html,
  });
}

// ---------------------------------------------------------------------------
// Sent when an admin changes an order's status. No email for "pending" —
// that's just the order's starting state, not something that happened.
// ---------------------------------------------------------------------------

const STATUS_COPY = {
  processing: { subject: 'Your order is being processed', headline: 'Your order is being processed', body: "We're preparing your order for shipment." },
  shipped: { subject: 'Your order has shipped', headline: 'Your order is on its way!', body: 'Your order has been shipped and is on its way to you.' },
  delivered: { subject: 'Your order has been delivered', headline: 'Delivered', body: 'Your order has been marked as delivered. We hope you love it!' },
  cancelled: { subject: 'Your order was cancelled', headline: 'Order Cancelled', body: 'Your order has been cancelled. If you have questions, please get in touch with us.' },
};

export async function sendOrderStatusEmail(order) {
  const copy = STATUS_COPY[order.status];
  if (!copy) return;

  const html = emailLayout({
    preheader: copy.subject,
    headline: copy.headline,
    bodyHtml: `
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">Hi ${order.first_name},</p>
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">${copy.body}</p>
      ${orderIdRow({ id: order.id })}
      ${trackLink()}
    `,
  });

  await sendMail({ to: order.email, subject: `${copy.subject} — ${formatOrderId(order.id)}`, html });
}
