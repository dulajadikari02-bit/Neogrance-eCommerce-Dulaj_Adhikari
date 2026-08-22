import { sendMail } from './mailer.js';
import { formatOrderId } from './orderIdFormat.js';

// Shared look for every order-related email — dark header band, uppercase
// letter-spaced headings and a thin gold divider, echoing the site's own
// minimalist black/white/gold storefront styling. Email clients can't load
// the site's custom font, so this sticks to a plain, widely-supported stack.
function emailLayout({ preheader, headline, bodyHtml }) {
  return `
    <div style="background:#f4f4f4; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
      <span style="display:none; max-height:0; overflow:hidden;">${preheader || ''}</span>
      <div style="max-width: 520px; margin: 0 auto; background:#ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #eaeaea;">
        <div style="background:#0a0a0a; padding: 28px 32px; text-align:center;">
          <div style="color:#ffffff; font-size: 20px; letter-spacing: 5px; text-transform: uppercase; font-weight: bold;">Neogrance</div>
          <div style="color:#b8975a; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 6px;">Minimalist Luxury Fragrances</div>
        </div>
        <div style="padding: 32px;">
          <h1 style="font-size: 18px; letter-spacing: 1px; color: #111; margin: 0 0 16px;">${headline}</h1>
          ${bodyHtml}
        </div>
        <div style="background:#fafafa; border-top:1px solid #eee; padding: 20px 32px; text-align:center;">
          <p style="color:#999; font-size: 11px; letter-spacing: 0.5px; margin:0;">Thank you for shopping with Neogrance.</p>
        </div>
      </div>
    </div>
  `;
}

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
