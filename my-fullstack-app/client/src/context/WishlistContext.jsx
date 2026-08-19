import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import { useAuth } from './AuthProvider';

const WishlistContext = createContext(null);
const GUEST_WISHLIST_KEY = 'neogrance_guest_wishlist';

function loadGuestWishlist() {
  try {
    const raw = localStorage.getItem(GUEST_WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveGuestWishlist(items) {
  try {
    localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(items));
  } catch {
    // private-mode / full storage — wishlist just won't survive a refresh this time
  }
}

export function WishlistProvider({ children }) {
  const { user, isLoading: authLoading } = useAuth();
  const [wishlistItems, setWishlistItems] = useState(loadGuestWishlist);
  const mergedForUser = useRef(null);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      mergedForUser.current = null;
      setWishlistItems(loadGuestWishlist());
      return;
    }

    if (mergedForUser.current === user.id) return;
    mergedForUser.current = user.id;

    (async () => {
      const guestItems = loadGuestWishlist();
      try {
        if (guestItems.length) {
          const { data } = await api.post('/users/me/wishlist/merge', {
            productIds: guestItems.map((i) => i.id),
          });
          setWishlistItems(data.products);
          saveGuestWishlist([]);
        } else {
          const { data } = await api.get('/users/me/wishlist');
          setWishlistItems(data.products);
        }
      } catch {
        // offline or a blip — keep whatever was showing, next mount retries
      }
    })();
  }, [user, authLoading]);

  // Guest mode: every change mirrors straight to localStorage.
  useEffect(() => {
    if (!user) saveGuestWishlist(wishlistItems);
  }, [wishlistItems, user]);

  const isInWishlist = (productId) =>
    wishlistItems.some((item) => String(item.id) === String(productId));

  // Add the product if it's not in the wishlist yet, or remove it if it is.
  const toggleWishlist = async (product) => {
    const inList = isInWishlist(product.id);

    setWishlistItems((prev) =>
      inList ? prev.filter((item) => String(item.id) !== String(product.id)) : [...prev, product]
    );

    if (user) {
      try {
        if (inList) await api.delete(`/users/me/wishlist/${product.id}`);
        else await api.post('/users/me/wishlist', { productId: product.id });
      } catch {
        // will resync next load
      }
    }
  };

  const removeFromWishlist = async (productId) => {
    setWishlistItems((prev) => prev.filter((item) => String(item.id) !== String(productId)));
    if (user) {
      try {
        await api.delete(`/users/me/wishlist/${productId}`);
      } catch {
        // will resync next load
      }
    }
  };

  const wishlistCount = wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{ wishlistItems, toggleWishlist, removeFromWishlist, isInWishlist, wishlistCount }}
    >
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
