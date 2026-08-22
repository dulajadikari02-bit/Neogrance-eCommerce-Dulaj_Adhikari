import React, { useEffect, useState } from 'react';
import defaultBanner from '../assets/neogranceecov.jpg';
import logo from '../assets/logo23.png';
import api from '../lib/api';

const HeroBanner = () => {
  const [hero, setHero] = useState(null);

  // If nothing's been set up in the admin dashboard yet, this stays null and
  // we just fall back to the original default image — so the homepage never
  // looks broken before someone fills the banner in.
  useEffect(() => {
    api
      .get('/hero-banner')
      .then(({ data }) => setHero(data.heroBanner))
      .catch(() => setHero(null));
  }, []);

  const bgImage = hero?.image || defaultBanner;

  // Small entrance on first paint — background settles in from a slight
  // zoom while the logo fades up a beat behind it.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className="relative w-full h-[100vh] overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-[1600ms] ease-out ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
        }`}
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/* Just the brand mark over the image — no title/subtitle/button text. */}
      <div
        className={`relative z-10 w-full h-full flex items-center justify-center transition-all duration-[1200ms] ease-out delay-300 ${
          loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <img src={logo} alt="Neogrance" className="w-40 sm:w-56 md:w-64 h-auto object-contain drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]" />
      </div>
    </div>
  );
};

export default HeroBanner;
