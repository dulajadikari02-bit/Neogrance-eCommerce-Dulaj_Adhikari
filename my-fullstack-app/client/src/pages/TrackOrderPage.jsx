import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search, Check, XCircle, PackageSearch, Download } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import { downloadOrderInvoice } from '../lib/invoice';

const STEPS = [
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const { data } = await api.post('/orders/track', { orderId: orderId.trim(), email: email.trim() });
      setResult(data);
    } catch (err) {
      setError(errorMessage(err, 'Could not find that order. Please check the details and try again.'));
    } finally {
      setLoading(false);
    }
  };

  // Find which step the order's current status matches, so we know how many
  // steps in the progress bar to mark as "done".
  const stepIndex = result ? STEPS.findIndex((s) => s.key === result.order.status) : -1;
  const isCancelled = result?.order.status === 'cancelled';

  return (
    <div className="min-h-screen pt-2 pb-24 w-full text-white flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        <div className="flex justify-center items-center text-[10px] sm:text-xs tracking-[2px] text-gray-500 uppercase font-medium mb-10">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-white">Track Order</span>
        </div>

        <PackageSearch size={32} className="text-white/40 mb-5" />
        <h1 className="font-konexy text-2xl lg:text-3xl text-white tracking-[4px] uppercase mb-4 text-center">
          Track Your Order
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm font-light tracking-wide mb-12 text-center max-w-md">
          Enter the order ID from your invoice (e.g. neo_00042) and the email you checked out with.
        </p>

        <form onSubmit={handleSubmit} className="w-full flex flex-col sm:flex-row gap-3 mb-4">
          <input
            required
            type="text"
            placeholder="Order ID (e.g. neo_00042)"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            className="w-full sm:w-48 bg-[#111] border border-gray-900 rounded-lg py-4 px-4 text-sm tracking-wide text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
          />
          <input
            required
            type="email"
            placeholder="Email used at checkout"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full flex-1 bg-[#111] border border-gray-900 rounded-lg py-4 px-4 text-sm tracking-wide text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full sm:w-auto bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-4 px-7 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            <Search size={15} />
            {loading ? 'Searching...' : 'Track'}
          </button>
        </form>

        {error && (
          <p className="w-full text-center text-[11px] text-red-400 mb-4">{error}</p>
        )}

        {result && (
          <div className="w-full mt-8 p-6 sm:p-8 bg-black border border-gray-900 rounded-xl">
            <div className="flex flex-wrap items-baseline justify-between gap-2 mb-8">
              <h2 className="font-konexy text-sm tracking-[3px] uppercase text-white">
                Order Status
              </h2>
              <span className="text-xs text-gray-500 tracking-wide">
                Placed {new Date(result.order.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>

            {isCancelled ? (
              <div className="flex items-center gap-3 p-4 bg-red-950/30 border border-red-900/40 rounded-lg mb-8">
                <XCircle size={18} className="text-red-400 shrink-0" />
                <span className="text-xs text-red-300 tracking-widest uppercase">This order was cancelled</span>
              </div>
            ) : (
              <div className="flex items-start justify-between mb-10">
                {STEPS.map((step, i) => {
                  const done = i <= stepIndex;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-2 flex-1">
                        <div
                          className={`w-8 h-8 rounded-full border flex items-center justify-center transition-colors ${
                            done ? 'bg-white border-white text-black' : 'border-gray-800 text-gray-600'
                          }`}
                        >
                          {done ? <Check size={14} /> : <span className="text-[10px]">{i + 1}</span>}
                        </div>
                        <span className={`text-[9px] sm:text-[10px] tracking-widest uppercase text-center ${done ? 'text-white' : 'text-gray-600'}`}>
                          {step.label}
                        </span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className={`h-[1px] flex-1 mt-4 ${i < stepIndex ? 'bg-white' : 'bg-gray-800'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}

            <div className="border-t border-gray-900 pt-6 flex flex-col gap-3">
              {result.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center text-xs">
                  <span className="text-gray-300">
                    {item.product_name}
                    {item.variant_name ? <span className="text-gray-600"> · {item.variant_name}</span> : null}
                    <span className="text-gray-600"> × {item.quantity}</span>
                  </span>
                  <span className="text-white">Rs. {Number(item.line_total).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between items-center text-xs pt-3 mt-2 border-t border-gray-900">
                <span className="text-gray-400 uppercase tracking-widest">Total</span>
                <span className="text-white font-medium">Rs. {Number(result.order.total).toLocaleString()}</span>
              </div>
            </div>

            <button
              onClick={() => downloadOrderInvoice(result.order.id)}
              className="w-full mt-8 flex items-center justify-center gap-2 border border-gray-800 hover:border-white/40 text-gray-300 hover:text-white font-konexy text-[11px] tracking-[3px] uppercase py-3.5 rounded-lg transition-all"
            >
              <Download size={15} /> Download Invoice
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
