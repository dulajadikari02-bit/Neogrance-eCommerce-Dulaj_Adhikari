import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, X } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { useAuth } from '../context/AuthProvider';

export default function PromoBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const bannerRef = useRef(null);
  const { isAdmin } = useAuth();

  const [banner, setBanner] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const fetchBanner = () => {
    api
      .get('/banner')
      .then(({ data }) => setBanner(data.banner))
      .catch(() => setBanner(null));
  };

  useEffect(() => {
    fetchBanner();
  }, []);

  // Watch the banner and fade/slide it into view once it scrolls onto screen.
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.2 } // start the animation once 20% of the banner is visible
    );

    if (bannerRef.current) {
      observer.observe(bannerRef.current);
    }

    return () => observer.disconnect();
  }, [banner]);

  if (!banner) return null;

  return (
    <section className="py-12 w-full ">
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24">

        {/* Banner Container */}
        <div
          ref={bannerRef}
          className={`relative w-full rounded-xl overflow-hidden bg-black border border-white/10 group transition-all duration-1000 ease-out hover:border-white/40 hover:shadow-[0_0_40px_rgba(255,255,255,0.05)] ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
          }`}
        >
          {isAdmin && (
            <button
              onClick={() => setIsEditing(true)}
              className="absolute top-4 right-4 z-20 flex items-center gap-1.5 bg-black/70 backdrop-blur-md border border-white/30 text-white text-[10px] uppercase tracking-widest px-3 py-2 rounded-md hover:bg-white hover:text-black transition-colors"
            >
              <Pencil size={12} /> Edit Banner
            </button>
          )}

          {/* Background Image */}
          <img
            src={banner.image}
            alt={banner.title}
            loading="lazy"
            className="w-full h-[400px] sm:h-[500px] lg:h-[600px] object-cover object-center transition-transform duration-1000 group-hover:scale-105 opacity-50 group-hover:opacity-40"
          />

          {/* Dark overlay gradients so the text stays readable over the image */}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80"></div>

          {/* Text Content - Center Aligned */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center z-10">

            {banner.subtitle && (
              <span className="text-white/50 font-konexy text-[10px] sm:text-xs tracking-[5px] uppercase mb-4 transition-all duration-700 transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100">
                {banner.subtitle}
              </span>
            )}

            {/* Main Title */}
            <h2 className="font-konexy text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-white tracking-[4px] uppercase mb-6 drop-shadow-lg transition-transform duration-700 group-hover:-translate-y-2">
              {banner.title}
            </h2>

            {/* Description */}
            {banner.description && (
              <p className="text-gray-400 max-w-xl mb-10 text-sm md:text-base tracking-wide font-light transition-opacity duration-700">
                {banner.description}
              </p>
            )}

            {/* Button styled to match the other buttons on the site */}
            {banner.buttonText && (
              <Link
                to={banner.buttonLink || '/'}
                className="font-konexy text-[10px] sm:text-xs tracking-[3px] rounded-md uppercase text-white border border-white/40 px-8 py-3.5 bg-black/40 backdrop-blur-md hover:bg-white hover:text-black transition-all duration-500"
              >
                {banner.buttonText}
              </Link>
            )}

          </div>
        </div>
      </div>

      {isEditing && (
        <BannerEditModal
          banner={banner}
          onClose={() => setIsEditing(false)}
          onSaved={(updated) => {
            setBanner(updated);
            setIsEditing(false);
          }}
        />
      )}
    </section>
  );
}

function BannerEditModal({ banner, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: banner.title || '',
    subtitle: banner.subtitle || '',
    description: banner.description || '',
    buttonText: banner.buttonText || '',
    buttonLink: banner.buttonLink || '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      // FormData lets us send text fields and an image file together in one request.
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      if (imageFile) payload.append('image', imageFile);

      const { data } = await api.put('/admin/banner', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      onSaved(data.banner);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4" onClick={onClose}>
      <div
        className="relative w-full max-w-lg max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border border-gray-900 rounded-xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors">
          <X size={18} />
        </button>

        <h2 className="font-konexy text-lg text-white tracking-[3px] uppercase mb-6">Edit Promo Banner</h2>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3 text-left">
          <Field label="Title" value={form.title} onChange={handleChange('title')} required />
          <Field label="Subtitle" value={form.subtitle} onChange={handleChange('subtitle')} />
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={handleChange('description')}
              rows={3}
              className="w-full bg-[#111] border border-gray-900 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors resize-none"
            />
          </div>
          <Field label="Button Text" value={form.buttonText} onChange={handleChange('buttonText')} />
          <Field label="Button Link" value={form.buttonLink} onChange={handleChange('buttonLink')} />

          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Banner Image</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setImageFile(e.target.files[0])}
              className="w-full text-xs text-gray-400 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-[10px] file:uppercase file:tracking-widest file:bg-[#111] file:text-white hover:file:bg-[#1a1a1a]"
            />
          </div>

          {error && <p className="text-[11px] text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3 rounded-lg hover:bg-gray-200 transition-all mt-2 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Banner'}
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({ label, ...props }) {
  return (
    <div>
      <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">{label}</label>
      <input
        {...props}
        className="w-full bg-[#111] border border-gray-900 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
      />
    </div>
  );
}
