import { Mail } from 'lucide-react';
import Card from '../../../components/admin/Card';

export default function NewsletterTab({ subscribers }) {
  return (
    <Card className="overflow-hidden max-w-2xl">
      <div className="p-6 border-b border-gray-900 flex items-center gap-2">
        <Mail size={15} className="text-gray-500" />
        <span className="text-[11px] font-konexy tracking-[3px] uppercase text-white">{subscribers.length} Subscribers</span>
      </div>
      <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <tbody className="divide-y divide-gray-900">
          {subscribers.map((s) => (
            <tr key={s.id}>
              <td className="p-4 text-gray-300">{s.email}</td>
              <td className="p-4 text-right text-gray-600 text-[10px]">{new Date(s.subscribed_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      {subscribers.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No subscribers yet.</div>}
    </Card>
  );
}
