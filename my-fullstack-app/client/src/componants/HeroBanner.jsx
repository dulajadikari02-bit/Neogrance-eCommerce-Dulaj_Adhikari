import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import defaultBanner from '../assets/neogranceecov.jpg';
import api from '../lib/api';

const HeroBanner = () => {
  const [hero, setHero] = useState(null);

  // If nothing's been set up in the admin dashboard yet, this stays null and
  // we just fall back to the original default image with no text — so the
  // homepage never looks broken before someone fills the banner in.
  useEffect(() => {
    api
      .get('/hero-banner')
      .then(({ data }) => setHero(data.heroBanner))
      .catch(() => setHero(null));
  }, []);

  const bgImage = hero?.image || defaultBanner;

  // Small entrance on first paint — background settles in from a slight
  // zoom while the content fades up a beat behind it.
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 50);
    return () => clearTimeout(t);
  }, []);

  return (
    // The banner image is a wide landscape photo. On a tall, narrow phone
    // screen, covering the full 100vh height forces the browser to stretch
    // it well past its real resolution, which is what caused the zoomed-in,
    // blurry look on mobile. Using a shorter height on small screens means
    // there's less area to stretch to cover, so it stays sharp.
    <div className="relative w-full h-[55vh] sm:h-[70vh] md:h-[100vh] overflow-hidden">
      <div
        className={`absolute inset-0 bg-cover bg-center transition-all duration-[1600ms] ease-out ${
          loaded ? 'opacity-100 scale-100' : 'opacity-0 scale-110'
        }`}
        style={{ backgroundImage: `url(${bgImage})` }}
      />

      {/*dark overlay*/}
      {/*<div className="absolute inset-0 bg-black/60 z-0"></div>*/}

      {/* Content Text , Buttons */}
      <div
        className={`relative z-10 w-full h-full flex flex-col items-center justify-center px-4 md:px-8 xl:px-16 2xl:px-24 text-center text-white pt-16 transition-all duration-[1200ms] ease-out delay-300 ${
          loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        {hero?.title && (
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">
            {hero.title}
          </h1>
        )}

        {hero?.subtitle && (
          <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-200">
            {hero.subtitle}
          </p>
        )}

        {hero?.buttonText && (
          <div className="flex justify-center gap-4">
            <Link
              to={hero.buttonLink || '/'}
              className="bg-white text-black font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-gray-200 transition"
            >
              {hero.buttonText}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default HeroBanner;
