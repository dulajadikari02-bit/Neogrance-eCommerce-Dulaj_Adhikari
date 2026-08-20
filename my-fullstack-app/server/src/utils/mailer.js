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
