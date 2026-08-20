import api from './api';

// Downloads the invoice PDF for an order and saves it straight to the
// visitor's device — the browser never navigates away from the current page.
export async function downloadOrderInvoice(orderId) {
  const { data, headers } = await api.get(`/orders/${orderId}/invoice`, { responseType: 'blob' });
  // Pull the "neo_00042-invoice.pdf"-style filename the server suggested,
  // since a blob download otherwise has no filename of its own.
  const match = /filename="(.+)"/.exec(headers['content-disposition'] || '');
  const filename = match ? match[1] : 'invoice.pdf';

  const url = URL.createObjectURL(data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
