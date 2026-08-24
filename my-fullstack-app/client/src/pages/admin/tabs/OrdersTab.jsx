import { Fragment, useState } from 'react';
import { Download } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import { formatOrderId } from '../../../lib/orderIdFormat';
import Card from '../../../components/admin/Card';
import { ORDER_STATUSES } from '../../../components/admin/OrderStatusBadge';
import { downloadCsv, viewPaymentSlip } from '../../../components/admin/adminUtils';
import OrderDetailPanel from '../../../components/admin/OrderDetailPanel';

export default function OrdersTab({ orders, reload, notify }) {
  const [filter, setFilter] = useState('All');
  const [expandedId, setExpandedId] = useState(null);
  const visible = filter === 'All' ? orders : orders.filter((o) => o.status === filter);

  const handleStatusChange = async (id, status) => {
    try {
      await api.put(`/admin/orders/${id}/status`, { status });
      reload();
    } catch (err) {
      notify(errorMessage(err, 'Could not update the order status.'), 'error');
    }
  };

  const exportCsv = () => downloadCsv('orders.csv', visible, [
    ['id', 'Order ID'], ['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email'], ['phone', 'Phone'],
    ['address1', 'Address'], ['city', 'City'], ['postal_code', 'Postal Code'],
    ['payment_method', 'Payment Method'], ['total', 'Total'], ['status', 'Status'], ['created_at', 'Placed At'],
  ]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {['All', 'pending', 'processing', 'shipped', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-[10px] font-konexy uppercase tracking-widest rounded-lg transition-all ${
              filter === s ? 'bg-white text-black' : 'bg-[#0a0a0a] text-gray-500 border border-gray-900 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
        <button
          onClick={exportCsv}
          className="ml-auto flex items-center gap-1.5 text-[10px] font-konexy uppercase tracking-widest text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
            <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Payment</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {visible.map((o) => (
              <Fragment key={o.id}>
              <tr
                onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
                className="hover:bg-white/5 transition-colors cursor-pointer"
              >
                <td className="p-4 font-mono text-white font-medium">{formatOrderId(o.id)}</td>
                <td className="p-4">
                  <div className="text-white font-medium">{o.first_name} {o.last_name}</div>
                  <div className="text-[10px] text-gray-600">{o.email}</div>
                </td>
                <td className="p-4 text-gray-400 uppercase text-[10px] tracking-widest">
                  <div>{o.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'COD'}</div>
                  {o.payment_method === 'bank_transfer' && (
                    o.payment_slip_url ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); viewPaymentSlip(o.id); }}
                        className="inline-block mt-1 text-blue-400 hover:text-blue-300 normal-case tracking-normal underline underline-offset-2"
                      >
                        View Slip
                      </button>
                    ) : (
                      <span className="inline-block mt-1 text-red-400 normal-case tracking-normal">No slip uploaded</span>
                    )
                  )}
                </td>
                <td className="p-4 text-right text-white font-medium">Rs. {Number(o.total).toLocaleString()}</td>
                <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="bg-black border border-gray-800 text-[10px] uppercase tracking-widest text-gray-300 px-2 py-1.5 rounded-md outline-none cursor-pointer"
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
              {expandedId === o.id && (
                <tr className="bg-white/[0.02]">
                  <td colSpan={5}><OrderDetailPanel orderId={o.id} /></td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
        </div>
        {visible.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No orders found.</div>}
      </Card>
    </div>
  );
}
