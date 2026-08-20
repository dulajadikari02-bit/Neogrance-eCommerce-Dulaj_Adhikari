import { pool } from '../config/db.js';

export async function saveMedia(buffer, mimeType) {
  const [result] = await pool.query('INSERT INTO media (mime_type, data) VALUES (?, ?)', [mimeType, buffer]);
  return result.insertId;
}

// Image URLs point at "/media/<id>" — this pulls the numeric id back out so
// an old image can be found and deleted when it's replaced.
export function mediaIdFromUrl(url) {
  if (!url) return null;
  const match = /^\/media\/(\d+)$/.exec(url);
  return match ? Number(match[1]) : null;
}

// Deletes an old image's row once it's no longer used (replaced by a new
// upload, or the product/banner/review that used it was deleted) — without
// this, replaced photos would just pile up in the database forever.
export async function deleteMediaByUrl(url) {
  const id = mediaIdFromUrl(url);
  if (id) await pool.query('DELETE FROM media WHERE id = ?', [id]);
}
