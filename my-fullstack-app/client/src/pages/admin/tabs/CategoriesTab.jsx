import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';
import { inputCls } from '../../../components/admin/adminUtils';

export default function CategoriesTab({ categories, reload }) {
  const [form, setForm] = useState({ name: '', gender: 'men', type: 'fragrance', displayOrder: 0 });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/categories', form);
      setForm({ name: '', gender: 'men', type: 'fragrance', displayOrder: 0 });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/admin/categories/${id}`);
      reload();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="p-6 h-fit">
        <SectionTitle icon={Plus}>Create Category</SectionTitle>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required placeholder="Category name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
          <select value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
            <option value="men">Men</option>
            <option value="women">Women</option>
            <option value="unisex">Unisex</option>
          </select>
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={inputCls}>
            <option value="fragrance">Fragrance</option>
            <option value="clothing">Clothing</option>
          </select>
          <input type="number" min="0" placeholder="Display order" value={form.displayOrder} onChange={(e) => setForm({ ...form, displayOrder: e.target.value })} className={inputCls} />
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <button type="submit" disabled={saving} className="w-full bg-white text-black font-konexy text-[10px] tracking-[3px] uppercase py-3 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
            {saving ? 'Saving...' : 'Add Category'}
          </button>
        </form>
      </Card>

      <Card className="lg:col-span-2 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
            <tr><th className="p-4">Name</th><th className="p-4">Gender</th><th className="p-4">Type</th><th className="p-4 text-center">Action</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {categories.map((c) => (
              <tr key={c.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 text-white font-medium">{c.name}</td>
                <td className="p-4 text-gray-400 capitalize">{c.gender}</td>
                <td className="p-4 text-gray-400 capitalize">{c.type}</td>
                <td className="p-4 text-center">
                  <button onClick={() => handleDelete(c.id)} className="text-gray-500 hover:text-red-500 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
    </div>
  );
}
