import { useEffect, useState } from 'react';
import { Image as ImageIcon, Plus } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';

export default function HeroBannerTab({ banner, reload }) {
  const [isActive, setIsActive] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (banner) {
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
      payload.append('isActive', String(isActive));
      if (imageFile) payload.append('image', imageFile);
      await api.put('/admin/hero-banner', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
      reload();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-2xl p-5 sm:p-8">
      <SectionTitle icon={ImageIcon}>Homepage Hero Banner</SectionTitle>
      <p className="text-[11px] text-gray-500 mb-4 -mt-2">The big full-screen banner at the very top of the homepage — just an image, with the Neogrance logo shown over it. Swap the image any time.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="flex items-center gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="accent-white"
          />
          <span className="text-xs text-white flex-1">Show custom hero on homepage</span>
          <span className={`text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm font-bold ${isActive ? 'text-emerald-500 bg-emerald-500/10' : 'text-gray-500 bg-white/5'}`}>
            {isActive ? 'Active' : 'Hidden'}
          </span>
        </label>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-2">Hero Image</label>
          <div className="relative h-40 border border-dashed border-gray-800 hover:border-white/40 rounded-lg overflow-hidden transition-colors">
            <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={(e) => { const f = e.target.files[0]; if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); } }} />
            {preview ? <img src={preview} alt="Hero" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-700"><Plus size={20} /></div>}
          </div>
        </div>
        {error && <p className="text-[11px] text-red-400">{error}</p>}
        <button type="submit" disabled={saving} className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3 px-8 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Hero Banner'}
        </button>
      </form>
    </Card>
  );
}
