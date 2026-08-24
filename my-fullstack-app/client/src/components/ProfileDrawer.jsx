import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { X, User, LogOut, MapPin, Plus, Pencil, Trash2, Star, LayoutDashboard, Download, PackageSearch } from 'lucide-react';
import { useAuth } from '../context/AuthProvider';
import api, { errorMessage } from '../lib/api';
import { formatOrderId } from '../lib/orderIdFormat';
import { downloadOrderInvoice } from '../lib/invoice';

const ORDER_STATUS_STYLE = {
  pending: 'text-gray-400',
  processing: 'text-blue-400',
  shipped: 'text-amber-400',
  delivered: 'text-emerald-400',
  cancelled: 'text-red-400',
};

const emptyAddress = {
  label: 'Home',
  recipientName: '',
  phone: '',
  line1: '',
  line2: '',
  city: '',
  postalCode: '',
  country: 'Sri Lanka',
  isDefault: false,
};

export default function ProfileDrawer({ isOpen, onClose }) {
  const { user, isStaffOrAdmin, logout, updateUser } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');

  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = not editing, 'new' = adding
  const [addressForm, setAddressForm] = useState(emptyAddress);
  const [addressError, setAddressError] = useState('');
  const [savingAddress, setSavingAddress] = useState(false);

  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) fetchAddresses();
    if (isOpen && user) fetchOrders();
  }, [isOpen, user]);

  // Get the user's past orders — includes any orders they placed as a guest
  // before creating an account, once that account uses the same email.
  const fetchOrders = async () => {
    setLoadingOrders(true);
    try {
      const { data } = await api.get('/users/me/orders');
      setOrders(data.orders);
    } catch {
      // ignore, list just stays empty
    } finally {
      setLoadingOrders(false);
    }
  };

  // Get the user's saved delivery addresses from the server.
  const fetchAddresses = async () => {
    setLoadingAddresses(true);
    try {
      const { data } = await api.get('/users/me/addresses');
      setAddresses(data.addresses);
    } catch {
      // ignore, list just stays empty
    } finally {
      setLoadingAddresses(false);
    }
  };

  // Send the updated name/phone to the server and update the logged-in user in state.
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    try {
      const { data } = await api.put('/users/me', { name, phone });
      updateUser(data.user);
      setProfileMessage('Saved.');
      setTimeout(() => setProfileMessage(''), 2000);
    } catch (err) {
      setProfileMessage(errorMessage(err));
    } finally {
      setSavingProfile(false);
    }
  };

  const startAdd = () => {
    setAddressForm(emptyAddress);
    setAddressError('');
    setEditingId('new');
  };

  const startEdit = (addr) => {
    setAddressForm(addr);
    setAddressError('');
    setEditingId(addr.id);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setAddressError('');
  };

  const handleAddressField = (field) => (e) =>
    setAddressForm((prev) => ({ ...prev, [field]: e.target.value }));

  // Create a new address, or update an existing one, depending on editingId.
  const handleSaveAddress = async (e) => {
    e.preventDefault();
    setSavingAddress(true);
    setAddressError('');
    try {
      if (editingId === 'new') {
        await api.post('/users/me/addresses', addressForm);
      } else {
        await api.put(`/users/me/addresses/${editingId}`, addressForm);
      }
      await fetchAddresses();
      setEditingId(null);
    } catch (err) {
      setAddressError(errorMessage(err));
    } finally {
      setSavingAddress(false);
    }
  };

  const handleDeleteAddress = async (id) => {
    await api.delete(`/users/me/addresses/${id}`);
    setAddresses((prev) => prev.filter((a) => a.id !== id));
  };

  const handleSetDefault = async (id) => {
    await api.put(`/users/me/addresses/${id}/default`);
    fetchAddresses();
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!user) return null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity duration-500 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      />

      <div className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-[#0a0a0a] border-l border-white/10 z-50 flex flex-col transition-transform duration-500 ease-in-out ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>

        <div className="p-6 border-b border-white/10 flex items-center justify-between bg-black shrink-0">
          <div className="flex items-center gap-3">
            <User size={18} className="text-white" />
            <h2 className="font-medium text-xs sm:text-sm tracking-[3px] uppercase text-white">
              My Account
            </h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">

          {/* Profile */}
          <section>
            <h3 className="font-konexy text-[11px] tracking-[3px] uppercase text-gray-400 mb-4">Profile</h3>
            <form onSubmit={handleSaveProfile} className="flex flex-col gap-3">
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-xs tracking-wide text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Email</label>
                <input
                  value={user.email}
                  disabled
                  className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 px-4 text-xs tracking-wide text-gray-500 cursor-not-allowed"
                />
              </div>
              <div>
                <label className="block text-[10px] text-gray-500 uppercase tracking-widest mb-1.5">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="07XXXXXXXX"
                  className="w-full bg-black border border-white/10 rounded-lg py-2.5 px-4 text-xs tracking-wide text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-colors"
                />
              </div>
              <div className="flex items-center gap-3 mt-1">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="bg-white text-black font-konexy text-[10px] tracking-[3px] uppercase py-2.5 px-5 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  {savingProfile ? 'Saving...' : 'Save Changes'}
                </button>
                {profileMessage && <span className="text-[10px] text-gray-400 tracking-wide">{profileMessage}</span>}
              </div>
            </form>
          </section>

          <div className="h-[1px] bg-white/10" />

          {/* Addresses */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-konexy text-[11px] tracking-[3px] uppercase text-gray-400">Saved Addresses</h3>
              {editingId === null && (
                <button
                  onClick={startAdd}
                  className="flex items-center gap-1.5 text-[10px] text-white/70 hover:text-white uppercase tracking-widest transition-colors"
                >
                  <Plus size={14} /> Add
                </button>
              )}
            </div>

            {loadingAddresses ? (
              <p className="text-xs text-gray-500 tracking-widest uppercase py-4">Loading...</p>
            ) : (
              <div className="flex flex-col gap-3">
                {addresses.map((addr) => (
                  <div key={addr.id} className="p-4 bg-black rounded-xl border border-white/10">
                    {editingId === addr.id ? (
                      <AddressForm
                        form={addressForm}
                        onChange={handleAddressField}
                        onCancel={cancelEdit}
                        onSubmit={handleSaveAddress}
                        saving={savingAddress}
                        error={addressError}
                      />
                    ) : (
                      <>
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} className="text-white/40" />
                            <span className="text-xs uppercase tracking-widest text-white font-medium">{addr.label}</span>
                            {addr.isDefault && (
                              <span className="flex items-center gap-1 text-[9px] text-white/60 uppercase tracking-widest">
                                <Star size={10} className="fill-white/60" /> Default
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button onClick={() => startEdit(addr)} className="text-gray-500 hover:text-white transition-colors">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => handleDeleteAddress(addr.id)} className="text-gray-500 hover:text-white transition-colors">
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          {addr.recipientName} · {addr.phone}<br />
                          {addr.line1}{addr.line2 ? `, ${addr.line2}` : ''}<br />
                          {addr.city}, {addr.postalCode}, {addr.country}
                        </p>
                        {!addr.isDefault && (
                          <button
                            onClick={() => handleSetDefault(addr.id)}
                            className="mt-2 text-[10px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors"
                          >
                            Set as default
                          </button>
                        )}
                      </>
                    )}
                  </div>
                ))}

                {editingId === 'new' && (
                  <div className="p-4 bg-black rounded-xl border border-white/10">
                    <AddressForm
                      form={addressForm}
                      onChange={handleAddressField}
                      onCancel={cancelEdit}
                      onSubmit={handleSaveAddress}
                      saving={savingAddress}
                      error={addressError}
                    />
                  </div>
                )}

                {!addresses.length && editingId === null && (
                  <p className="text-xs text-gray-500 tracking-wide py-2">No saved addresses yet.</p>
                )}
              </div>
            )}
          </section>

          <div className="h-[1px] bg-white/10" />

          {/* Order History */}
          <section>
            <h3 className="font-konexy text-[11px] tracking-[3px] uppercase text-gray-400 mb-4">Order History</h3>

            {loadingOrders ? (
              <p className="text-xs text-gray-500 tracking-widest uppercase py-4">Loading...</p>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center text-center py-6 gap-2">
                <PackageSearch size={22} className="text-white/20" />
                <p className="text-xs text-gray-500 tracking-wide">No orders yet.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {orders.map((o) => (
                  <div key={o.id} className="p-4 bg-black rounded-xl border border-white/10">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="block text-xs font-mono text-white tracking-wide">{formatOrderId(o.id)}</span>
                        <span className="block text-[10px] text-gray-500 mt-0.5">
                          {new Date(o.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                      <span className={`text-[10px] uppercase tracking-widest font-medium ${ORDER_STATUS_STYLE[o.status] || 'text-gray-400'}`}>
                        {o.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-sm text-white font-medium">Rs. {Number(o.total).toLocaleString()}</span>
                      <button
                        onClick={() => downloadOrderInvoice(o.id)}
                        className="flex items-center gap-1.5 text-[10px] text-gray-400 hover:text-white uppercase tracking-widest transition-colors"
                      >
                        <Download size={12} /> Invoice
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>

        <div className="p-6 border-t border-white/10 bg-black shrink-0 flex flex-col gap-3">
          {isStaffOrAdmin && (
            <Link
              to="/admin"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-3.5 rounded-lg hover:bg-gray-200 transition-all duration-300"
            >
              <LayoutDashboard size={16} /> Admin Dashboard
            </Link>
          )}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 border border-white/10 hover:border-white/40 text-white/80 hover:text-white font-konexy text-[11px] tracking-[3px] uppercase py-3.5 rounded-lg transition-all duration-300"
          >
            <LogOut size={16} /> Log Out
          </button>
        </div>
      </div>
    </>
  );
}

function AddressForm({ form, onChange, onCancel, onSubmit, saving, error }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-2.5 text-left">
      <div className="grid grid-cols-2 gap-2.5">
        <input required placeholder="Label (Home/Work)" value={form.label} onChange={onChange('label')} className="col-span-2 bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
        <input required placeholder="Recipient Name" value={form.recipientName} onChange={onChange('recipientName')} className="col-span-2 bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
        <input required placeholder="Phone" value={form.phone} onChange={onChange('phone')} className="col-span-2 bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
        <input required placeholder="Address Line 1" value={form.line1} onChange={onChange('line1')} className="col-span-2 bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
        <input placeholder="Address Line 2 (optional)" value={form.line2 || ''} onChange={onChange('line2')} className="col-span-2 bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
        <input required placeholder="City" value={form.city} onChange={onChange('city')} className="bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
        <input required placeholder="Postal Code" value={form.postalCode} onChange={onChange('postalCode')} className="bg-[#111] border border-white/10 rounded-md py-2 px-3 text-[11px] text-white placeholder-gray-600 focus:outline-none focus:border-white/40" />
      </div>
      {error && <p className="text-[10px] text-red-400">{error}</p>}
      <div className="flex items-center gap-2 mt-1">
        <button type="submit" disabled={saving} className="bg-white text-black font-konexy text-[10px] tracking-[2px] uppercase py-2 px-4 rounded-md hover:bg-gray-200 transition-all disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="text-[10px] text-gray-500 hover:text-white uppercase tracking-widest transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}
