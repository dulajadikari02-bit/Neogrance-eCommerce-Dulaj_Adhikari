import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { sendNewsletterWelcomeEmail } from '../utils/accountEmails.js';

export const subscribeValidators = [
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
];

export const subscribe = catchAsync(async (req, res) => {
  checkValidation(req);
  const { email } = req.body;
  await pool.query(
    `INSERT INTO newsletter_subscribers (email) VALUES (?)
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [email]
  );
  res.status(201).json({ message: 'Subscribed! Thanks for joining us.' });

  sendNewsletterWelcomeEmail(email).catch((err) => console.error('Failed to send newsletter welcome email:', err.message));
});

export const listSubscribers = catchAsync(async (req, res) => {
  const [rows] = await pool.query(
    'SELECT id, email, is_active, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC'
  );
  res.json({ subscribers: rows, count: rows.length });
});
