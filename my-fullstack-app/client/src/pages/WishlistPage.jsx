import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Heart } from 'lucide-react';
import ProductCard from '../componants/ProductCard';
import { useWishlist } from '../context/WishlistContext';

export default function WishlistPage() {
  const { wishlistItems } = useWishlist();

  return (
    <div className="min-h-screen  pt-2 pb-24 w-full text-white flex flex-col items-center">
      
      {/* Container */}
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24 flex flex-col items-center">

        {/* ================= BREADCRUMB ================= */}
        <div className="flex justify-center items-center text-[10px] sm:text-xs tracking-[2px] text-gray-500 uppercase font-medium mb-12">
          <span className="hover:text-white cursor-pointer transition-colors">Home</span>
          <ChevronRight size={14} className="mx-2" />
          <span className="hover:text-white cursor-pointer transition-colors">Account</span>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-white">Wishlist</span>
        </div>

        {/* ================= HEADER ================= */}
        <h1 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
          Your Wishlist
        </h1>
        <p className="text-gray-400 text-xs sm:text-sm font-light tracking-wide mb-16 text-center max-w-lg">
          Curated fragrances you desire. Keep track of your favorite minimalist scents here.
        </p>

        {/* ================= WISHLIST CONTENT ================= */}
        {wishlistItems.length === 0 ? (
          
          /* Empty state shown when the wishlist has no items */
          <div className="flex flex-col items-center justify-center py-12 sm:py-20">
            <Heart size={48} className="text-gray-800 mb-6" />
            <h3 className="text-md sm:text-lg text-white tracking-widest uppercase mb-4 font-medium">
              Wishlist is empty
            </h3>
            <p className="text-gray-500 text-xs sm:text-sm font-light mb-8 text-center">
              You haven't added any fragrances to your wishlist yet.
            </p>
            <Link to="/" className="bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase py-4 px-8 rounded-lg hover:bg-gray-200 transition-colors">
              Explore Collection
            </Link>
          </div>

        ) : (

          /* Grid layout shown when there are items in the wishlist */
          <div className="flex flex-wrap justify-center gap-6 w-full">
            {wishlistItems.map(item => (
              <div
                key={item.id}
                className="flex-none w-full sm:w-[calc((100%-24px)/2)] md:w-[calc((100%-48px)/3)] lg:w-[calc((100%-72px)/4)] xl:w-[calc((100%-96px)/5)] 2xl:w-[calc((100%-120px)/6)]"
              >
                <ProductCard product={item} badge={item.badge} />
              </div>
            ))}
          </div>

        )}
      </div>
    </div>
  );
}