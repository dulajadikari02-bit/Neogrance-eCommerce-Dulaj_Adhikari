import api, { errorMessage } from '../../lib/api';

export const inputCls =
  'w-full bg-black border border-gray-900 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors';

// Builds a CSV from a list of objects + [key, header] column defs and triggers a download.
export function downloadCsv(filename, rows, columns) {
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [
    columns.map(([, header]) => escape(header)).join(','),
    ...rows.map((row) => columns.map(([key]) => escape(row[key])).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Slips are served through an authenticated endpoint, not a plain static
// file, so viewing one means fetching it as an authorized request and
// opening the result — same pattern as the invoice PDF download.
export async function viewPaymentSlip(orderId) {
  try {
    const { data } = await api.get(`/admin/orders/${orderId}/slip`, { responseType: 'blob' });
    const url = URL.createObjectURL(data);
    window.open(url, '_blank');
    // The new tab needs a moment to actually load the blob before we revoke it.
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    alert(errorMessage(err, 'Could not load the payment slip.'));
  }
}
