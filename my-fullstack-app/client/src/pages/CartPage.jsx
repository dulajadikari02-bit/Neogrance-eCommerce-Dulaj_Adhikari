import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronRight, ShoppingBag, Trash2, Plus, Minus, ArrowRight } from 'lucide-react';
import { useCart } from '../context/CartContext';

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-2 pb-24 w-full text-white">
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24">

        {/* ================= BREADCRUMB ================= */}
        <div className="flex items-center text-[9px] sm:text-[11px] tracking-[2px] text-gray-500 uppercase font-medium mb-10">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-white">Cart</span>
        </div>

        <h1 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-10">
          Your Cart
        </h1>

        {cartItems.length === 0 ? (
          /* Empty state, matching the wishlist page's pattern */
          <div className="flex flex-col items-center justify-center text-center py-16 sm:py-24">
            <ShoppingBag size={48} className="text-gray-800 mb-6" />
            <h3 className="text-md sm:text-lg text-white tracking-widest uppercase mb-4 font-medium">
              Your cart is empty
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm font-light mb-8 text-center max-w-sm">
              Looks like you haven't added anything yet. Explore the collection to find your next signature scent.
            </p>
            <Link
              to="/"
              className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-4 px-8 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Explore Collection
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

            {/* ================= LEFT: ITEMS ================= */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              {cartItems.map((item) => (
                <div
                  key={item.key}
                  className="flex gap-4 p-4 bg-[#111] rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300"
                >
                  <img
                    src={item.image}
                    alt={item.name}
                    loading="lazy"
                    className="w-24 h-28 object-cover rounded-lg bg-black shrink-0"
                  />

                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-1">
                        <h4 className="font-konexy text-xs sm:text-sm tracking-wider uppercase text-white">
                          {item.name}
                        </h4>
                        <button
                          onClick={() => removeFromCart(item.key)}
                          aria-label="Remove item"
                          className="text-white/40 hover:text-white transition-colors shrink-0"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                      {item.variant && (
                        <span className="text-[10px] text-white/40 tracking-widest uppercase block mb-1">
                          {item.variant}
                        </span>
                      )}
                      <span className="text-xs text-white/40 font-light">
                        Rs. {item.price.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-3 bg-black rounded border border-white/10 px-2 py-1">
                        <button
                          onClick={() => updateQuantity(item.key, 'dec')}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="text-xs text-white font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.key, 'inc')}
                          className="text-white/40 hover:text-white transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <span className="text-sm text-white font-medium">
                        Rs. {(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ================= RIGHT: SUMMARY ================= */}
            <div className="lg:col-span-5">
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6 lg:p-8 sticky top-28">
                <h2 className="font-konexy text-xl tracking-[3px] uppercase mb-6">Order Summary</h2>

                <div className="flex justify-between items-center text-sm text-gray-400 pb-6 border-b border-white/10">
                  <span>Subtotal</span>
                  <span className="text-white text-base font-light">Rs. {subtotal.toLocaleString()}</span>
                </div>

                <p className="text-[10px] text-white/40 tracking-wider font-light mt-4 mb-8">
                  Shipping & taxes calculated at checkout.
                </p>

                <button
                  onClick={() => navigate('/checkout')}
                  className="w-full bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-5 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300"
                >
                  <span>Proceed to Checkout</span>
                  <ArrowRight size={16} />
                </button>

                <Link
                  to="/"
                  className="block text-center text-xs text-white/50 hover:text-white underline underline-offset-4 transition-colors mt-6"
                >
                  Continue Shopping
                </Link>
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
