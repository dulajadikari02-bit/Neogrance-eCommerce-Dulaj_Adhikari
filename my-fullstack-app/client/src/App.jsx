import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ScrollManager from './components/ScrollManager';
import Home from './pages/Home';
import Mens from './pages/Mens';
import Womens from './pages/Womens';
import Unisex from './pages/Unisex';
import CategoryPage from './pages/CategoryPage';
import Contact from './pages/Contact';
import ProductDetails from './pages/ProductDetails';
import WishlistPage from './pages/WishlistPage';
import CartPage from './pages/CartPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackOrderPage from './pages/TrackOrderPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import Admin from './pages/Admin';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthProvider } from './context/AuthProvider';

// A small fade + rise used every time a storefront page changes, so
// navigation feels smooth instead of the new page just snapping into place.
function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.28, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}

// The regular storefront shell: background image, fixed navbar, footer.
// Kept separate from the admin route, which owns its own full-screen layout.
function StorefrontLayout() {
  const location = useLocation();
  // The checkout page shows a stripped-down, logo-only navbar (single row,
  // no icons/links row), so it needs a shorter top offset to match.
  const isCheckout = location.pathname === '/checkout';

  return (
    <div className="relative min-h-screen flex flex-col font-medium">

      {/* Global Background & Overlay */}
      <div className="fixed inset-0 z-[-1]">
        <img
          src="/images/mainback.jpg"
          alt="Neogrance Background"
          className="w-full h-full object-cover opacity-90"
        />
        <div className="absolute inset-0 bg-black/90"></div>
      </div>

      {/* Global Navbar */}
      <Navbar />

      {/* Main Content Routes */}
      {/* Padding matches the navbar's actual height: mobile 73px (single row),
          md+ 117px (with the nav links row added) — except on checkout, whose
          navbar is always just the single logo row. */}
      <main className={`flex-grow ${isCheckout ? 'pt-[73px]' : 'pt-[73px] md:pt-[117px]'}`}>
        <AnimatePresence mode="wait">
          <PageTransition key={location.pathname}>
            <Routes location={location}>
              <Route path="/" element={<Home />} />
              <Route path="/mens" element={<Mens />} />
              <Route path="/womens" element={<Womens />} />
              <Route path="/unisex" element={<Unisex />} />
              <Route path="/category/:slug" element={<CategoryPage />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/product/:id" element={<ProductDetails />} />
              <Route path="/wishlist" element={<WishlistPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/track-order" element={<TrackOrderPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
            </Routes>
          </PageTransition>
        </AnimatePresence>
      </main>

      {/* Global Footer */}
      <Footer />

    </div>
  );
}

export default function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID || ''}>
      <Router>
        <ScrollManager />
        {/* These providers wrap the whole app so any page can read auth, cart, and wishlist data */}
        <AuthProvider>
        <AuthModalProvider>
        <CartProvider>
        <WishlistProvider>
          <Routes>
            <Route path="/admin/*" element={<Admin />} />
            <Route path="/*" element={<StorefrontLayout />} />
          </Routes>
        </WishlistProvider>
        </CartProvider>
        </AuthModalProvider>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}
