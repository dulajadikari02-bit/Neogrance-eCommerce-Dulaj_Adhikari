import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Heart, User, ShoppingBag, Menu, X } from 'lucide-react';
import logo from '../assets/logo.png';
import AuthContext from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuthModal } from '../context/AuthModalContext';
import { useAuth } from '../context/AuthProvider';
import CartDrawer from './CartDrawer';
import ProfileDrawer from './ProfileDrawer';
import ProductCard from './ProductCard';
import api from '../lib/api';

const Navbar = () => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const trimmedQuery = searchQuery.trim();

  // Wait 300ms after the user stops typing before calling the API.
  // This stops sending a request on every single keystroke.
  useEffect(() => {
    if (!trimmedQuery) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      api
        .get('/products', { params: { search: trimmedQuery, limit: 12 } })
        .then(({ data }) => setSearchResults(data.products))
        .catch(() => setSearchResults([]));
    }, 300);
    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

  const closeSearch = () => {
    setIsSearchOpen(false);
    setSearchQuery('');
  };

  const { cartCount, isCartOpen, openCart, closeCart } = useCart();
  const { wishlistCount } = useWishlist();
  const { isAuthOpen, openAuth, closeAuth } = useAuthModal();
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  const handleProfileClick = () => {
    if (isAuthenticated) setIsProfileOpen(true);
    else openAuth();
  };

  // Close the login popup and search box whenever the page route changes.
  useEffect(() => {
    closeAuth();
    closeSearch();
  }, [location.pathname]);

  const navLinks = [
    { name: 'HOME', path: '/' },
    { name: 'MENS', path: '/mens' },
    { name: 'WOMENS', path: '/womens' },
    { name: 'UNISEX', path: '/unisex' }
  ];

  // Change the navbar background once the page is scrolled down a bit.
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
    <nav
      className={`fixed w-full z-50 top-0 left-0 transition-all duration-500 ${
        isScrolled ? 'bg-black/95 backdrop-blur-md border-b  py-2 shadow-lg' : 'bg-black py-4 border-b border-transparent'
      }`}
    >
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24">

        {/* Top Row: Search (Left), Logo (Center), Icons (Right) */}
        <div className="flex items-center justify-between">
          
          {/* Left: Search Bar */}
          <div className="flex-1 flex items-center min-w-0">

            <button
              onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
              className="text-white hover:text-white/40 transition-colors cursor-pointer focus:outline-none"
            >
              <Search size={25} />
            </button>
            <div
              className={`overflow-hidden transition-all duration-500 ease-in-out flex items-center relative ${
                isSearchOpen ? 'w-56 sm:w-64 ml-3 opacity-100' : 'w-0 opacity-0'
              }`}
            >
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search..."
                className="bg-transparent border-b border-white/40 text-white text-md w-full py-1 pr-6 outline-none font-medium tracking-wider placeholder:text-white/40 focus:border-white transition-colors"
              />
              <button
                onClick={closeSearch}
                aria-label="Close search"
                className="absolute right-0 text-white/50 hover:text-white transition-colors p-1"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Center: Logo */}
          <div className="flex-[2] flex justify-center items-center min-w-0">
            <Link to="/">
              <img
                src={logo}
                alt="Logo"
                className={`w-auto object-contain transition-all duration-500 ${
                  isScrolled ? 'h-8' : 'h-10'
                }`}
              />
            </Link>
          </div>

          {/* Right: Wishlist, Cart & Mobile Menu */}
          <div className="flex-1 flex items-center justify-end gap-3 sm:gap-5 md:gap-6 min-w-0">

             <Link to="/wishlist" className="hidden md:block relative text-white hover:text-white/40 transition-colors cursor-pointer">
              <Heart size={25} />
              {wishlistCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {wishlistCount}
                </span>
              )}
            </Link>

            <button
              onClick={openCart}
              className="text-white hover:text-white/40 transition-colors relative cursor-pointer shrink-0"
            >
              <ShoppingBag size={22} className="sm:hidden" />
              <ShoppingBag size={25} className="hidden sm:block" />
              {/* Cart Badge */}
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  {cartCount}
                </span>
              )}
            </button>
            <button
              onClick={handleProfileClick}
              className="hidden md:block text-white hover:text-white/40 transition-colors cursor-pointer focus:outline-none"
            >
              <User size={25} />
            </button>

            {/* Mobile Menu Toggle Button */}
            <button
              className="md:hidden text-white hover:text-white/40 transition-colors focus:outline-none shrink-0"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Bottom Row: Desktop Links */}
        <div className="hidden md:flex justify-center items-center space-x-12 mt-5">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                className="relative group text-white tracking-[0.15em] font-konexy text-xs hover:text-gray-300 tracking-[4px] transition-colors py-1"
              >
                {link.name}
                <span
                  className={`absolute left-1/2 -translate-x-1/2 -bottom-1 h-[1.5px] bg-white transition-all duration-300 ease-out ${
                    isActive ? 'w-full' : 'w-0 group-hover:w-[30%]'
                  }`}
                />
              </Link>
            );
          })}
        </div>
      </div>

      {/* Live Search Backdrop + Mega Panel */}
      {isSearchOpen && trimmedQuery && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
            onClick={closeSearch}
          ></div>

          <div className="absolute top-full left-0 w-full z-50 bg-black/98 backdrop-blur-md border-t border-white/10 shadow-2xl">
            <div
              className="w-full px-4 md:px-8 xl:px-16 2xl:px-24 py-8 max-h-[75vh] overflow-y-auto
              [&::-webkit-scrollbar]:w-1.5
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-white/40
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-white/40
              [&::-webkit-scrollbar-button]:bg-transparent
              [scrollbar-width:thin]
              [scrollbar-color:rgba(255,255,255,0.4)_transparent]"
            >
              <span className="block font-konexy text-[11px] tracking-[3px] uppercase text-gray-400 mb-6">
                {searchResults.length > 0 ? `Search Results (${searchResults.length})` : 'Search Results'}
              </span>

              {searchResults.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 sm:gap-6 lg:gap-8">
                  {searchResults.map((product) => (
                    <div key={product.id} onClick={closeSearch}>
                      <ProductCard product={product} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center text-gray-400 text-xs tracking-[0.3em] uppercase py-24">
                  No matching items found
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Mobile Menu Dropdown */}
      <div 
        className={`md:hidden overflow-hidden transition-all duration-500 bg-[#0a0a0a] ${
          isMobileMenuOpen ? 'max-h-72 border-t border-white/10 mt-3' : 'max-h-0'
        }`}
      >
        <div className="flex flex-col items-center py-6 space-y-6">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`text-sm tracking-[0.2em] font-konexy transition-colors relative ${
                  isActive ? 'text-[#D4AF37]' : 'text-white'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="w-12 h-[1px] bg-white/10 my-2"></div>
          <Link
            to="/wishlist"
            onClick={() => setIsMobileMenuOpen(false)}
            className="text-sm tracking-[0.2em] font-konexy text-white hover:text-white/40 transition-colors"
          >
            WISHLIST
          </Link>
          <button
            onClick={() => { setIsMobileMenuOpen(false); handleProfileClick(); }}
            className="text-sm tracking-[0.2em] font-konexy text-white hover:text-white/40 transition-colors"
          >
            {isAuthenticated ? 'MY ACCOUNT' : 'LOG IN'}
          </button>
        </div>
      </div>
    </nav>

    {/* Auth Modal - Centered on screen */}
    {isAuthOpen && (
      <div
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={closeAuth}
      >
        <div
          className="relative w-full max-w-sm max-h-[85vh] overflow-y-auto bg-[#0a0a0a] border border-gray-900 rounded-xl shadow-2xl p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={closeAuth}
            className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          <AuthContext />
        </div>
      </div>
    )}

    <CartDrawer isOpen={isCartOpen} onClose={closeCart} />
    <ProfileDrawer isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </>
  );
};

export default Navbar;