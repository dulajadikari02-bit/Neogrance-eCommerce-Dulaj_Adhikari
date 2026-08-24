import React from 'react';
import ProductListGrid from '../components/ProductListGrid';
import ReviewSection from '../components/ReviewSection';

export default function Unisex() {
  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center justify-center text-center px-4 py-8">
        <h1 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
          Unisex Collection
        </h1>

      </div>

      <ProductListGrid gender="unisex" />
      <ReviewSection />
    </div>
  );
}
