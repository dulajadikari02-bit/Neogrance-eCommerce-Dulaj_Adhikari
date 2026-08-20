import { pool } from '../config/db.js';
import { catchAsync, ApiError } from '../utils/catchAsync.js';

export const getMedia = catchAsync(async (req, res) => {
  const [[row]] = await pool.query('SELECT mime_type, data FROM media WHERE id = ?', [req.params.id]);
  if (!row) throw new ApiError(404, 'Image not found.');
  res.setHeader('Content-Type', row.mime_type);
  // Images are immutable once created (an edit inserts a new row rather
  // than changing this one), so it's safe for browsers to cache forever.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(row.data);
});
