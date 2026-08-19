import React, { useEffect, useState } from 'react';
import Banner from '../assets/neogranceecov.jpg';

const HeroBanner = () => {
  //photo link
  const bgImage = Banner;

  // Small entrance on first paint — background settles in from a slight
  // zoom while the content fades up a beat behind it.
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

      {/*dark overlay*/}
      {/*<div className="absolute inset-0 bg-black/60 z-0"></div>*/}

      {/* Content Text , Buttons */}
      <div
        className={`relative z-10 w-full h-full flex flex-col items-center justify-center px-4 md:px-8 xl:px-16 2xl:px-24 text-center text-white pt-16 transition-all duration-[1200ms] ease-out delay-300 ${
          loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
        }`}
      >
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 leading-tight">

        </h1>

        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-8 text-gray-200">

        </p>

        {/*<div className="flex justify-center gap-4">
          <a
            href="#explore"
            className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow-lg hover:bg-blue-700 transition"
          >
            Explore Now
          </a>
          <a
            href="#learn"
            className="border border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white hover:text-gray-900 transition"
          >
            Learn More
          </a>
        </div>*/}

      </div>
    </div>
  );
};

export default HeroBanner;
