import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react'; // Make sure to install lucide-react if not already
import api from '../lib/api';
import logo from '../assets/logo.png';

export default function CategoryGrid() {
  const [isTitleVisible, setIsTitleVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  const [categories, setCategories] = useState([]);

  // API Call to fetch categories
  useEffect(() => {
    api
      .get('/categories')
      .then(({ data }) => setCategories(data.categories))
      .catch(() => setCategories([]));
  }, []);

  // Intersection Observer for scroll animations — same one-shot pattern as
  // NewArrivals/ProductGrid, so the title and cards animate in once and stay put.
  useEffect(() => {
    const titleObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsTitleVisible(true);
          titleObserver.unobserve(entry.target);
        }
      },
      { threshold: 0.15 }
    );

    if (sectionRef.current) titleObserver.observe(sectionRef.current);

    const cardObserver = new IntersectionObserver(
      (entries) => {
        setVisibleCards((prev) => {
          const newVisibleSet = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const index = Number(entry.target.dataset.index);
              newVisibleSet.add(index);
              cardObserver.unobserve(entry.target);
            }
          });
          return newVisibleSet;
        });
      },
      { threshold: 0.15 }
    );

    cardsRef.current.forEach((card) => {
      if (card) cardObserver.observe(card);
    });

    return () => {
      if (sectionRef.current) titleObserver.unobserve(sectionRef.current);
      cardsRef.current.forEach((card) => {
        if (card) cardObserver.unobserve(card);
      });
    };
  }, [categories]);

  const getAnimationClass = (isVisible) => {
    if (isVisible) return 'opacity-100 translate-x-0 translate-y-0 scale-100';
    return 'opacity-0 translate-y-16 scale-95';
  };

  return (
    <section ref={sectionRef} className="py-12 px-4 md:px-8 xl:px-16 2xl:px-24 w-full overflow-hidden">

      {/* Title Section */}
      <div className="w-full mb-12">
        <div className={`text-center transform transition-all duration-1000 ease-out flex flex-col items-center ${
          isTitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <h2 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
            EXPLORE CATEGORIES
          </h2>

        </div>
      </div>

      {/* Category Grid */}
      <div className="w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 lg:gap-8">

          {/* We use .slice(0, 4) to keep the featured grid to a curated set of categories */}
          {categories.slice(0, 4).map((category, index) => {
            const isVisible = visibleCards.has(index);

            return (
              <Link
                to={category.link || `/category/${category.id}`}
                key={category.id}
                ref={(el) => (cardsRef.current[index] = el)}
                data-index={index}
                className={`group relative flex h-[420px] md:h-[480px] lg:h-[520px] items-end justify-center overflow-hidden rounded-xl bg-neutral-950 border border-white/10 hover:border-white/30 hover:shadow-[0_0_40px_rgba(255,255,255,0.08)] transition-all duration-700 ease-out transform ${getAnimationClass(isVisible)}`}
              >
                {/* Placeholder mark — category images to be added back later */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={logo}
                    alt=""
                    className="w-14 h-14 md:w-20 md:h-20 object-contain opacity-20 group-hover:opacity-30 transition-opacity duration-700"
                  />
                </div>

                {/* Text & Icon Layer */}
                <div className="relative z-10 flex w-full flex-col items-center gap-3 p-8 md:p-10 text-center">
                  <span className="font-konexy text-white text-sm md:text-md uppercase tracking-[0.2em]">
                    {category.name}
                  </span>
                  
                </div>
              </Link>
            );
          })}

        </div>
      </div>
    </section>
  );
}
