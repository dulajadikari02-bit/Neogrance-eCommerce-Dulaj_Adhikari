// Turns the database's raw numeric order id into the friendlier public code
// customers see, e.g. 42 -> "neo_00042". Mirrors server/src/utils/orderIdFormat.js.
export function formatOrderId(rawId) {
  return `neo_${String(rawId).padStart(5, '0')}`;
}
