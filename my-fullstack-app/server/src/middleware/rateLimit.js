import rateLimit from 'express-rate-limit';

// For public write endpoints that don't need the auth routes' tight limiter, but
// still shouldn't be scriptable without limit — checkout, contact form, reviews,
// newsletter signup. Generous enough for a real customer retrying a failed
// submission, tight enough to blunt a spam script.
export const publicWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});
