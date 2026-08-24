import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';
import { inputCls } from '../../../components/admin/adminUtils';

export default function BannerTab({ banner, reload }) {
  const [form, setForm] = useState({ title: '', subtitle: '', description: '', buttonText: '', buttonLink: '' });
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (banner) {
      setForm({
        title: banner.title || '', subtitle: banner.subtitle || '', description: banner.description || '',
        buttonText: banner.buttonText || '', buttonLink: banner.buttonLink || '',
      });
      setIsActive(banner.isActive);
      setPreview(banner.image);
    }
  }, [banner]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append('isActive', String(isActive));
      if (imageFile) payload.append('image', imageFile);
      await api.put('/admin/banner', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl p-5 sm:p-8">
      <SectionTitle icon={ImageIcon}>Homepage Promo Banner</SectionTitle>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-center gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-white"
          />
          <span className="text-xs text-white flex-1">Show banner on homepage</span>
          <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm font-bold ${isActive ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 bg-white/5'}`}>
            {isActive ? 'Active' : 'Hidden'}
          </span>
        </label>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Title</label>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Subtitle</label>
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Button Text</label>
            <input value={form.buttonText} onChange={(e) => setForm({ ...form, buttonText: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Button Link</label>
            <input value={form.buttonLink} onChange={(e) => setForm({ ...form, buttonLink: e.target.value })} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Banner Image</label>
          <div className="relative h-40 border border-dashed border-gray-800 hover:border-white/40 rounded-lg overflow-hidden transition-colors">
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { const f = e.target.files[0]; if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); } }} />
            {preview ? <img src={preview} alt="Banner" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><Plus size={20} /></div>}
          </div>
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3 px-8 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Banner'}
        </button>
      </form>
    </Card>
  );
}
