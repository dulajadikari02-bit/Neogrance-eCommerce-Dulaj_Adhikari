import React, { useState, useEffect, useRef } from 'react';
import ProductCard from './ProductCard';
import api from '../lib/api';

export default function NewArrivals() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/products/new-arrivals', { params: { limit: 8 } })
      .then(({ data }) => !cancelled && setProducts(data.products))
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const [isTitleVisible, setIsTitleVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());

  const sectionRef = useRef(null);
  const cardsRef = useRef([]);
  const scrollRef = useRef(null);

  // Centers the row instead of leaving it flush left when there are few enough
  // products that the row doesn't actually need to scroll. Measured (not a plain
  // `justify-center`) because centering a flexbox that *does* overflow can make
  // the start of the content unreachable by scroll in some browsers — this only
  // centers when nothing would be cut off.
  const [isOverflowing, setIsOverflowing] = useState(false);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const checkOverflow = () => setIsOverflowing(el.scrollWidth > el.clientWidth + 1);
    checkOverflow();
    const observer = new ResizeObserver(checkOverflow);
    observer.observe(el);
    return () => observer.disconnect();
  }, [products]);

  useEffect(() => {
    // 1. Title Observer
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

    // 2. Individual Cards Observer
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
  }, [loading]);

  const handleQuickView = (product) => {
    console.log("Quick view clicked for:", product.name);
  };

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-xs tracking-[0.3em] uppercase text-gray-400">
        Loading New Arrivals...
      </div>
    );
  }

  return (
    <section ref={sectionRef} className="py-12 px-4 md:px-8 xl:px-16 2xl:px-24 w-full overflow-">
      <div className="w-full">
        
        {/* Title Animation */}
        <div className={`text-center transform transition-all duration-1000 ease-out flex flex-col items-center ${
          isTitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          
          <h2 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
            NEW ARRIVALS
          </h2>
        </div>

        {/* Horizontal Scroll Container */}
        <div ref={scrollRef} className={`
          flex overflow-x-auto overflow-y-hidden gap-4 sm:gap-6 lg:gap-8 py-8 px-2
          snap-x snap-mandatory scroll-smooth
          ${!isOverflowing ? 'justify-center' : ''}
           [&::-webkit-scrollbar]:h-1.5
        [&::-webkit-scrollbar-track]:bg-transparent 
        [&::-webkit-scrollbar-thumb]:bg-white/40 
        [&::-webkit-scrollbar-thumb]:rounded-full
        
        hover:[&::-webkit-scrollbar-thumb]:bg-white/40
        [&::-webkit-scrollbar-button]:bg-transparent
        [scrollbar-width:thin] 
        [scrollbar-color:rgba(255,255,255,0.4)_transparent]
        `}>
          {products.map((product, index) => (
            <div 
              key={product.id}
              ref={(el) => (cardsRef.current[index] = el)}
              data-index={index}
              className={`
                flex-none w-[75%] sm:w-[45%] md:w-[32%] lg:w-[23%] xl:w-[19%] 2xl:w-[15%] snap-start
                transform transition-all duration-700 ease-out
                ${visibleCards.has(index) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}
              `}
            >
              <ProductCard
                product={product} 
                onQuickView={handleQuickView} 
                badge="New"
              />
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}