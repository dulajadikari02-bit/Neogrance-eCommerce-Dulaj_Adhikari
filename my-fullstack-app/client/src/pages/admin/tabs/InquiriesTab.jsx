import { Check, MessageSquare, Trash2 } from 'lucide-react';
import api from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';

export default function InquiriesTab({ inquiries, reload }) {
  const markRead = async (id) => {
    await api.put(`/admin/contact-messages/${id}/read`);
    reload();
  };

  const remove = async (id) => {
    await api.delete(`/admin/contact-messages/${id}`);
    reload();
  };

  return (
    <Card className="p-4 sm:p-6 max-w-3xl">
      <SectionTitle icon={MessageSquare}>
        Contact Inquiries {inquiries.filter((m) => !m.is_read).length > 0 && `(${inquiries.filter((m) => !m.is_read).length} unread)`}
      </SectionTitle>
      {inquiries.length === 0 ? (
        <p className="text-xs text-gray-600 uppercase tracking-widest">No messages yet.</p>
      ) : (
        <div className="space-y-4">
          {inquiries.map((m) => (
            <div
              key={m.id}
              className={`border rounded-lg p-4 ${m.is_read ? 'border-gray-900 bg-black' : 'border-white/20 bg-white/5'}`}
            >
              <div className="flex items-start justify-between gap-4 mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {!m.is_read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />}
                    <span className="text-xs text-white font-medium">{m.subject}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {m.name} &lt;{m.email}&gt; · {new Date(m.created_at).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {!m.is_read && (
                    <button onClick={() => markRead(m.id)} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">
                      <Check size={13} /> Mark Read
                    </button>
                  )}
                  <button onClick={() => remove(m.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
              <p className="text-xs text-gray-400 whitespace-pre-wrap">{m.message}</p>
              <a href={`mailto:${m.email}`} className="inline-block mt-3 text-[10px] uppercase tracking-widest text-blue-400 hover:text-blue-300 transition-colors">
                Reply by email
              </a>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
