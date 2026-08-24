import { Fragment, useState } from 'react';
import { formatOrderId } from '../../../lib/orderIdFormat';
import Card from '../../../components/admin/Card';
import OrderStatusBadge from '../../../components/admin/OrderStatusBadge';
import OrderDetailPanel from '../../../components/admin/OrderDetailPanel';

export default function DeliveredOrdersTab({ orders }) {
  const [expandedId, setExpandedId] = useState(null);

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
          <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {orders.map((o) => (
            <Fragment key={o.id}>
            <tr
              onClick={() => setExpandedId(expandedId === o.id ? null : o.id)}
              className="hover:bg-white/5 transition-colors opacity-80 cursor-pointer"
            >
              <td className="p-4 font-mono text-white font-medium">{formatOrderId(o.id)}</td>
              <td className="p-4">
                <div className="text-white font-medium">{o.first_name} {o.last_name}</div>
                <div className="text-[10px] text-gray-600">{o.email}</div>
              </td>
              <td className="p-4 text-right text-white font-medium">Rs. {Number(o.total).toLocaleString()}</td>
              <td className="p-4 text-center"><OrderStatusBadge status={o.status} /></td>
            </tr>
            {expandedId === o.id && (
              <tr className="bg-white/[0.02]">
                <td colSpan={4}><OrderDetailPanel orderId={o.id} /></td>
              </tr>
            )}
            </Fragment>
          ))}
        </tbody>
      </table>
      </div>
      {orders.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No delivered orders yet.</div>}
    </Card>
  );
}
