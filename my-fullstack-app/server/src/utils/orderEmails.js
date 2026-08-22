import { sendMail, emailLayout } from './mailer.js';
import { formatOrderId } from './orderIdFormat.js';

function orderIdRow(order) {
  return `<p style="font-size: 13px; color:#555; margin: 0 0 20px;">Order ID: <strong style="color:#111;">${formatOrderId(order.id)}</strong></p>`;
}

function trackLink() {
  const url = `${process.env.CLIENT_URL || 'https://neogrance.com'}/track-order`;
  return `<p style="font-size: 13px; color:#555; line-height: 1.6;">You can check your order status anytime at
    <a href="${url}" style="color:#111;">${url}</a> using this order ID and the email address you checked out with.</p>`;
}

// ---------------------------------------------------------------------------
// Sent the moment an order is placed.
// ---------------------------------------------------------------------------

export async function sendOrderConfirmationEmail(order, items) {
  const rows = items
    .map(
      (item) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; color:#333;">
            ${item.productName}${item.variantName ? `<br><span style="color:#999; font-size:11px;">${item.variantName}</span>` : ''}
          </td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; color:#333; text-align:center;">×${item.quantity}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-size: 13px; color:#111; text-align:right;">Rs. ${Number(item.lineTotal).toLocaleString()}</td>
        </tr>`
    )
    .join('');

  const html = emailLayout({
    preheader: `Your Neogrance order has been placed — ${formatOrderId(order.id)}`,
    headline: `Thanks for your order, ${order.firstName}!`,
    bodyHtml: `
      <p style="font-size: 13px; color:#555; line-height: 1.6;">
        We've received your order${order.paymentMethod === 'bank_transfer' ? " and it's awaiting confirmation of your payment slip" : ''}.
      </p>
      ${orderIdRow(order)}
      <table style="width:100%; border-collapse: collapse; margin: 16px 0;">
        ${rows}
      </table>
      <table style="width:100%; margin-top: 8px;">
        <tr><td style="font-size:12px; color:#777; padding:3px 0;">Subtotal</td><td style="font-size:12px; color:#333; text-align:right; padding:3px 0;">Rs. ${Number(order.subtotal).toLocaleString()}</td></tr>
        <tr><td style="font-size:12px; color:#777; padding:3px 0;">Shipping</td><td style="font-size:12px; color:#333; text-align:right; padding:3px 0;">Rs. ${Number(order.shippingFee).toLocaleString()}</td></tr>
        <tr><td style="font-size:14px; color:#111; font-weight:bold; padding:10px 0 0; border-top:1px solid #eee;">Total</td><td style="font-size:14px; color:#111; font-weight:bold; text-align:right; padding:10px 0 0; border-top:1px solid #eee;">Rs. ${Number(order.total).toLocaleString()}</td></tr>
      </table>
      <div style="margin-top:24px;">${trackLink()}</div>
    `,
  });

  await sendMail({ to: order.email, subject: `Order Confirmed — ${formatOrderId(order.id)}`, html });
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
      <p style="font-size: 13px; color:#555; line-height: 1.6;">Hi ${order.first_name},</p>
      <p style="font-size: 13px; color:#555; line-height: 1.6;">${copy.body}</p>
      ${orderIdRow({ id: order.id })}
      ${trackLink()}
    `,
  });

  await sendMail({ to: order.email, subject: `${copy.subject} — ${formatOrderId(order.id)}`, html });
}
