import { ApiError } from '../utils/catchAsync.js';

export function notFoundHandler(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

// This runs whenever any route calls next(err) or throws inside catchAsync.
// It looks at what kind of error happened and sends back a friendly message
// and the right HTTP status code, instead of leaking raw error details.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // MySQL's "duplicate entry" error, e.g. trying to register an email that's already taken.
  if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ message: 'That value is already in use.' });
  }

  // The login token was invalid or has expired.
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Invalid or expired session, please log in again.' });
  }

  // Multer's error for a file that's bigger than the allowed size.
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Uploaded file is too large.' });
  }

  // Anything else is unexpected — log it for debugging but don't expose the details to the client.
  console.error(err);
  const status = err.statusCode || 500;
  res.status(status).json({
    message: status === 500 ? 'Something went wrong on our end.' : err.message,
  });
}
