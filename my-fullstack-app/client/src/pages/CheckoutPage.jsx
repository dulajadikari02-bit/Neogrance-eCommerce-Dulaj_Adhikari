import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Copy, CheckCircle, UploadCloud, Truck, Landmark, FileText, Info, X, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuthModal } from '../context/AuthModalContext';
import { useAuth } from '../context/AuthProvider';
import api, { errorMessage } from '../lib/api';
import { downloadOrderInvoice } from '../lib/invoice';

export default function CheckoutPage() {
  const { cartItems, subtotal, clearCart } = useCart();
  const { openAuth } = useAuthModal();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [slipFile, setSlipFile] = useState(null);
  const slipInputRef = useRef(null);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [placedOrder, setPlacedOrder] = useState(null);

  // Tracks which field was just copied, so we can show a "copied" checkmark briefly.
  const [copiedField, setCopiedField] = useState(null);

  // Contact & Shipping Form Fields
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address1: '',
    city: '',
    postalCode: '',
    phone: '',
  });

  const handleFieldChange = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  // If the user is logged in, auto-fill the form using their saved default address.
  // We only fill empty fields, so we never overwrite anything the user already typed.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fillFromAddress = (addr) => {
      if (cancelled) return;
      setFormData((prev) => {
        const next = { ...prev };
        if (!next.email) next.email = user.email || '';
        if (!next.phone) next.phone = (addr && addr.phone) || user.phone || '';
        if (addr) {
          if (!next.firstName || !next.lastName) {
            const [first, ...rest] = (addr.recipientName || '').trim().split(' ');
            if (!next.firstName) next.firstName = first || '';
            if (!next.lastName) next.lastName = rest.join(' ');
          }
          if (!next.address1) next.address1 = addr.line2 ? `${addr.line1}, ${addr.line2}` : addr.line1;
          if (!next.city) next.city = addr.city || '';
          if (!next.postalCode) next.postalCode = addr.postalCode || '';
        }
        return next;
      });
    };

    api
      .get('/users/me/addresses')
      .then(({ data }) => {
        const addr = data.addresses.find((a) => a.isDefault) || data.addresses[0];
        fillFromAddress(addr);
      })
      .catch(() => fillFromAddress(null));

    return () => {
      cancelled = true;
    };
  }, [user]);

  // Disable the "Place Order" button if any text field is still empty.
  const isFormComplete = Object.values(formData).every((value) => value.trim() !== '');

  const shippingFee = 400; // Standard Sri Lankan shipping fee
  const total = subtotal + shippingFee;

  // Copies bank account details to the clipboard when the copy icon is clicked.
  const handleCopy = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Store the selected payment-slip file so it can be uploaded with the order.
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSlipFile(file);
    }
  };

  const clearSlipFile = () => {
    setSlipFile(null);
    if (slipInputRef.current) slipInputRef.current.value = '';
  };

  // Disable checkout if the cart is empty, the form isn't complete, or bank
  // transfer is selected but no payment slip has been uploaded yet.
  const isCheckoutDisabled =
    cartItems.length === 0 || !isFormComplete || (paymentMethod === 'bank' && !slipFile);

  // Send the order to the server, then empty the cart once it succeeds.
  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    setOrderError('');
    try {
      const payload = new FormData();
      payload.append('firstName', formData.firstName);
      payload.append('lastName', formData.lastName);
      payload.append('email', formData.email);
      payload.append('phone', formData.phone);
      payload.append('address1', formData.address1);
      payload.append('city', formData.city);
      payload.append('postalCode', formData.postalCode);
      payload.append('paymentMethod', paymentMethod === 'bank' ? 'bank_transfer' : 'cod');
      payload.append(
        'items',
        JSON.stringify(
          cartItems.map((item) => ({ productId: item.id, variantId: item.variantId, quantity: item.quantity }))
        )
      );
      if (slipFile) payload.append('paymentSlip', slipFile);

      const { data } = await api.post('/orders', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPlacedOrder(data);
      clearCart();
    } catch (err) {
      setOrderError(errorMessage(err, 'Could not place your order. Please try again.'));
    } finally {
      setIsPlacingOrder(false);
    }
  };

  if (placedOrder) {
    return (
      <div className="min-h-screen pt-24 pb-24 w-full text-white flex flex-col items-center justify-center text-center px-4">
        <CheckCircle size={48} className="text-white mb-6" />
        <h1 className="font-konexy text-2xl tracking-[4px] uppercase mb-3">Order Placed</h1>
        <p className="text-white text-sm mb-2">Total Rs. {placedOrder.total.toLocaleString()}</p>
        <p className="text-white/40 text-xs tracking-widest uppercase mb-10">
          {paymentMethod === 'bank' ? 'Awaiting admin approval of your payment slip.' : "We'll contact you to confirm delivery."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => downloadOrderInvoice(placedOrder.orderId)}
            className="flex items-center justify-center gap-2 border border-white/30 text-white font-konexy text-[11px] tracking-[3px] uppercase py-3.5 px-10 rounded-lg hover:bg-white hover:text-black transition-all"
          >
            <Download size={15} /> Download Invoice
          </button>
          <button
            onClick={() => navigate('/')}
            className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3.5 px-10 rounded-lg hover:bg-gray-200 transition-all"
          >
            Continue Shopping
          </button>
        </div>
        <p className="text-white/30 text-[10px] tracking-widest uppercase mt-6 max-w-xs">
          Keep your invoice — it has the order ID you'll need to track this order later.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen  pt-2 pb-24 w-full text-white">
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24">
        
        {/* ================= BREADCRUMB ================= */}
        <div className="flex items-center text-[10px] sm:text-xs tracking-[2px] text-gray-500 uppercase font-medium mb-10">
          <Link to="/" className="hover:text-white transition-colors">Home</Link>
          <ChevronRight size={14} className="mx-2" />
          <Link to="/cart" className="hover:text-white transition-colors">Cart</Link>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-white">Checkout</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          
          {/* ================= LEFT COLUMN: CHECKOUT FORM ================= */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            
            {/* 1. Contact Information */}
            <section>
              <div className="flex justify-between items-end mb-4">
                <h2 className="font-konexy text-xl tracking-[3px] uppercase">Contact</h2>
                {!user && (
                  <span className="text-xs text-white/40">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={openAuth}
                      className="text-white underline underline-offset-4 hover:text-gray-300 transition-colors"
                    >
                      Log in
                    </button>
                  </span>
                )}
              </div>
              <input
                type="email"
                placeholder="Email Address (For order updates)"
                value={formData.email}
                onChange={handleFieldChange('email')}
                readOnly={!!user}
                className={`w-full bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm tracking-wide text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors ${
                  user ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              />
              {user && (
                <p className="text-[11px] text-white/40 mt-2">Using your account email.</p>
              )}
            </section>

            {/* 2. Shipping Address */}
            <section>
              <h2 className="font-konexy text-xl tracking-[3px] uppercase mb-4">Shipping Address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input type="text" placeholder="First Name" value={formData.firstName} onChange={handleFieldChange('firstName')} className="w-full bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                <input type="text" placeholder="Last Name" value={formData.lastName} onChange={handleFieldChange('lastName')} className="w-full bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                <input type="text" placeholder="Address Line 1" value={formData.address1} onChange={handleFieldChange('address1')} className="w-full sm:col-span-2 bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                <input type="text" placeholder="City" value={formData.city} onChange={handleFieldChange('city')} className="w-full bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                <input type="text" placeholder="Postal Code" value={formData.postalCode} onChange={handleFieldChange('postalCode')} className="w-full bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
                <input type="tel" placeholder="Phone Number" value={formData.phone} onChange={handleFieldChange('phone')} className="w-full sm:col-span-2 bg-[#111] border border-white/10 rounded-lg py-4 px-4 text-sm text-white placeholder-white/40 focus:outline-none focus:border-white/40 transition-colors" />
              </div>
            </section>

            {/* 3. Payment Method */}
            <section>
              <h2 className="font-konexy text-xl tracking-[3px] uppercase mb-4">Payment Method</h2>
              <div className="flex flex-col gap-4">
                
                {/* Cash on Delivery Option */}
                <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-300 ${paymentMethod === 'cod' ? 'border-white bg-[#111]' : 'border-white/10 bg-black hover:border-white/30'}`}>
                  <input type="radio" name="payment" value="cod" checked={paymentMethod === 'cod'} onChange={() => setPaymentMethod('cod')} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 ${paymentMethod === 'cod' ? 'border-white' : 'border-gray-600'}`}>
                    {paymentMethod === 'cod' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm tracking-widest uppercase font-medium">Cash on Delivery (COD)</span>
                    <span className="block text-xs text-gray-500 mt-1">Pay in cash when your order arrives.</span>
                  </div>
                  <Truck className="text-white/40" size={24} />
                </label>

                {/* Bank Transfer Option */}
                <label className={`relative flex items-center p-4 border rounded-xl cursor-pointer transition-all duration-300 ${paymentMethod === 'bank' ? 'border-white bg-[#111]' : 'border-white/10 bg-black hover:border-white/30'}`}>
                  <input type="radio" name="payment" value="bank" checked={paymentMethod === 'bank'} onChange={() => setPaymentMethod('bank')} className="hidden" />
                  <div className={`w-5 h-5 rounded-full border flex items-center justify-center mr-4 ${paymentMethod === 'bank' ? 'border-white' : 'border-gray-600'}`}>
                    {paymentMethod === 'bank' && <div className="w-2.5 h-2.5 bg-white rounded-full"></div>}
                  </div>
                  <div className="flex-1">
                    <span className="block text-sm tracking-widest uppercase font-medium">Online Bank Transfer</span>
                    <span className="block text-xs text-gray-500 mt-1">Transfer directly to our bank account.</span>
                  </div>
                  <Landmark className="text-white/40" size={24} />
                </label>

                {/* Bank Details & Upload Section (Shows only if Bank Transfer is selected) */}
                {paymentMethod === 'bank' && (
                  <div className="mt-2 p-5 sm:p-6 bg-black border border-white/10 rounded-xl animate-in fade-in slide-in-from-top-4 duration-500">
                    
                    <div className="flex items-start gap-3 mb-6 p-4 bg-yellow-900/10 border border-yellow-900/30 rounded-lg">
                      <Info size={18} className="text-yellow-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-300 leading-relaxed">
                        Please deposit the exact amount to the account below and upload the payment receipt. <strong className="text-white">Your order will only be processed after admin approval.</strong>
                      </p>
                    </div>

                    <div className="space-y-4 mb-8">
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Bank</span>
                        <span className="text-sm font-medium">NDB Bank</span>
                      </div>
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Branch</span>
                        <span className="text-sm font-medium">Kuliyapitiya</span>
                      </div>
                      
                      <div className="flex justify-between items-center pb-3 border-b border-white/10">
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Account Name</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">Neogrance (Pvt) Ltd</span>
                          <button onClick={() => handleCopy('Neogrance (Pvt) Ltd', 'name')} className="text-gray-500 hover:text-white transition-colors">
                            {copiedField === 'name' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="text-xs text-gray-500 uppercase tracking-widest">Account Number</span>
                        <div className="flex items-center gap-3">
                          <span className="text-base font-medium text-white">12345678</span>
                          <button onClick={() => handleCopy('12345678', 'number')} className="text-gray-500 hover:text-white transition-colors">
                            {copiedField === 'number' ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* File Upload Area */}
                    <div className="mt-4">
                      <span className="block text-xs text-gray-500 uppercase tracking-widest mb-3">Upload Payment Slip (PDF/JPG/PNG)</span>
                      <div className="relative">
                      <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-white/10 hover:border-gray-600 rounded-xl cursor-pointer bg-[#0a0a0a] transition-colors group">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {slipFile ? (
                            <>
                              <FileText className="w-8 h-8 text-white mb-2" />
                              <p className="text-sm text-white font-medium truncate max-w-[200px]">{slipFile.name}</p>
                              <p className="text-xs text-gray-500 mt-1">Click to change file</p>
                            </>
                          ) : (
                            <>
                              <UploadCloud className="w-8 h-8 text-gray-600 group-hover:text-white transition-colors mb-2" />
                              <p className="text-sm text-gray-400"><span className="font-semibold text-white">Click to upload</span> or drag and drop</p>
                            </>
                          )}
                        </div>
                        <input ref={slipInputRef} type="file" className="hidden" accept=".pdf, .jpg, .jpeg, .png" onChange={handleFileUpload} />
                      </label>
                      {slipFile && (
                        <button
                          type="button"
                          onClick={clearSlipFile}
                          aria-label="Remove uploaded slip"
                          className="absolute top-2 right-2 p-1.5 bg-black/80 border border-white/10 rounded-full text-gray-400 hover:text-white hover:border-white/40 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                      </div>
                    </div>

                  </div>
                )}
              </div>
            </section>
          </div>

          {/* ================= RIGHT COLUMN: ORDER SUMMARY ================= */}
          <div className="lg:col-span-5">
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 lg:p-8 sticky top-28">
              <h2 className="font-konexy text-xl tracking-[3px] uppercase mb-6">Order Summary</h2>
              
              <div className="flex flex-col gap-4 mb-8 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cartItems.map((item) => (
                  <div key={item.key} className="flex gap-4">
                    <div className="relative">
                      <img src={item.image} alt={item.name} loading="lazy" className="w-16 h-20 object-cover rounded-md bg-black border border-white/10" />
                      <span className="absolute -top-2 -right-2 w-5 h-5 bg-white text-black text-[10px] font-bold flex items-center justify-center rounded-full">
                        {item.quantity}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <h4 className="font-konexy text-xs tracking-wider uppercase text-white line-clamp-1">{item.name}</h4>
                      <span className="text-[10px] text-gray-500 tracking-widest uppercase block mt-1">{item.variant}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-sm font-light text-white">Rs. {(item.price * item.quantity).toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-4 pt-6 border-t border-white/10">
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>Subtotal</span>
                  <span className="text-white">Rs. {subtotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-sm text-gray-400">
                  <span>Shipping</span>
                  <span className="text-white">Rs. {shippingFee.toLocaleString()}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-6 mt-6 border-t border-white/10 mb-8">
                <span className="text-base uppercase tracking-widest font-medium">Total</span>
                <span className="text-2xl font-light text-white">Rs. {total.toLocaleString()}</span>
              </div>

              <button
                disabled={isCheckoutDisabled || isPlacingOrder}
                onClick={handlePlaceOrder}
                className={`w-full font-konexy text-[11px] tracking-[3px] uppercase py-5 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isCheckoutDisabled || isPlacingOrder
                    ? 'bg-white/10 text-gray-600 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]'
                }`}
              >
                {isPlacingOrder
                  ? 'Placing Order...'
                  : cartItems.length === 0
                  ? 'Your Cart Is Empty'
                  : !isFormComplete
                  ? 'Fill All Fields To Continue'
                  : isCheckoutDisabled
                  ? 'Upload Slip To Continue'
                  : 'Place Order'}
              </button>

              {orderError && (
                <p className="text-center text-[11px] text-red-400 mt-4">{orderError}</p>
              )}

              {paymentMethod === 'bank' && (
                <p className="text-center text-[10px] text-gray-500 uppercase tracking-widest mt-4">
                  Awaiting Admin Approval After Submission
                </p>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}