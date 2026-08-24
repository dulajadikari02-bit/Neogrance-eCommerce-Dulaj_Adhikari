import { Download } from 'lucide-react';
import Card from '../../../components/admin/Card';
import { downloadCsv } from '../../../components/admin/adminUtils';

export default function CustomersTab({ customers }) {
  const exportCsv = () => downloadCsv('customers.csv', customers, [
    ['id', 'ID'], ['name', 'Name'], ['email', 'Email'], ['phone', 'Phone'],
    ['orderCount', 'Orders'], ['totalSpent', 'Total Spent'], ['joinedAt', 'Joined'],
  ]);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-[10px] font-konexy uppercase tracking-widest text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>
      <Card className="overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
          <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Phone</th><th className="p-4 text-center">Orders</th><th className="p-4 text-right">Total Spent</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-white/5 transition-colors">
              <td className="p-4 text-white font-medium">{c.name}</td>
              <td className="p-4 text-gray-400 font-mono">{c.email}</td>
              <td className="p-4 text-gray-400">{c.phone || '—'}</td>
              <td className="p-4 text-center text-blue-400 font-medium">{c.orderCount}</td>
              <td className="p-4 text-right text-white font-medium">Rs. {c.totalSpent.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {customers.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No registered customers yet.</div>}
      </Card>
    </div>
  );
}
