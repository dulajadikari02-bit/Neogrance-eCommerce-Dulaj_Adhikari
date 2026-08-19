import { Expo } from 'expo-server-sdk';
import { pool } from '../config/db.js';

const expo = new Expo();

// Sends a push notification to every registered admin device. Best-effort —
// a failure here should never break the request that triggered it (order
// placement, review submission, etc.), so callers just fire-and-forget this.
export async function sendPushToAdmins(title, body, data = {}) {
  try {
    const [rows] = await pool.query(
      `SELECT pt.token FROM push_tokens pt JOIN users u ON u.id = pt.user_id WHERE u.role IN ('admin', 'staff')`
    );
    const messages = rows
      .filter((r) => Expo.isExpoPushToken(r.token))
      .map((r) => ({ to: r.token, sound: 'default', title, body, data }));
    if (!messages.length) return;

    const chunks = expo.chunkPushNotifications(messages);
    for (const chunk of chunks) {
      await expo.sendPushNotificationsAsync(chunk);
    }
  } catch (err) {
    console.error('sendPushToAdmins failed:', err.message);
  }
}
