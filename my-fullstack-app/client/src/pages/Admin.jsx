import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ShoppingBag, ClipboardList, Users, Image as ImageIcon, Star, LogOut,
  Package, AlertTriangle, DollarSign, Trash2, Check, X, Edit3, FolderHeart,
  Filter, Mail, CheckCircle, Truck, TrendingUp, Plus, ArrowLeft, MessageSquare,
  UserCog, ShieldCheck, Download,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useAuth } from '../context/AuthProvider';
import api, { errorMessage } from '../lib/api';
import logo from '../assets/logo.png';

// superAdminOnly items are hidden from the nav entirely for Staff accounts —
// Staff only get Overview, Products (view + stock), Orders, Delivered Orders.
const NAV_GROUPS = [
  {
    items: [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }],
  },
  {
    title: 'Catalog',
    items: [
      { id: 'categories', label: 'Category Editor', icon: FolderHeart, superAdminOnly: true },
      { id: 'products', label: 'All Products', icon: Package },
      { id: 'product-form', label: 'Add Product', icon: Plus, superAdminOnly: true },
    ],
  },
  {
    title: 'Operations',
    items: [
      { id: 'orders', label: 'Orders', icon: ClipboardList },
      { id: 'delivered-orders', label: 'Delivered Orders', icon: Truck },
      { id: 'customers', label: 'Customers', icon: Users, superAdminOnly: true },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { id: 'banner', label: 'Promo Banner', icon: ImageIcon, superAdminOnly: true },
      { id: 'reviews', label: 'Reviews', icon: Star, superAdminOnly: true },
      { id: 'newsletter', label: 'Newsletter', icon: Mail, superAdminOnly: true },
      { id: 'inquiries', label: 'Inquiries', icon: MessageSquare, superAdminOnly: true },
    ],
  },
  {
    title: 'Team',
    items: [
      { id: 'staff', label: 'Staff Accounts', icon: UserCog, superAdminOnly: true },
    ],
  },
];

const TAB_LABELS = Object.fromEntries(NAV_GROUPS.flatMap((g) => g.items).map((i) => [i.id, i.label]));

const emptyProductForm = {
  name: '', description: '', topNotes: '', heartNotes: '', baseNotes: '',
  price: '', costPrice: '', bottleMl: '', stock: '', lowStockThreshold: '5', categoryId: '', gender: 'unisex',
};

export default function Admin() {
  const { user, isLoading, isAdmin, isStaffOrAdmin, logout } = useAuth();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="h-screen w-full bg-black flex items-center justify-center text-gray-500 text-xs tracking-[0.3em] uppercase">
        Loading...
      </div>
    );
  }

  if (!user || !isStaffOrAdmin) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center gap-4 text-white px-4 text-center">
        <p className="text-gray-400 tracking-widest uppercase text-sm">Admin access required</p>
        <Link to="/" className="text-white underline underline-offset-4 text-sm">Back to Home</Link>
      </div>
    );
  }

  return <AdminShell user={user} isSuperAdmin={isAdmin} onLogout={async () => { await logout(); navigate('/'); }} />;
}

