import React from 'react';
import HeroBanner from '../componants/HeroBanner';
import ProductGrid from '../componants/TopRatedProductGrid';
import NewArrivals from '../componants/NewArrivals';
import CategoryGrid from '../componants/CategoryGrid';
import PromoBanner from '../componants/PromoBanner';
import ReviewSection from '../componants/ReviewSection';
import TrustBar from '../componants/TrustBar';

const Home = () => {
  return (
    <div className="w-full">
      {/* 1. Main Hero Banner */}
      <HeroBanner />

      {/* 2. Top Rated Fragrances Grid */}
      <div id="trending">
        <ProductGrid />
      </div>

      {/* Divider between sections */}
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24">

      </div>

      {/* 3. New Arrivals Grid */}
      <div id="new-arrivals">
        <NewArrivals />
      </div>

      <div id="categorygrid">
        <CategoryGrid />
      </div>

      <div id="promobanner">
        <PromoBanner />
      </div>

      <div id="reviewsection">
        <ReviewSection />
      </div>

      <TrustBar />

    </div>
  );
};

export default Home;