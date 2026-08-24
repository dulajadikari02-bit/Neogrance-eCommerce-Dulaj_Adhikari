import { useEffect, useState } from 'react';
import { Package, Plus } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';
import { inputCls } from '../../../components/admin/adminUtils';

const emptyProductForm = {
  name: '', description: '', topNotes: '', heartNotes: '', baseNotes: '',
  price: '', costPrice: '', bottleMl: '', stock: '', lowStockThreshold: '5', categoryId: '', gender: 'unisex',
};

const emptySizes = {
  fullBottleAvailable: true,
  decant5: { available: false, price: '', stock: '' },
  decant10: { available: false, price: '', stock: '' },
};

export default function ProductFormTab({ productId, categories, notify, onDone }) {
  const [form, setForm] = useState(emptyProductForm);
  const [sizes, setSizes] = useState(emptySizes);
  const [images, setImages] = useState([null, null, null]);
  const [previews, setPreviews] = useState([null, null, null]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!!productId);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!productId) {
      setForm(emptyProductForm);
      setSizes(emptySizes);
      setPreviews([null, null, null]);
      setImages([null, null, null]);
      return;
    }
    setLoading(true);
    api.get(`/admin/products/${productId}`).then(({ data }) => {
      const p = data.product;
      setForm({
        name: p.name, description: p.description || '',
        topNotes: p.topNotes || '', heartNotes: p.heartNotes || '', baseNotes: p.baseNotes || '',
        price: p.price, costPrice: p.costPrice ?? '', bottleMl: p.bottleMl ?? '', stock: p.stock,
        lowStockThreshold: p.lowStockThreshold, categoryId: p.categoryId || '', gender: p.gender,
      });
      const d5 = data.variants.find((v) => v.name === '5ML Decant');
      const d10 = data.variants.find((v) => v.name === '10ML Decant');
      setSizes({
        fullBottleAvailable: p.fullBottleAvailable,
        decant5: d5 ? { available: true, price: d5.price, stock: d5.stock } : { available: false, price: '', stock: '' },
        decant10: d10 ? { available: true, price: d10.price, stock: d10.stock } : { available: false, price: '', stock: '' },
      });
      setPreviews([p.image, p.hoverImage, p.image3]);
      setImages([null, null, null]);
    }).finally(() => setLoading(false));
  }, [productId]);

  // Store the chosen file, and use createObjectURL to preview it instantly
  // in the browser before it's actually uploaded to the server.
  const handleImageChange = (index, file) => {
    if (!file) return;
    const newImages = [...images]; newImages[index] = file; setImages(newImages);
    const newPreviews = [...previews]; newPreviews[index] = URL.createObjectURL(file); setPreviews(newPreviews);
  };

  const validate = (variants) => {
    if (!form.name.trim()) return 'Product name is required.';
    if (form.price === '') return 'Price is required.';
    if (form.stock === '') return 'Stock is required.';
    if (form.costPrice === '') return 'Cost price is required.';
    if (form.bottleMl === '') return 'Full bottle size (ml) is required.';
    if (!sizes.fullBottleAvailable && variants.length === 0) return 'At least one size must be available.';
    if (!productId && !images[0]) return 'A main product image is required.';
    if (productId && !images[0] && !previews[0]) return 'A main product image is required.';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const variants = [];
    if (sizes.decant5.available && sizes.decant5.price !== '') {
      variants.push({ name: '5ML Decant', label: 'Travel Size', price: sizes.decant5.price, ml: 5, stock: sizes.decant5.stock || 0 });
    }
    if (sizes.decant10.available && sizes.decant10.price !== '') {
      variants.push({ name: '10ML Decant', label: 'Travel Size', price: sizes.decant10.price, ml: 10, stock: sizes.decant10.stock || 0 });
    }

    const validationError = validate(variants);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    try {
      const payload = new FormData();
      Object.entries(form).forEach(([key, value]) => payload.append(key, value));
      payload.append('fullBottleAvailable', String(sizes.fullBottleAvailable));
      payload.append('variants', JSON.stringify(variants));

      const [mainImage, hoverImage, galleryImage] = images;
      if (mainImage) payload.append('mainImage', mainImage);
      if (hoverImage) payload.append('hoverImage', hoverImage);
      if (galleryImage) payload.append('galleryImage', galleryImage);

      if (productId) {
        await api.put(`/admin/products/${productId}`, payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        notify('Product updated.');
      } else {
        await api.post('/admin/products', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
        notify('Product added.');
        // The tab stays mounted now (switching tabs no longer resets it), so
        // clear the form ourselves — otherwise clicking "Add Product" again
        // would still show what was just submitted.
        setForm(emptyProductForm);
        setSizes(emptySizes);
        setImages([null, null, null]);
        setPreviews([null, null, null]);
      }
      onDone();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="text-xs text-gray-500 uppercase tracking-widest">Loading product...</p>;

  return (
    <Card className="max-w-3xl p-5 sm:p-8">
      <SectionTitle icon={Package}>{productId ? `Edit Product #${productId}` : 'Add New Product'}</SectionTitle>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Product Name</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} resize-none`} />
        </div>

        <div className="border-t border-gray-900 pt-5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-3">Fragrance Notes</label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Top Notes</label>
              <textarea rows={2} placeholder="Bergamot, Lemon, Pink Pepper" value={form.topNotes} onChange={(e) => setForm({ ...form, topNotes: e.target.value })} className={`${inputCls} resize-none text-xs`} />
            </div>
            <div>
              <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Heart Notes</label>
              <textarea rows={2} placeholder="Rose, Jasmine, Iris" value={form.heartNotes} onChange={(e) => setForm({ ...form, heartNotes: e.target.value })} className={`${inputCls} resize-none text-xs`} />
            </div>
            <div>
              <label className="block text-[9px] text-gray-600 uppercase tracking-widest mb-1.5">Base Notes</label>
              <textarea rows={2} placeholder="Sandalwood, Musk, Amber" value={form.baseNotes} onChange={(e) => setForm({ ...form, baseNotes: e.target.value })} className={`${inputCls} resize-none text-xs`} />
            </div>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Comma-separated. Leave any tier blank to hide it on the product page.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Category</label>
            <select value={form.categoryId} onChange={(e) => setForm({ ...form, categoryId: e.target.value })} className={inputCls}>
              <option value="">— None —</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Gender</label>
            <select required value={form.gender} onChange={(e) => setForm({ ...form, gender: e.target.value })} className={inputCls}>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="unisex">Unisex</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Price (Rs.)</label>
            <input required type="number" min="0" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Stock</label>
            <input required type="number" min="0" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Low Stock At</label>
            <input type="number" min="0" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value })} className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Cost Price (Rs.)</label>
            <input required type="number" min="0" placeholder="What this product costs you" value={form.costPrice} onChange={(e) => setForm({ ...form, costPrice: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Full Bottle Size (ml)</label>
            <input required type="number" min="1" placeholder="e.g. 100" value={form.bottleMl} onChange={(e) => setForm({ ...form, bottleMl: e.target.value })} className={inputCls} />
          </div>
        </div>
        <p className="text-[10px] text-gray-600 -mt-2">
          Cost price is used to calculate profit only — customers never see it. It's entered once for the full bottle;
          decant profit is calculated proportionally from the bottle size above.
        </p>

        {/* Available Sizes */}
        <div className="border-t border-gray-900 pt-5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-3">Available Sizes</label>
          <div className="space-y-2">
            <label className="flex items-center gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sizes.fullBottleAvailable}
                onChange={(e) => setSizes({ ...sizes, fullBottleAvailable: e.target.checked })}
                className="accent-white"
              />
              <span className="text-xs text-white flex-1">Full Bottle</span>
              <span className="text-[10px] text-gray-500 uppercase tracking-widest">Uses Price field above</span>
            </label>

            <label className="flex items-center flex-wrap gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sizes.decant5.available}
                onChange={(e) => setSizes({ ...sizes, decant5: { ...sizes.decant5, available: e.target.checked } })}
                className="accent-white"
              />
              <span className="text-xs text-white flex-1">5ML Decant</span>
              {sizes.decant5.available && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="number" min="0" placeholder="Price (Rs.)"
                    value={sizes.decant5.price}
                    onChange={(e) => setSizes({ ...sizes, decant5: { ...sizes.decant5, price: e.target.value } })}
                    onClick={(e) => e.stopPropagation()}
                    className={`${inputCls} w-28`}
                  />
                  <input
                    type="number" min="0" placeholder="Stock"
                    value={sizes.decant5.stock}
                    onChange={(e) => setSizes({ ...sizes, decant5: { ...sizes.decant5, stock: e.target.value } })}
                    onClick={(e) => e.stopPropagation()}
                    className={`${inputCls} w-20`}
                  />
                </div>
              )}
            </label>

            <label className="flex items-center flex-wrap gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sizes.decant10.available}
                onChange={(e) => setSizes({ ...sizes, decant10: { ...sizes.decant10, available: e.target.checked } })}
                className="accent-white"
              />
              <span className="text-xs text-white flex-1">10ML Decant</span>
              {sizes.decant10.available && (
                <div className="flex gap-2 w-full sm:w-auto">
                  <input
                    type="number" min="0" placeholder="Price (Rs.)"
                    value={sizes.decant10.price}
                    onChange={(e) => setSizes({ ...sizes, decant10: { ...sizes.decant10, price: e.target.value } })}
                    onClick={(e) => e.stopPropagation()}
                    className={`${inputCls} w-28`}
                  />
                  <input
                    type="number" min="0" placeholder="Stock"
                    value={sizes.decant10.stock}
                    onChange={(e) => setSizes({ ...sizes, decant10: { ...sizes.decant10, stock: e.target.value } })}
                    onClick={(e) => e.stopPropagation()}
                    className={`${inputCls} w-20`}
                  />
                </div>
              )}
            </label>
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Check any combination — at least one should be available for the product to be purchasable.</p>
        </div>

        {/* Images */}
        <div className="border-t border-gray-900 pt-5">
          <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-3">Product Images</label>
          <div className="grid grid-cols-3 gap-4">
            {['Main Image', 'Hover Image', 'Gallery Image'].map((label, i) => (
              <div key={label} className="bg-black border border-gray-900 rounded-lg p-3">
                <span className="block text-[9px] text-gray-600 uppercase tracking-widest mb-2">{label}</span>
                <div className="relative h-28 border border-dashed border-gray-800 hover:border-white/40 rounded-md flex items-center justify-center overflow-hidden transition-colors">
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => handleImageChange(i, e.target.files[0])} />
                  {previews[i] ? (
                    <img src={previews[i]} alt={label} className="h-full w-full object-cover" />
                  ) : (
                    <Plus size={20} className="text-gray-700" />
                  )}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-gray-600 mt-2">Main image is required; the rest are optional.</p>
        </div>

        {error && <p className="text-[11px] text-red-400">{error}</p>}

        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3 px-8 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50">
            {saving ? 'Saving...' : productId ? 'Update Product' : 'Save Product'}
          </button>
        </div>
      </form>
    </Card>
  );
}
