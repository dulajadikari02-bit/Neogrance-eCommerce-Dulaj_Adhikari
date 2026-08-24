import { useState } from 'react';
import { UserCog } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';
import { inputCls } from '../../../components/admin/adminUtils';

export default function StaffTab({ staff, reload }) {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/staff', form);
      setForm({ name: '', email: '', password: '' });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke staff access for this account? They will become an ordinary customer account.')) return;
    try {
      await api.put(`/admin/staff/${id}/revoke`);
      reload();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 h-fit">
        <SectionTitle icon={UserCog}>Add Staff Account</SectionTitle>
        <p className="text-[11px] text-gray-500 mb-4 leading-relaxed">
          Staff can process orders and update product stock. They can't see revenue, manage the catalog, or touch marketing/customer data.
        </p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <input required type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputCls} />
          <input required type="password" minLength={8} placeholder="Password (min. 8 characters)" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className={inputCls} />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-white text-black font-konexy text-[10px] tracking-[3px] uppercase py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
            {saving ? 'Creating...' : 'Create Staff Account'}
          </button>
        </form>
      </Card>

      <Card className="lg:col-span-2 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
            <tr><th className="p-4">Name</th><th className="p-4">Email</th><th className="p-4">Phone</th><th className="p-4">Joined</th><th className="p-4 text-center">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {staff.map((s) => (
              <tr key={s.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 text-white font-medium">{s.name}</td>
                <td className="p-4 text-gray-400 font-mono">{s.email}</td>
                <td className="p-4 text-gray-400">{s.phone || '—'}</td>
                <td className="p-4 text-gray-600 text-[10px]">{new Date(s.created_at).toLocaleDateString()}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleRevoke(s.id)} className="text-[10px] uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">
                    Revoke
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {staff.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No staff accounts yet.</div>}
      </Card>
    </div>
  );
}
