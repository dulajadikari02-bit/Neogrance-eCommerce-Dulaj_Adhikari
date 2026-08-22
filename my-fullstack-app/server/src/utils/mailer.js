import nodemailer from 'nodemailer';

// Only sets up a real transporter if SMTP credentials are actually present —
// local dev usually won't have them configured, so emails just get skipped
// with a log line instead of crashing whatever triggered them.
const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 465,
      // Port 465 uses SSL from the start of the connection; other ports
      // (like 587) upgrade to encryption after connecting instead.
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  : null;

export async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.warn('SMTP not configured — skipping email:', subject);
    return;
  }
  await transporter.sendMail({
    from: `"Neogrance" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
}

// Shared look for every email this site sends — dark header band, uppercase
// letter-spaced headings and a gold accent, echoing the site's own
// minimalist black/white/gold storefront styling. Email clients can't load
// the site's custom font, so this sticks to a plain, widely-supported stack.
export function emailLayout({ preheader, headline, bodyHtml }) {
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
