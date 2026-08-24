import React from 'react';
import HeroBanner from '../components/HeroBanner';
import ProductGrid from '../components/TopRatedProductGrid';
import NewArrivals from '../components/NewArrivals';
import CategoryGrid from '../components/CategoryGrid';
import PromoBanner from '../components/PromoBanner';
import ReviewSection from '../components/ReviewSection';
import TrustBar from '../components/TrustBar';

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