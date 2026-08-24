import { useState } from 'react';
import { Filter, Check, X, Edit3, Trash2, Download } from 'lucide-react';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import { downloadCsv } from '../../../components/admin/adminUtils';

export default function ProductsTab({ products, categories, isSuperAdmin, onEdit, reload }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStock, setBulkStock] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  // A decant running low doesn't show up in the product's own stock number —
  // a product can look fine while its 5ML/10ML variant is nearly gone.
  const hasLowOrOutVariant = (p) => (p.variants || []).some((v) => v.stock <= (p.lowStockThreshold ?? 5));

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
    const matchesCategory = categoryFilter === 'All' || String(p.categoryId) === String(categoryFilter);
    const matchesStock = !lowStockOnly || p.isLowStock || p.isSoldOut || hasLowOrOutVariant(p);
    return matchesSearch && matchesCategory && matchesStock;
  });

  const toggleOne = (id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    setSelected((prev) => {
      if (allFilteredSelected) return new Set();
      return new Set(filtered.map((p) => p.id));
    });
  };

  const clearSelection = () => setSelected(new Set());

  const handleStatusChange = async (id, isActive) => {
    try {
      await api.put(`/admin/products/${id}/status`, { isActive });
      reload();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this product? This removes it from the database completely and cannot be undone.')) return;
    try {
      await api.delete(`/admin/products/${id}`);
      reload();
    } catch (err) {
      alert(errorMessage(err));
    }
  };

  const applyBulkStock = async () => {
    if (bulkStock === '' || Number(bulkStock) < 0) return;
    setBulkBusy(true);
    try {
      await api.put('/admin/products/bulk-stock', { productIds: [...selected], stock: Number(bulkStock) });
      setBulkStock('');
      clearSelection();
      reload();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const applyBulkStatus = async (isActive) => {
    setBulkBusy(true);
    try {
      await api.put('/admin/products/bulk-status', { productIds: [...selected], isActive });
      clearSelection();
      reload();
    } catch (err) {
      alert(errorMessage(err));
    } finally {
      setBulkBusy(false);
    }
  };

  const exportCsv = () => downloadCsv('products.csv', filtered, [
    ['id', 'ID'], ['name', 'Name'], ['sku', 'SKU'], ['category', 'Category'],
    ['price', 'Price'], ['stock', 'Stock'], ['isActive', 'Active'],
  ]);

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-black border border-gray-900 px-3 py-2 flex-1 min-w-[200px] rounded-lg">
          <Filter size={13} className="text-gray-600" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or ID..." className="bg-transparent border-none text-xs text-white outline-none w-full placeholder-gray-600" />
        </div>
        <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="bg-black border border-gray-900 text-xs text-gray-300 px-3 py-2 rounded-lg outline-none">
          <option value="All">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-[10px] font-konexy uppercase tracking-widest text-amber-500 border border-amber-900/40 bg-amber-500/5 px-3 py-2 rounded-lg cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} className="accent-amber-500" /> Low Stock Only
        </label>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 text-[10px] font-konexy uppercase tracking-widest text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </Card>

      {selected.size > 0 && (
        <Card className="p-3 flex flex-wrap items-center gap-3 border-white/20 bg-white/[0.03]">
          <span className="text-[11px] text-white font-medium px-2">{selected.size} selected</span>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min="0"
              placeholder="Set stock to..."
              value={bulkStock}
              onChange={(e) => setBulkStock(e.target.value)}
              className="w-32 bg-black border border-gray-800 text-xs text-white px-3 py-2 rounded-lg outline-none placeholder-gray-600"
            />
            <button
              onClick={applyBulkStock}
              disabled={bulkBusy || bulkStock === ''}
              className="text-[10px] font-konexy uppercase tracking-widest bg-white text-black px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-40"
            >
              Apply
            </button>
          </div>
          {isSuperAdmin && (
            <div className="flex items-center gap-2 border-l border-gray-800 pl-3">
              <button
                onClick={() => applyBulkStatus(true)}
                disabled={bulkBusy}
                className="flex items-center gap-1.5 text-[10px] font-konexy uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-40"
              >
                <Check size={13} /> Activate
              </button>
              <button
                onClick={() => applyBulkStatus(false)}
                disabled={bulkBusy}
                className="flex items-center gap-1.5 text-[10px] font-konexy uppercase tracking-widest text-red-400 hover:text-red-300 transition-colors disabled:opacity-40"
              >
                <X size={13} /> Deactivate
              </button>
            </div>
          )}
          <button onClick={clearSelection} className="ml-auto text-[10px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
            Clear
          </button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
            <tr>
              <th className="p-4 w-10 text-center">
                <input type="checkbox" checked={allFilteredSelected} onChange={toggleAll} className="accent-white" />
              </th>
              <th className="p-4 w-16 text-center">Image</th><th className="p-4">Product</th><th className="p-4">Category</th>
              <th className="p-4 text-right">Price</th><th className="p-4 text-center">Stock</th><th className="p-4 text-center">Status</th>
              {isSuperAdmin && <th className="p-4 text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {filtered.map((p) => (
              <tr key={p.id} className={`hover:bg-white/5 transition-colors ${p.isActive ? '' : 'opacity-50'} ${selected.has(p.id) ? 'bg-white/5' : ''}`}>
                <td className="p-4 text-center">
                  <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} className="accent-white" />
                </td>
                <td className="p-4 text-center">
                  <div className="inline-flex w-10 h-12 bg-black border border-gray-900 rounded-md overflow-hidden">
                    <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-white font-medium">{p.name}</div>
                  <div className="text-[10px] text-gray-600 font-mono">{p.sku}</div>
                </td>
                <td className="p-4 text-gray-400">{p.category || '—'}</td>
                <td className="p-4 text-right text-white font-medium">Rs. {p.price.toLocaleString()}</td>
                <td className="p-4 text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-sm border whitespace-nowrap ${
                      p.isSoldOut ? 'bg-red-500/10 text-red-400 border-red-500/30'
                        : p.isLowStock ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    }`}>{p.stock} pcs</span>
                    {/* Decant stock, shown separately since it's tracked independently
                        from the full bottle above and can run low on its own. */}
                    {p.variants?.length > 0 && (
                      <div className="flex flex-wrap justify-center gap-1">
                        {p.variants.map((v) => {
                          const soldOut = v.stock <= 0;
                          const low = !soldOut && v.stock <= (p.lowStockThreshold ?? 5);
                          return (
                            <span
                              key={v.id}
                              title={v.name}
                              className={`px-1.5 py-0.5 text-[9px] font-mono rounded-sm border whitespace-nowrap ${
                                soldOut ? 'bg-red-500/10 text-red-400 border-red-500/30'
                                  : low ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-white/5 text-gray-500 border-gray-800'
                              }`}
                            >
                              {v.name.replace(' Decant', '')}: {v.stock}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-center">
                  {isSuperAdmin ? (
                    <select
                      value={p.isActive ? 'active' : 'inactive'}
                      onChange={(e) => handleStatusChange(p.id, e.target.value === 'active')}
                      className={`text-[10px] font-mono font-bold rounded-sm border px-2 py-1 outline-none cursor-pointer bg-black ${
                        p.isActive
                          ? 'text-emerald-400 border-emerald-500/30'
                          : 'text-red-400 border-red-500/30'
                      }`}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-sm border ${
                      p.isActive ? 'text-emerald-400 border-emerald-500/30' : 'text-red-400 border-red-500/30'
                    }`}>
                      {p.isActive ? 'Active' : 'Inactive'}
                    </span>
                  )}
                </td>
                {isSuperAdmin && (
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => onEdit(p.id)} className="text-gray-500 hover:text-white transition-colors"><Edit3 size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="text-gray-500 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {filtered.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No products found.</div>}
      </Card>
    </div>
  );
}
