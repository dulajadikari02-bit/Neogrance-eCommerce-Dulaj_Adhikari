import { sendMail, emailLayout } from './mailer.js';

export async function sendWelcomeEmail(user) {
  const shopUrl = process.env.CLIENT_URL || 'https://neogrance.com';
  const html = emailLayout({
    preheader: 'Welcome to Neogrance',
    headline: `Welcome, ${user.name}!`,
    bodyHtml: `
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">
        Your account has been created. You can now check out faster, save addresses, and see your order history any time you sign in.
      </p>
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6; margin-top: 16px;">
        Ready to explore? <a href="${shopUrl}" style="color:#ffffff; text-decoration: underline;">${shopUrl}</a>
      </p>
    `,
  });
  await sendMail({ to: user.email, subject: 'Welcome to Neogrance', html });
}

export async function sendNewsletterWelcomeEmail(email) {
  const shopUrl = process.env.CLIENT_URL || 'https://neogrance.com';
  const html = emailLayout({
    preheader: "You're subscribed to Neogrance",
    headline: "You're on the list!",
    bodyHtml: `
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">
        Thanks for subscribing. You'll be the first to hear about new arrivals, exclusive releases, and promotions.
      </p>
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6; margin-top: 16px;">
        In the meantime, browse the collection: <a href="${shopUrl}" style="color:#ffffff; text-decoration: underline;">${shopUrl}</a>
      </p>
    `,
  });
  await sendMail({ to: email, subject: "You're subscribed to Neogrance", html });
}

export async function sendPasswordResetEmail(user, token) {
  const resetUrl = `${process.env.CLIENT_URL || 'https://neogrance.com'}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  const html = emailLayout({
    preheader: 'Reset your Neogrance password',
    headline: 'Reset your password',
    bodyHtml: `
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">Hi ${user.name},</p>
      <p style="font-size: 13px; color:#b3b3b3; line-height: 1.6;">
        We received a request to reset your password. Click the button below to choose a new one — this link expires in 1 hour.
      </p>
      <div style="text-align:center; margin: 28px 0;">
        <a href="${resetUrl}" style="display:inline-block; background:#ffffff; color:#000000; text-decoration:none; padding: 13px 32px; border-radius: 6px; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Reset Password</a>
      </div>
      <p style="font-size: 12px; color:#777; line-height: 1.6;">
        If you didn't request this, you can safely ignore this email — your password won't be changed.
      </p>
    `,
  });
  await sendMail({ to: user.email, subject: 'Reset your Neogrance password', html });
}
