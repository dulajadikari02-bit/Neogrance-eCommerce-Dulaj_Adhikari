export const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

export default function OrderStatusBadge({ status }) {
  const tone = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  }[status];
  return <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm border ${tone}`}>{status}</span>;
}
