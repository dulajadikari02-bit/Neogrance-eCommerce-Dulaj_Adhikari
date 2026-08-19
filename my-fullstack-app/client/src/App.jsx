import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Navbar from './componants/Navbar';
import Footer from './componants/Footer';
import ScrollManager from './componants/ScrollManager';
import Home from './pages/Home';
import Mens from './pages/Mens';
import Womens from './pages/Womens';
import Unisex from './pages/Unisex';
import CategoryPage from './pages/CategoryPage';
import Contact from './pages/Contact';
import ProductDetails from './pages/ProductDetails';
import WishlistPage from './pages/WishlistPage';
import CheckoutPage from './pages/CheckoutPage';
import TrackOrderPage from './pages/TrackOrderPage';
import Admin from './pages/Admin';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { AuthModalProvider } from './context/AuthModalContext';
import { AuthProvider } from './context/AuthProvider';

// The regular storefront shell: background image, fixed navbar, footer.
// Kept separate from the admin route, which owns its own full-screen layout.
function StorefrontLayout() {
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
      <main className="flex-grow pt-[73px] md:pt-[117px]"> {/* Padding matches the navbar's actual height: mobile 73px (single row), md+ 117px (with the nav links row added) */}
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/mens" element={<Mens />} />
          <Route path="/womens" element={<Womens />} />
          <Route path="/unisex" element={<Unisex />} />
          <Route path="/category/:slug" element={<CategoryPage />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/product/:id" element={<ProductDetails />} />
          <Route path="/wishlist" element={<WishlistPage />} />
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="/track-order" element={<TrackOrderPage />} />
        </Routes>
      </main>

      {/* Global Footer */}
      <Footer />

    </div>
  );
}

export default function App() {
  return (
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
  );
}
