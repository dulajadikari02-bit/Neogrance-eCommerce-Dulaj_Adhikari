import React from 'react';
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

export default function CartDrawer({ isOpen, onClose }) {
  const { cartItems, removeFromCart, updateQuantity, subtotal } = useCart();
  const navigate = useNavigate();

  const handleCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  return (
    <>
      {/* Background Overlay */}
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Cart Side Drawer */}
      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col justify-between transition-transform duration-500 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        {/* Drawer Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black">
          <div className="flex items-center gap-3">
            <ShoppingBag size={18} className="text-white" />
            <h2 className="font-medium text-xs sm:text-sm tracking-[3px] uppercase text-white">
              Shopping Cart ({cartItems.length})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white/40 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingBag size={48} className="text-white/40 mb-4" />
              <p className="text-white/40 text-xs tracking-[2px] uppercase">Your cart is empty</p>
            </div>
          ) : (
            cartItems.map((item) => (
              <div
                key={item.key}
                className="flex gap-4 p-4 bg-black rounded-xl border border-white/10 hover:border-white/30 transition-all duration-300"
              >
                <img
                  src={item.image}
                  alt={item.name}
                  loading="lazy"
                  className="w-20 h-24 object-cover rounded-lg bg-[#111]"
                />

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="font-konexy text-xs tracking-wider uppercase text-white">
                        {item.name}
                      </h4>
                      <button
                        onClick={() => removeFromCart(item.key)}
                        className="text-white/40 hover:text-white transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <span className="text-[10px] text-white/40 tracking-widest uppercase block mb-1">
                      {item.variant}
                    </span>

                    <span className="text-xs text-white/40 font-light">
                      Rs. {item.price.toLocaleString()}
                    </span>
                  </div>

                  {/* Quantity & Subtotal */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-white/10">
                    <div className="flex items-center gap-3 bg-[#111] rounded border border-white/10 px-2 py-1">
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

                    <span className="text-xs text-white font-medium">
                      Rs. {(item.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer */}
        {cartItems.length > 0 && (
          <div className="p-6 border-t border-white/10 bg-black flex flex-col gap-4">
            <div className="flex justify-between items-center text-xs tracking-widest uppercase">
              <span className="text-white/40">Subtotal</span>
              <span className="text-white text-base font-light">
                Rs. {subtotal.toLocaleString()}
              </span>
            </div>

            <p className="text-[10px] text-white/40 tracking-wider font-light">
              Shipping & taxes calculated at checkout.
            </p>

            <button
              onClick={handleCheckout}
              className="w-full bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-4 rounded-lg flex items-center justify-center gap-2 hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300"
            >
              <span>Checkout</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

      </div>
    </>
  );
}
