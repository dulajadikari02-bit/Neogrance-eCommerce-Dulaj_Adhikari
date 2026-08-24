import { useEffect, useState } from 'react';
import api, { errorMessage } from '../../lib/api';
import { viewPaymentSlip } from './adminUtils';

// Fetches and shows one order's full detail (shipping address, phone, every
// line item) — what staff actually need to pack it. Lazy: only fetches once
// its row is expanded, and caches nothing since orders can change status
// while the panel's open. Shared by OrdersTab and DeliveredOrdersTab.
export default function OrderDetailPanel({ orderId }) {
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setDetail(null);
    setError('');
    api.get(`/admin/orders/${orderId}`)
      .then(({ data }) => { if (!cancelled) setDetail(data); })
      .catch((err) => { if (!cancelled) setError(errorMessage(err)); });
    return () => { cancelled = true; };
  }, [orderId]);

  if (error) return <p className="text-[11px] text-red-400 px-2 py-3">{error}</p>;
  if (!detail) return <p className="text-[11px] text-gray-600 uppercase tracking-widest px-2 py-3">Loading order details...</p>;

  const { order, items } = detail;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2 py-4">
      <div>
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Ship To</p>
        <p className="text-white font-medium">{order.first_name} {order.last_name}</p>
        <p className="text-gray-400 mt-1">{order.address1}</p>
        <p className="text-gray-400">{order.city}, {order.postal_code}</p>
        <p className="text-gray-400 mt-2">{order.phone}</p>
        <p className="text-gray-400">{order.email}</p>
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-3">
          {order.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'Cash on Delivery'}
          {order.payment_method === 'bank_transfer' && (
            order.payment_slip_url ? (
              <button onClick={() => viewPaymentSlip(order.id)} className="ml-2 text-blue-400 hover:text-blue-300 normal-case tracking-normal underline underline-offset-2">
                View Slip
              </button>
            ) : (
              <span className="ml-2 text-red-400 normal-case tracking-normal">No slip uploaded</span>
            )
          )}
        </p>
      </div>
      <div>
        <p className="text-[9px] text-gray-500 uppercase tracking-widest mb-2">Items ({items.length})</p>
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center justify-between bg-black border border-gray-900 rounded-lg px-3 py-2">
              <div>
                <span className="text-white">{it.product_name}</span>
                {it.variant_name && <span className="text-gray-500"> — {it.variant_name}</span>}
                <span className="text-gray-600"> (#{it.product_id ?? '—'})</span>
              </div>
              <span className="text-gray-400 shrink-0 ml-3">× {it.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
