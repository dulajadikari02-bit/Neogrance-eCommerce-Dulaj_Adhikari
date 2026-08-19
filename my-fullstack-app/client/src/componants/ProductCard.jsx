import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Eye, Heart } from 'lucide-react';
import { useWishlist } from '../context/WishlistContext';

export default function ProductCard({ product, onQuickView, badge }) {
  const [isHovered, setIsHovered] = useState(false);
  const { toggleWishlist, isInWishlist } = useWishlist();
  const wished = isInWishlist(product.id);

  const handleWishlistClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group relative flex flex-col bg-black rounded-xl border border-white/10 hover:border-white/40 transition-all duration-500 hover:shadow-[0_0_30px_rgba(212,175,55,0.15)] hover:-translate-y-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Product Image Container */}
      <div className="relative w-full rounded-t-xl h-72 sm:h-80 bg-[#111] overflow-hidden">

        {badge && (
          <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md rounded-md border-white/40 text-white/40 font-konexy text-[9px] shadow-[0_0_30px_rgba(212,175,55,0.15)] tracking-[3px] px-3 py-1.5 z-20 uppercase">
            {badge}
          </div>
        )}

        {/* Wishlist Toggle */}
        <button
          onClick={handleWishlistClick}
          className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/60 backdrop-blur-md hover:bg-black/80 transition-colors"
        >
          <Heart
            size={16}
            className={wished ? 'fill-white text-white' : 'text-white/70'}
          />
        </button>

        <img
          src={isHovered && product.hoverImage ? product.hoverImage : product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-110 opacity-90 group-hover:opacity-100"
        />

        {/* Quick View Button - Premium Dark Style */}
        <div className="absolute bottom-4 left-0 right-0 px-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
          {/*<button 
            onClick={() => onQuickView(product)}
            className="flex-1 bg-black/70 backdrop-blur-md border border-[#D4AF37]/50 text-[#D4AF37] py-2.5 px-3 text-[10px] uppercase tracking-[0.2em] font-semibold hover:bg-[#D4AF37] hover:text-black transition-all duration-300 flex items-center justify-center gap-1.5 cursor-pointer rounded-sm"
          >
            <Eye size={14} /> View
          </button>*/}
        </div>
      </div>

      {/* Product Details - Adjusted Colors for Black BG */}
      <div className="p-5 flex flex-col flex-grow text-center bg-gradient-to-t from-[#050505] to-black rounded-b-xl z-10">
        {/* Brand / Category */}
        {/*<span className="text-[10px] uppercase tracking-[0.25em] text-[#D4AF37]/70 mb-1.5 font-medium">
          {product.category || 'Luxury Fragrance'}
        </span>*/}

        {/* Product Name */}
        <h3 className="font-medium text-sm md:text-base font-bold text-gray-200 tracking-wide mb-2 line-clamp-1 group-hover:text-white transition-colors">
          {product.name}
        </h3>

        {/* Price */}
        <div className="mt-auto pt-2">
          <span className="text-sm font-medium text-white/40 tracking-wider">
            Rs. {product.price?.toLocaleString()}
          </span>
        </div>
      </div>
    </Link>
  );
}