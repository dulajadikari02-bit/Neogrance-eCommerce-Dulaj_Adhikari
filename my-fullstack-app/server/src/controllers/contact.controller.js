import { body } from 'express-validator';
import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';
import { checkValidation } from '../utils/validate.js';
import { sendPushToAdmins } from '../utils/push.js';

export const createContactValidators = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Name is required.'),
  body('email').trim().isEmail().withMessage('A valid email is required.').normalizeEmail(),
  body('subject').trim().isLength({ min: 2, max: 190 }).withMessage('Subject is required.'),
  body('message').trim().isLength({ min: 10, max: 5000 }).withMessage('Message must be at least 10 characters.'),
];

export const createContact = catchAsync(async (req, res) => {
  checkValidation(req);
  const { name, email, subject, message } = req.body;
  await pool.query(
    'INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)',
    [name, email, subject, message]
  );
  res.status(201).json({ message: "Thanks for reaching out — we'll get back to you soon." });

  sendPushToAdmins('New Contact Message', `${name}: ${subject}`, { type: 'contact' });
});

export const listContactMessages = catchAsync(async (req, res) => {
  const [rows] = await pool.query('SELECT * FROM contact_messages ORDER BY created_at DESC');
  res.json({ messages: rows });
});

export const markContactMessageRead = catchAsync(async (req, res) => {
  const [result] = await pool.query('UPDATE contact_messages SET is_read = 1 WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Message not found.');
  res.json({ message: 'Marked as read.' });
});

export const deleteContactMessage = catchAsync(async (req, res) => {
  const [result] = await pool.query('DELETE FROM contact_messages WHERE id = ?', [req.params.id]);
  if (!result.affectedRows) throw new ApiError(404, 'Message not found.');
  res.status(204).send();
});
