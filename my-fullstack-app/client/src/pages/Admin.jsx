import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardList, Users, Image as ImageIcon, Star, LogOut,
  Package, AlertTriangle, FolderHeart, Mail, CheckCircle, Truck, Plus,
  ArrowLeft, MessageSquare, UserCog, ShieldCheck, Menu, X,
} from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import api, { errorMessage } from '../lib/api';
import logo from '../assets/logo.png';

import DashboardTab from './admin/tabs/DashboardTab';
import CategoriesTab from './admin/tabs/CategoriesTab';
import ProductsTab from './admin/tabs/ProductsTab';
import ProductFormTab from './admin/tabs/ProductFormTab';
import OrdersTab from './admin/tabs/OrdersTab';
import DeliveredOrdersTab from './admin/tabs/DeliveredOrdersTab';
import CustomersTab from './admin/tabs/CustomersTab';
import StaffTab from './admin/tabs/StaffTab';
import HeroBannerTab from './admin/tabs/HeroBannerTab';
import BannerTab from './admin/tabs/BannerTab';
import ReviewsTab from './admin/tabs/ReviewsTab';
import NewsletterTab from './admin/tabs/NewsletterTab';
import InquiriesTab from './admin/tabs/InquiriesTab';

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
      { id: 'hero-banner', label: 'Hero Banner', icon: ImageIcon, superAdminOnly: true },
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
  // Sidebar is a permanent column on desktop, but a slide-in drawer on mobile
  // (there's no room for a 256px rail next to actual content on a phone).
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [summary, setSummary] = useState(null);
  const [categorySales, setCategorySales] = useState([]);
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [banner, setBanner] = useState(null);
  const [heroBanner, setHeroBanner] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [staffAccounts, setStaffAccounts] = useState([]);

  const [editingProductId, setEditingProductId] = useState(null);

  const [toast, setToast] = useState(null);
  const notify = (message, tone = 'success') => setToast({ message, tone, id: Date.now() });
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Every fetch below reports failure via a toast instead of failing silently —
  // an expired session or transient error used to leave a tab blank/stale
  // with no indication anything went wrong.
  const loadDashboard = () => {
    api.get('/admin/dashboard').then(({ data }) => setSummary(data))
      .catch((err) => notify(errorMessage(err, 'Could not load dashboard summary.'), 'error'));
    if (isSuperAdmin) {
      api.get('/admin/analytics/category-sales').then(({ data }) => setCategorySales(data.categorySales))
        .catch((err) => notify(errorMessage(err, 'Could not load category sales.'), 'error'));
    }
  };
  const loadCategories = () =>
    api.get('/categories').then(({ data }) => setCategories(data.categories))
      .catch((err) => notify(errorMessage(err, 'Could not load categories.'), 'error'));
  const loadProducts = () =>
    api.get('/admin/products').then(({ data }) => setProducts(data.products))
      .catch((err) => notify(errorMessage(err, 'Could not load products.'), 'error'));
  const loadOrders = () =>
    api.get('/admin/orders').then(({ data }) => setOrders(data.orders))
      .catch((err) => notify(errorMessage(err, 'Could not load orders.'), 'error'));
  const loadCustomers = () =>
    api.get('/admin/customers').then(({ data }) => setCustomers(data.customers))
      .catch((err) => notify(errorMessage(err, 'Could not load customers.'), 'error'));
  const loadReviews = () =>
    api.get('/admin/reviews', { params: { status: 'pending' } }).then(({ data }) => setPendingReviews(data.reviews))
      .catch((err) => notify(errorMessage(err, 'Could not load reviews.'), 'error'));
  const loadSubscribers = () =>
    api.get('/admin/newsletter').then(({ data }) => setSubscribers(data.subscribers))
      .catch((err) => notify(errorMessage(err, 'Could not load newsletter subscribers.'), 'error'));
  // Banner/hero-banner 404 legitimately (no banner set up yet) — that's not a
  // failure worth a toast, just an empty state, so these two keep their quiet catch.
  const loadBanner = () => api.get('/admin/banner').then(({ data }) => setBanner(data.banner)).catch(() => setBanner(null));
  const loadHeroBanner = () => api.get('/admin/hero-banner').then(({ data }) => setHeroBanner(data.heroBanner)).catch(() => setHeroBanner(null));
  const loadInquiries = () =>
    api.get('/admin/contact-messages').then(({ data }) => setInquiries(data.messages))
      .catch((err) => notify(errorMessage(err, 'Could not load inquiries.'), 'error'));
  const loadStaffAccounts = () =>
    api.get('/admin/staff').then(({ data }) => setStaffAccounts(data.staff))
      .catch((err) => notify(errorMessage(err, 'Could not load staff accounts.'), 'error'));

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
    loadHeroBanner();
    loadInquiries();
    loadStaffAccounts();
  }, []);

  const activeOrders = useMemo(() => orders.filter((o) => o.status !== 'delivered'), [orders]);
  const deliveredOrders = useMemo(() => orders.filter((o) => o.status === 'delivered'), [orders]);

  const goToTab = (id) => {
    if (id === 'product-form') startNewProduct();
    else setActiveTab(id);
    setSidebarOpen(false);
  };
  const startEditProduct = (id) => {
    setEditingProductId(id);
    setActiveTab('product-form');
    setSidebarOpen(false);
  };
  const startNewProduct = () => {
    setEditingProductId(null);
    setActiveTab('product-form');
  };

  return (
    <div className="h-dvh w-full bg-black text-gray-300 flex overflow-hidden">

      {/* Backdrop behind the sidebar drawer on mobile — tapping it closes the menu. */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR — a fixed slide-in drawer below the lg breakpoint, a normal
          static column at lg and above. */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-gray-900 flex flex-col justify-between h-full shrink-0 transform transition-transform duration-300 ease-in-out
          lg:static lg:z-auto lg:w-64 lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="overflow-y-auto">
          <div className="flex items-center justify-between gap-3 px-6 py-6 border-b border-gray-900">
            <Link to="/" className="flex items-center gap-3">
              <img src={logo} alt="Neogrance" className="h-6 w-auto object-contain" />
              <span className="text-[9px] tracking-[3px] text-gray-500 uppercase font-konexy">Admin</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-white transition-colors"
              aria-label="Close menu"
            >
              <X size={18} />
            </button>
          </div>

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
                      onClick={() => goToTab(id)}
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
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        <div className="flex justify-between items-center gap-3 px-4 py-4 sm:px-6 lg:px-8 lg:py-5 border-b border-gray-900 shrink-0 bg-[#0a0a0a]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-400 hover:text-white transition-colors shrink-0"
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-[10px] uppercase tracking-[3px] text-gray-500 font-konexy truncate">
              Admin / <span className="text-white">{TAB_LABELS[activeTab]}</span>
            </h2>
          </div>
          <div className="text-[10px] text-gray-500 font-medium flex items-center gap-2 uppercase tracking-widest shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="hidden sm:inline">{user.name}</span>
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] ${
              isSuperAdmin ? 'border-amber-500/30 text-amber-400 bg-amber-500/5' : 'border-blue-500/30 text-blue-400 bg-blue-500/5'
            }`}>
              <ShieldCheck size={10} /> {isSuperAdmin ? 'Super Admin' : 'Staff'}
            </span>
          </div>
        </div>

        {/* Every tab below stays mounted the whole time the dashboard is open —
            only its visibility toggles. Unmounting on tab-switch used to wipe
            out in-progress form fields and in-flight saves (e.g. leaving Add
            Product mid-save and coming back reset the form); this way state
            survives switching tabs, and only resets if you leave /admin
            entirely, which is expected. */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto overflow-x-hidden">
          <div className={activeTab === 'dashboard' ? '' : 'hidden'}>
            <DashboardTab summary={summary} categorySales={categorySales} isSuperAdmin={isSuperAdmin} notify={notify} />
          </div>
          <div className={activeTab === 'categories' ? '' : 'hidden'}>
            <CategoriesTab categories={categories} reload={() => { loadCategories(); loadDashboard(); }} />
          </div>
          <div className={activeTab === 'products' ? '' : 'hidden'}>
            <ProductsTab
              products={products}
              categories={categories}
              isSuperAdmin={isSuperAdmin}
              onEdit={startEditProduct}
              reload={() => { loadProducts(); loadDashboard(); }}
            />
          </div>
          <div className={activeTab === 'product-form' ? '' : 'hidden'}>
            <ProductFormTab
              productId={editingProductId}
              categories={categories}
              notify={notify}
              onDone={() => { loadProducts(); loadDashboard(); setActiveTab('products'); }}
            />
          </div>
          <div className={activeTab === 'orders' ? '' : 'hidden'}>
            <OrdersTab orders={activeOrders} reload={() => { loadOrders(); loadDashboard(); }} notify={notify} />
          </div>
          <div className={activeTab === 'delivered-orders' ? '' : 'hidden'}>
            <DeliveredOrdersTab orders={deliveredOrders} />
          </div>
          <div className={activeTab === 'customers' ? '' : 'hidden'}>
            <CustomersTab customers={customers} />
          </div>
          <div className={activeTab === 'staff' ? '' : 'hidden'}>
            <StaffTab staff={staffAccounts} reload={loadStaffAccounts} />
          </div>
          <div className={activeTab === 'hero-banner' ? '' : 'hidden'}>
            <HeroBannerTab banner={heroBanner} reload={loadHeroBanner} />
          </div>
          <div className={activeTab === 'banner' ? '' : 'hidden'}>
            <BannerTab banner={banner} reload={loadBanner} />
          </div>
          <div className={activeTab === 'reviews' ? '' : 'hidden'}>
            <ReviewsTab reviews={pendingReviews} reload={() => { loadReviews(); loadDashboard(); }} />
          </div>
          <div className={activeTab === 'newsletter' ? '' : 'hidden'}>
            <NewsletterTab subscribers={subscribers} />
          </div>
          <div className={activeTab === 'inquiries' ? '' : 'hidden'}>
            <InquiriesTab inquiries={inquiries} reload={() => { loadInquiries(); loadDashboard(); }} />
          </div>
        </div>
      </div>

      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 text-xs font-medium px-5 py-3.5 rounded-lg shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 ${
            toast.tone === 'error' ? 'bg-red-500 text-white' : 'bg-white text-black'
          }`}
        >
          {toast.tone === 'error' ? <AlertTriangle size={15} /> : <CheckCircle size={15} />} {toast.message}
        </div>
      )}
    </div>
  );
}
