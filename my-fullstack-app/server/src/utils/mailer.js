import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOGO_PATH = path.join(__dirname, '..', '..', 'assets', 'logo.png');
const LOGO_CID = 'neogrance-logo';

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
    // Embedded (not linked) so the logo shows immediately in every email
    // client, including ones that block remote images by default.
    attachments: [{ filename: 'logo.png', path: LOGO_PATH, cid: LOGO_CID }],
  });
}

// Shared look for every email this site sends — the same black/white
// minimalist dark theme as the storefront itself, with the real logo (not a
// text wordmark). Email clients can't load the site's custom font, so this
// sticks to a plain, widely-supported stack, approximating its uppercase,
// letter-spaced look with bold + letter-spacing instead.
export function emailLayout({ preheader, headline, bodyHtml }) {
  return `
    <div style="background:#000000; padding: 32px 16px; font-family: Arial, Helvetica, sans-serif;">
      <span style="display:none; max-height:0; overflow:hidden;">${preheader || ''}</span>
      <div style="max-width: 520px; margin: 0 auto; background:#0a0a0a; border-radius: 10px; overflow: hidden; border: 1px solid #222;">
        <div style="background:#000000; padding: 32px; text-align:center; border-bottom: 1px solid #1f1f1f;">
          <img src="cid:${LOGO_CID}" alt="Neogrance" width="150" style="display:block; margin: 0 auto; border:0;" />
          <div style="color:#888; font-size: 10px; letter-spacing: 3px; text-transform: uppercase; margin-top: 14px;">Minimalist Luxury Fragrances</div>
        </div>
        <div style="padding: 32px;">
          <h1 style="font-size: 16px; letter-spacing: 2px; text-transform: uppercase; color: #ffffff; margin: 0 0 16px; font-weight: bold;">${headline}</h1>
          ${bodyHtml}
        </div>
        <div style="background:#000000; border-top:1px solid #1f1f1f; padding: 20px 32px; text-align:center;">
          <p style="color:#666; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase; margin:0;">Thank you for shopping with Neogrance</p>
        </div>
      </div>
    </div>
  `;
}
