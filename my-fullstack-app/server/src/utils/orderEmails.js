import { sendMail } from './mailer.js';
import { formatOrderId } from './orderIdFormat.js';

// No email for "pending" — that's just the order's starting state, not
// something that happened. Only real status changes get an email.
const STATUS_COPY = {
  processing: {
    subject: 'Your order is being processed',
    headline: 'Your order is being processed',
    body: "We're preparing your order for shipment.",
  },
  shipped: {
    subject: 'Your order has shipped',
    headline: 'Your order is on its way!',
    body: 'Your order has been shipped and is on its way to you.',
  },
  delivered: {
    subject: 'Your order has been delivered',
    headline: 'Delivered',
    body: 'Your order has been marked as delivered. We hope you love it!',
  },
  cancelled: {
    subject: 'Your order was cancelled',
    headline: 'Order Cancelled',
    body: 'Your order has been cancelled. If you have questions, please get in touch with us.',
  },
};

export async function sendOrderStatusEmail(order) {
  const copy = STATUS_COPY[order.status];
  if (!copy) return;

  const publicId = formatOrderId(order.id);
  const trackUrl = `${process.env.CLIENT_URL || 'https://neogrance.com'}/track-order`;

  await sendMail({
    to: order.email,
    subject: `${copy.subject} — ${publicId}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; color: #111;">
        <h2 style="letter-spacing: 2px; text-transform: uppercase;">Neogrance</h2>
        <h3>${copy.headline}</h3>
        <p>Hi ${order.first_name},</p>
        <p>${copy.body}</p>
        <p>Order ID: <strong>${publicId}</strong></p>
        <p>You can check your order status anytime at
          <a href="${trackUrl}">${trackUrl}</a> using this order ID and the email address you checked out with.</p>
        <p style="color: #888; font-size: 12px; margin-top: 32px;">Thank you for shopping with Neogrance.</p>
      </div>
    `,
  });
}
