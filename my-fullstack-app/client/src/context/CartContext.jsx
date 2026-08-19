import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthProvider';

const CartContext = createContext(null);
const GUEST_CART_KEY = 'neogrance_guest_cart';

function loadGuestCart() {
  try {
    const raw = localStorage.getItem(GUEST_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGuestCart(items) {
  try {
    localStorage.setItem(GUEST_CART_KEY, JSON.stringify(items));
  } catch {
    // private-mode / full storage — cart just won't survive a refresh this time
  }
}

function mapServerCartItem(row) {
  return {
    key: `${row.productId}-${row.variantId ?? 'none'}`,
    dbId: row.id,
    id: row.productId,
    name: row.name,
    image: row.image,
    variant: row.variant,
    variantId: row.variantId,
    price: row.price,
    quantity: row.quantity,
  };
}

export function CartProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const [cartItems, setCartItems] = useState(loadGuestCart);
  const [isCartOpen, setIsCartOpen] = useState(false);
  // Tracks which user id we've already pulled/merged the server cart for,
  // so the effect below doesn't re-merge the (now empty) guest cart on every render.
  const mergedForUser = useRef(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      mergedForUser.current = null;
      setCartItems(loadGuestCart());
      return;
    }

    if (mergedForUser.current === user.id) return;
    mergedForUser.current = user.id;

    (async () => {
      const guestItems = loadGuestCart();
      try {
        if (guestItems.length) {
          const { data } = await api.post('/users/me/cart/merge', {
            items: guestItems.map((i) => ({ productId: i.id, variantId: i.variantId, quantity: i.quantity })),
          });
          setCartItems(data.items.map(mapServerCartItem));
          saveGuestCart([]);
        } else {
          const { data } = await api.get('/users/me/cart');
          setCartItems(data.items.map(mapServerCartItem));
        }
      } catch {
        // offline or a blip — keep whatever was showing, next mount retries
      }
    })();
  }, [user, authLoading]);

  // Guest mode: every change mirrors straight to localStorage.
  useEffect(() => {
    if (!user) saveGuestCart(cartItems);
  }, [cartItems, user]);

  // Add an item to the cart. Logged-in users save it to the server; guests
  // just update local state (which gets mirrored to localStorage above).
  const addToCart = async (product, variant, quantity = 1) => {
    const key = `${product.id}-${variant?.id ?? 'none'}`;
    setIsCartOpen(true);

    if (user) {
      try {
        const { data } = await api.post('/users/me/cart', {
          productId: product.id,
          variantId: variant?.id || null,
          quantity,
        });
        setCartItems(data.items.map(mapServerCartItem));
      } catch {
        // leave the cart as it was — better than showing a fake success
      }
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.key === key);
      if (existing) {
        return prev.map((item) => (item.key === key ? { ...item, quantity: item.quantity + quantity } : item));
      }
      return [
        ...prev,
        {
          key,
          id: product.id,
          name: product.name,
          image: product.image,
          variant: variant?.name ?? null,
          variantId: variant?.id ?? null,
          price: variant?.price ?? product.price,
          quantity,
        },
      ];
    });
  };

  const removeFromCart = async (key) => {
    const item = cartItems.find((i) => i.key === key);
    setCartItems((prev) => prev.filter((i) => i.key !== key));
    if (user && item?.dbId) {
      try {
        await api.delete(`/users/me/cart/${item.dbId}`);
      } catch {
        // will resync next load
      }
    }
  };

  // type is 'inc' | 'dec' — matches CartDrawer's existing call sites.
  const updateQuantity = async (key, type) => {
    const item = cartItems.find((i) => i.key === key);
    if (!item) return;
    const newQuantity = type === 'inc' ? item.quantity + 1 : item.quantity - 1;

    if (newQuantity <= 0) {
      await removeFromCart(key);
      return;
    }

    setCartItems((prev) => prev.map((i) => (i.key === key ? { ...i, quantity: newQuantity } : i)));

    if (user && item.dbId) {
      try {
        await api.put(`/users/me/cart/${item.dbId}`, { quantity: newQuantity });
      } catch {
        // will resync next load
      }
    }
  };

  const clearCart = async () => {
    setCartItems([]);
    if (user) {
      try {
        await api.delete('/users/me/cart');
      } catch {
        // server also clears the cart when the order is placed, so this is a backstop
      }
    } else {
      saveGuestCart([]);
    }
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        isCartOpen,
        openCart,
        closeCart,
        cartCount,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
