// The database uses a plain auto-increment number for orders internally, but
// customers never see that raw number — instead we show a friendlier public
// code like "neo_00042" (always at least 5 digits, zero-padded).

export function formatOrderId(rawId) {
  return `neo_${String(rawId).padStart(5, '0')}`;
}

// Accepts what a customer might type back in: "neo_00042", "NEO_42", or just
// "42". Returns the raw numeric id, or null if the input doesn't look like
// a valid order code at all.
export function parseOrderId(input) {
  if (input === null || input === undefined) return null;
  const digits = String(input).trim().replace(/^neo_/i, '');
  if (!/^\d+$/.test(digits)) return null;
  const id = parseInt(digits, 10);
  return id > 0 ? id : null;
}
