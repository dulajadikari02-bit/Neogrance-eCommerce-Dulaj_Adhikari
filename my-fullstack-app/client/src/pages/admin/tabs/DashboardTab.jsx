import { useEffect, useState } from 'react';
import {
  ShoppingBag, Package, AlertTriangle, DollarSign, CheckCircle, Truck, TrendingUp,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api, { errorMessage } from '../../../lib/api';
import Card from '../../../components/admin/Card';
import SectionTitle from '../../../components/admin/SectionTitle';

export default function DashboardTab({ summary, categorySales, isSuperAdmin, notify }) {
  const [granularity, setGranularity] = useState('month');
  const [profitTrend, setProfitTrend] = useState([]);
  const [migrating, setMigrating] = useState(false);
  const [migrateResult, setMigrateResult] = useState('');

  useEffect(() => {
    if (!isSuperAdmin) return;
    api.get('/admin/analytics/profit-trend', { params: { granularity } })
      .then(({ data }) => setProfitTrend(data.trend))
      .catch((err) => notify(errorMessage(err, 'Could not load the profit trend.'), 'error'));
  }, [granularity, isSuperAdmin, notify]);

  const runMigration = async () => {
    setMigrating(true);
    setMigrateResult('');
    try {
      const { data } = await api.post('/admin/migrate-legacy-images');
      setMigrateResult(data.message);
    } catch (err) {
      setMigrateResult(errorMessage(err));
    } finally {
      setMigrating(false);
    }
  };

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
      {isSuperAdmin && (
        <Card className="p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-xs text-white font-medium">Move old images into the database</p>
            <p className="text-[11px] text-gray-500 mt-0.5">One-time cleanup for photos still saved on disk from before uploads moved to the database. Safe to run more than once.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {migrateResult && <span className="text-[11px] text-gray-400 max-w-xs">{migrateResult}</span>}
            <button
              onClick={runMigration}
              disabled={migrating}
              className="bg-white text-black font-konexy text-[10px] tracking-[2px] uppercase py-2.5 px-5 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50 whitespace-nowrap"
            >
              {migrating ? 'Migrating...' : 'Migrate Legacy Images'}
            </button>
          </div>
        </Card>
      )}

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