function AdminShell({ user, isSuperAdmin, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard');

  const [summary, setSummary] = useState(null);
  const [categorySales, setCategorySales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [banner, setBanner] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);

  const [editingProductId, setEditingProductId] = useState(null);

  const loadDashboard = () => {
    api.get('/admin/dashboard').then(({ data }) => setSummary(data));
    if (isSuperAdmin) api.get('/admin/analytics/category-sales').then(({ data }) => setCategorySales(data.categorySales));
  };
  const loadCategories = () => api.get('/categories').then(({ data }) => setCategories(data.categories));
  const loadProducts = () => api.get('/admin/products').then(({ data }) => setProducts(data.products));
  const loadOrders = () => api.get('/admin/orders').then(({ data }) => setOrders(data.orders));
  const loadCustomers = () => api.get('/admin/customers').then(({ data }) => setCustomers(data.customers));
  const loadReviews = () => api.get('/admin/reviews', { params: { status: 'pending' } }).then(({ data }) => setPendingReviews(data.reviews));
  const loadSubscribers = () => api.get('/admin/newsletter').then(({ data }) => setSubscribers(data.subscribers));
  const loadBanner = () => api.get('/admin/banner').then(({ data }) => setBanner(data.banner)).catch(() => setBanner(null));
  const loadInquiries = () => api.get('/admin/contact-messages').then(({ data }) => setInquiries(data.messages));
  const loadStaffAccounts = () => api.get('/admin/staff').then(({ data }) => setStaffAccounts(data.staff));

  useEffect(() => {
    loadDashboard();
    loadProducts();
    loadOrders();
    // The rest are SuperAdmin-only sections — skip fetching them entirely for
    // Staff so they don't fire requests that only come back 403.
    if (!isSuperAdmin) return;
    loadCategories();
    loadCustomers();
    loadReviews();
    loadSubscribers();
    loadBanner();
    loadInquiries();
    loadStaffAccounts();
  }, []);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'delivered'), [orders]);
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);

  const startEditProduct = (id) => {
    setEditingProductId(id);
    setActiveTab('product-form');
  };
  const startNewProduct = () => {
    setEditingProductId(null);
    setActiveTab('product-form');
  };

  return (
    <div className="h-screen w-full bg-black text-gray-300 flex overflow-hidden">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0a0a0a] border-r border-gray-900 flex flex-col justify-between h-full shrink-0">
        <div className="overflow-y-auto">
          <Link to="/" className="flex items-center gap-3 px-6 py-6 border-b border-gray-900">
            <img src={logo} alt="Neogrance" className="h-6 w-auto object-contain" />
            <span className="text-[9px] tracking-[3px] text-gray-500 uppercase font-konexy">Admin</span>
          </Link>

          <nav className="p-4 space-y-1">
            {NAV_GROUPS.map((group, gi) => {
              const items = group.items.filter((i) => isSuperAdmin || !i.superAdminOnly);
              if (!items.length) return null;
              return (
                <div key={gi} className="mb-3">
                  {group.title && (
                    <div className="pt-3 pb-1 px-3 text-[9px] font-konexy font-bold tracking-[2px] text-gray-600 uppercase">
                      {group.title}
                    </div>
                  )}
                  {items.map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => (id === 'product-form' ? startNewProduct() : setActiveTab(id))}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-[11px] font-medium tracking-widest uppercase transition-all border-l-2 rounded-r-md ${
                        activeTab === id
                          ? 'bg-white/5 text-white border-white'
                          : 'text-gray-500 hover:text-white hover:bg-white/5 border-transparent'
                      }`}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-gray-900 flex flex-col gap-2">
          <Link
            to="/"
            className="w-full flex items-center justify-center gap-2 border border-gray-800 hover:border-white/40 text-gray-400 hover:text-white text-[10px] font-konexy tracking-[2px] uppercase py-2.5 rounded-lg transition-all"
          >
            <ArrowLeft size={14} /> Back to Store
          </Link>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 border border-red-900/50 text-red-500 hover:bg-red-500 hover:text-white text-[10px] font-konexy tracking-[2px] uppercase py-2.5 rounded-lg transition-all"
          >
            <LogOut size={14} /> Log Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex justify-between items-center px-8 py-5 border-b border-gray-900 shrink-0 bg-[#0a0a0a]">
          <h2 className="text-[10px] uppercase tracking-[3px] text-gray-500 font-konexy">
            Admin / <span className="text-white">{TAB_LABELS[activeTab]}</span>
          </h2>
          <div className="text-[10px] text-gray-500 font-medium flex items-center gap-2 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {user.name}
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] ${
              isSuperAdmin ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
            }`}>
              <ShieldCheck size={10} /> {isSuperAdmin ? 'Super Admin' : 'Staff'}
            </span>
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto">
          {activeTab === 'dashboard' && <DashboardTab summary={summary} categorySales={categorySales} isSuperAdmin={isSuperAdmin} />}
          {activeTab === 'categories' && (
            <CategoriesTab categories={categories} reload={() => { loadCategories(); loadDashboard(); }} />
          )}
          {activeTab === 'products' && (
            <ProductsTab
              products={products}
              categories={categories}
              isSuperAdmin={isSuperAdmin}
              onEdit={startEditProduct}
              reload={() => { loadProducts(); loadDashboard(); }}
            />
          )}
          {activeTab === 'product-form' && (
            <ProductFormTab
              productId={editingProductId}
              categories={categories}
              onDone={() => { loadProducts(); loadDashboard(); setActiveTab('products'); }}
            />
          )}
          {activeTab === 'orders' && <OrdersTab orders={activeOrders} reload={() => { loadOrders(); loadDashboard(); }} />}
          {activeTab === 'delivered-orders' && <DeliveredOrdersTab orders={deliveredOrders} />}
          {activeTab === 'customers' && <CustomersTab customers={customers} />}
          {activeTab === 'staff' && (
            <StaffTab staff={staffAccounts} reload={loadStaffAccounts} />
          )}
          {activeTab === 'banner' && <BannerTab banner={banner} reload={loadBanner} />}
          {activeTab === 'reviews' && (
            <ReviewsTab reviews={pendingReviews} reload={() => { loadReviews(); loadDashboard(); }} />
          )}
          {activeTab === 'newsletter' && <NewsletterTab subscribers={subscribers} />}
          {activeTab === 'inquiries' && (
            <InquiriesTab inquiries={inquiries} reload={() => { loadInquiries(); loadDashboard(); }} />
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Shared bits
// =============================================================================

function Card({ children, className = '' }) {
  return <div className={`bg-[#0a0a0a] border border-gray-900 rounded-xl ${className}`}>{children}</div>;
}

function SectionTitle({ icon: Icon, children }) {
  return (
    <h3 className="text-[11px] font-konexy tracking-[3px] uppercase text-white flex items-center gap-2 mb-6">
      {Icon && <Icon size={15} className="text-gray-500" />} {children}
    </h3>
  );
}

const inputCls =
  'w-full bg-black border border-gray-900 rounded-lg py-2.5 px-4 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors';

// Builds a CSV from a list of objects + [key, header] column defs and triggers a download.
function downloadCsv(filename, rows, columns) {
  const escape = (value) => {
    const str = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [
    columns.map(([, header]) => escape(header)).join(','),
    ...rows.map((row) => columns.map(([key]) => escape(row[key])).join(',')),
  ];
  const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// =============================================================================
// 1. Dashboard
// =============================================================================

function DashboardTab({ summary, categorySales, isSuperAdmin }) {
  const [granularity, setGranularity] = useState('month');
  const [profitTrend, setProfitTrend] = useState([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/admin/analytics/profit-trend', { params: { granularity } }).then(({ data }) => setProfitTrend(data.trend));
  }, [granularity, isSuperAdmin]);

  if (!summary) return null;

  const tiles = [
    ...(isSuperAdmin
      ? [
          { label: 'Total Revenue', value: `Rs. ${summary.totalRevenue.toLocaleString()}`, icon: DollarSign, tone: 'text-emerald-500 bg-emerald-500/10' },
          { label: 'Total Profit', value: `Rs. ${summary.totalProfit.toLocaleString()}`, icon: TrendingUp, tone: 'text-emerald-400 bg-emerald-400/10' },
        ]
      : []),
    { label: 'Total Orders', value: summary.totalOrders, icon: ShoppingBag, tone: 'text-blue-400 bg-blue-500/10' },
    { label: 'Delivered', value: summary.deliveredOrders, icon: CheckCircle, tone: 'text-white bg-white/10' },
    { label: 'Pending Orders', value: summary.pendingOrders, icon: Truck, tone: 'text-amber-500 bg-amber-500/10' },
    { label: 'Products', value: summary.productCount, icon: Package, tone: 'text-gray-300 bg-white/5' },
    { label: 'Low Stock', value: summary.lowStockCount, icon: AlertTriangle, tone: 'text-red-500 bg-red-500/10' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles.map((t) => (
          <Card key={t.label} className="p-5 flex items-center justify-between">
            <div>
              <p className="text-[9px] font-konexy font-bold text-gray-500 uppercase tracking-widest">{t.label}</p>
              <h3 className="text-base font-light text-white mt-1.5">{t.value}</h3>
            </div>
            <div className={`p-2.5 rounded-md ${t.tone}`}>
              <t.icon size={18} />
            </div>
          </Card>
        ))}
      </div>

      {isSuperAdmin && (
        <Card className="p-6">
          <SectionTitle icon={TrendingUp}>Category Sales Distribution</SectionTitle>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categorySales} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#ffffff', opacity: 0.04 }}
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', fontSize: '11px' }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="sales" fill="#ffffff" radius={[3, 3, 0, 0]} barSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {isSuperAdmin && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-1">
            <SectionTitle icon={TrendingUp}>Profit Trend</SectionTitle>
            <div className="flex gap-1.5 mb-6">
              {['week', 'month'].map((g) => (
                <button
                  key={g}
                  onClick={() => setGranularity(g)}
                  className={`text-[10px] uppercase tracking-widest px-3 py-1.5 rounded-md transition-colors ${
                    granularity === g ? 'bg-white text-black' : 'text-gray-500 hover:text-white bg-white/5'
                  }`}
                >
                  {g === 'week' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={profitTrend.map((t) => ({ period: granularity === 'week' ? String(t.period).slice(0, 10) : t.period, profit: t.profit }))}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1f1f1f" vertical={false} />
                <XAxis dataKey="period" stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#71717a" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: '#ffffff', opacity: 0.04 }}
                  contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#27272a', fontSize: '11px' }}
                  labelStyle={{ color: '#fff' }}
                  formatter={(value) => [`Rs. ${Number(value).toLocaleString()}`, 'Profit']}
                />
                <Bar dataKey="profit" fill="#34d399" radius={[3, 3, 0, 0]} barSize={granularity === 'week' ? 28 : 36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  );
}

// =============================================================================
// 2. Categories
// =============================================================================

function CategoriesTab({ categories, reload }) {
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
      </Card>
    </div>
  );
}

// =============================================================================
// 3. Products list
// =============================================================================

function ProductsTab({ products, categories, isSuperAdmin, onEdit, reload }) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [bulkStock, setBulkStock] = useState('');
  const [bulkBusy, setBulkBusy] = useState(false);

  const filtered = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || String(p.id).includes(search);
    const matchesCategory = categoryFilter === 'All' || String(p.categoryId) === String(categoryFilter);
    const matchesStock = !lowStockOnly || p.isLowStock || p.isSoldOut;
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
                  <span className={`px-2 py-1 text-[10px] font-mono font-bold rounded-sm border ${
                    p.isSoldOut ? 'bg-red-500/10 text-red-400 border-red-500/30'
                      : p.isLowStock ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>{p.stock} pcs</span>
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
        {filtered.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No products found.</div>}
      </Card>
    </div>
  );
}

// =============================================================================
// 4. Add / Edit product
// =============================================================================

const emptySizes = {
  fullBottleAvailable: true,
  decant5: { available: false, price: '' },
  decant10: { available: false, price: '' },
};

function ProductFormTab({ productId, categories, onDone }) {
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
        decant5: d5 ? { available: true, price: d5.price } : { available: false, price: '' },
        decant10: d10 ? { available: true, price: d10.price } : { available: false, price: '' },
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
      variants.push({ name: '5ML Decant', label: 'Travel Size', price: sizes.decant5.price, ml: 5 });
    }
    if (sizes.decant10.available && sizes.decant10.price !== '') {
      variants.push({ name: '10ML Decant', label: 'Travel Size', price: sizes.decant10.price, ml: 10 });
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
      } else {
        await api.post('/admin/products', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
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
    <Card className="max-w-3xl p-8">
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
          <div className="grid grid-cols-3 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

        <div className="grid grid-cols-3 gap-4">
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

        <div className="grid grid-cols-2 gap-4">
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

            <label className="flex items-center gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sizes.decant5.available}
                onChange={(e) => setSizes({ ...sizes, decant5: { ...sizes.decant5, available: e.target.checked } })}
                className="accent-white"
              />
              <span className="text-xs text-white flex-1">5ML Decant</span>
              {sizes.decant5.available && (
                <input
                  type="number" min="0" placeholder="Price (Rs.)"
                  value={sizes.decant5.price}
                  onChange={(e) => setSizes({ ...sizes, decant5: { ...sizes.decant5, price: e.target.value } })}
                  onClick={(e) => e.stopPropagation()}
                  className={`${inputCls} w-32`}
                />
              )}
            </label>

            <label className="flex items-center gap-3 bg-black border border-gray-900 rounded-lg px-4 py-3 cursor-pointer">
              <input
                type="checkbox"
                checked={sizes.decant10.available}
                onChange={(e) => setSizes({ ...sizes, decant10: { ...sizes.decant10, available: e.target.checked } })}
                className="accent-white"
              />
              <span className="text-xs text-white flex-1">10ML Decant</span>
              {sizes.decant10.available && (
                <input
                  type="number" min="0" placeholder="Price (Rs.)"
                  value={sizes.decant10.price}
                  onChange={(e) => setSizes({ ...sizes, decant10: { ...sizes.decant10, price: e.target.value } })}
                  onClick={(e) => e.stopPropagation()}
                  className={`${inputCls} w-32`}
                />
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

// =============================================================================
// 5 & 6. Orders
// =============================================================================

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

function OrderStatusBadge({ status }) {
  const tone = {
    pending: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    processing: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    shipped: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
    delivered: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
    cancelled: 'bg-red-500/10 text-red-400 border-red-500/30',
  }[status];
  return <span className={`px-2 py-1 text-[9px] font-bold uppercase tracking-widest rounded-sm border ${tone}`}>{status}</span>;
}

function OrdersTab({ orders, reload }) {
  const [filter, setFilter] = useState('All');
  const visible = filter === 'All' ? orders : orders.filter((o) => o.status === filter);

  const handleStatusChange = async (id, status) => {
    await api.put(`/admin/orders/${id}/status`, { status });
    reload();
  };

  const exportCsv = () => downloadCsv('orders.csv', visible, [
    ['id', 'Order ID'], ['first_name', 'First Name'], ['last_name', 'Last Name'], ['email', 'Email'], ['phone', 'Phone'],
    ['address1', 'Address'], ['city', 'City'], ['postal_code', 'Postal Code'],
    ['payment_method', 'Payment Method'], ['total', 'Total'], ['status', 'Status'], ['created_at', 'Placed At'],
  ]);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap items-center">
        {['All', 'pending', 'processing', 'shipped', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 text-[10px] font-konexy uppercase tracking-widest rounded-lg transition-all ${
              filter === s ? 'bg-white text-black' : 'bg-[#0a0a0a] text-gray-500 border border-gray-900 hover:text-white'
            }`}
          >
            {s}
          </button>
        ))}
        <button
          onClick={exportCsv}
          className="ml-auto flex items-center gap-1.5 text-[10px] font-konexy uppercase tracking-widest text-gray-400 hover:text-white border border-gray-800 hover:border-gray-600 px-3 py-2 rounded-lg transition-colors"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
            <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4">Payment</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Status</th></tr>
          </thead>
          <tbody className="divide-y divide-gray-900">
            {visible.map((o) => (
              <tr key={o.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4 font-mono text-white font-medium">#{o.id}</td>
                <td className="p-4">
                  <div className="text-white font-medium">{o.first_name} {o.last_name}</div>
                  <div className="text-[10px] text-gray-600">{o.email}</div>
                </td>
                <td className="p-4 text-gray-400 uppercase text-[10px] tracking-widest">
                  <div>{o.payment_method === 'bank_transfer' ? 'Bank Transfer' : 'COD'}</div>
                  {o.payment_method === 'bank_transfer' && (
                    o.payment_slip_url ? (
                      <a
                        href={o.payment_slip_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-block mt-1 text-blue-400 hover:text-blue-300 normal-case tracking-normal underline underline-offset-2"
                      >
                        View Slip
                      </a>
                    ) : (
                      <span className="inline-block mt-1 text-red-400 normal-case tracking-normal">No slip uploaded</span>
                    )
                  )}
                </td>
                <td className="p-4 text-right text-white font-medium">Rs. {Number(o.total).toLocaleString()}</td>
                <td className="p-4 text-center">
                  <select
                    value={o.status}
                    onChange={(e) => handleStatusChange(o.id, e.target.value)}
                    className="bg-black border border-gray-800 text-[10px] uppercase tracking-widest text-gray-300 px-2 py-1.5 rounded-md outline-none cursor-pointer"
                  >
                    {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No orders found.</div>}
      </Card>
    </div>
  );
}

function DeliveredOrdersTab({ orders }) {
  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-xs">
        <thead className="bg-white/5 text-gray-500 uppercase text-[9px] tracking-widest border-b border-gray-900">
          <tr><th className="p-4">Order</th><th className="p-4">Customer</th><th className="p-4 text-right">Total</th><th className="p-4 text-center">Status</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-900">
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-white/5 transition-colors opacity-80">
              <td className="p-4 font-mono text-white font-medium">#{o.id}</td>
              <td className="p-4">
                <div className="text-white font-medium">{o.first_name} {o.last_name}</div>
                <div className="text-[10px] text-gray-600">{o.email}</div>
              </td>
              <td className="p-4 text-right text-white font-medium">Rs. {Number(o.total).toLocaleString()}</td>
              <td className="p-4 text-center"><OrderStatusBadge status={o.status} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      {orders.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No delivered orders yet.</div>}
    </Card>
  );
}

// =============================================================================
// 7. Customers
// =============================================================================

function CustomersTab({ customers }) {
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
      {customers.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No registered customers yet.</div>}
      </Card>
    </div>
  );
}

// =============================================================================
// 8. Promo Banner
// =============================================================================

function BannerTab({ banner, reload }) {
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
    <Card className="max-w-2xl p-8">
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

// =============================================================================
// 9. Reviews
// =============================================================================

function ReviewsTab({ reviews, reload }) {
  const act = async (id, action) => {
    await api.put(`/admin/reviews/${id}/${action}`);
    reload();
  };

  return (
    <Card className="p-6 max-w-3xl">
      <SectionTitle icon={Star}>Pending Reviews</SectionTitle>
      {reviews.length === 0 ? (
        <p className="text-xs text-gray-600 uppercase tracking-widest">Nothing to review.</p>
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <div key={r.id} className="border-b border-gray-900 pb-4 last:border-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white font-medium">{r.reviewer_name}</span>
                <span className="text-[10px] text-gray-500 uppercase tracking-widest">{r.product_name}</span>
              </div>
              <div className="flex items-center gap-1 mb-2">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={11} className={i < r.rating ? 'fill-white/70 text-white/70' : 'text-white/20'} />
                ))}
              </div>
              <p className="text-xs text-gray-400 mb-3">"{r.review_text}"</p>
              {r.image_url && (
                <img
                  src={r.image_url}
                  alt="Customer upload"
                  className="w-20 h-20 object-cover rounded-lg border border-gray-800 mb-3"
                />
              )}
              <div className="flex items-center gap-4">
                <button onClick={() => act(r.id, 'approve')} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors">
                  <Check size={13} /> Approve
                </button>
                <button onClick={() => act(r.id, 'reject')} className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-red-500 hover:text-red-400 transition-colors">
                  <X size={13} /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// =============================================================================
// 10. Newsletter
// =============================================================================

function NewsletterTab({ subscribers }) {
  return (
    <Card className="overflow-hidden max-w-2xl">
      <div className="p-6 border-b border-gray-900 flex items-center gap-2">
        <Mail size={15} className="text-gray-500" />
        <span className="text-[11px] font-konexy tracking-[3px] uppercase text-white">{subscribers.length} Subscribers</span>
      </div>
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
      {subscribers.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No subscribers yet.</div>}
    </Card>
  );
}

// =============================================================================
// 11. Contact inquiries
// =============================================================================

function InquiriesTab({ inquiries, reload }) {
  const markRead = async (id) => {
    await api.put(`/admin/contact-messages/${id}/read`);
    reload();
  };

  const remove = async (id) => {
    await api.delete(`/admin/contact-messages/${id}`);
    reload();
  };

  return (
    <Card className="p-6 max-w-3xl">
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

// =============================================================================
// 12. Staff accounts
// =============================================================================

function StaffTab({ staff, reload }) {
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
        {staff.length === 0 && <div className="p-10 text-center text-gray-600 text-[11px] uppercase tracking-widest">No staff accounts yet.</div>}
      </Card>
    </div>
  );
}
