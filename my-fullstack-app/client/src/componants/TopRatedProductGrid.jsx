import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ProductCard from './ProductCard';
import api from '../lib/api';

export default function ProductGrid({ excludeId } = {}) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/products/top-rated', { params: { limit: 12 } })
      .then(({ data }) => {
        if (cancelled) return;
        setProducts(data.products.filter((p) => String(p.id) !== String(excludeId)));
      })
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [excludeId]);

  // State/refs used to watch the title and each card separately for scroll animation.
  const [isTitleVisible, setIsTitleVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set()); // indexes of cards that have appeared

  const sectionRef = useRef(null);
  const cardsRef = useRef([]); // holds a ref for every card element
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
    // 1. Observer for the title (fades/slides it in as it scrolls into view)
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

    // 2. Observer for each card (reveals them one by one as they slide into view)
    const cardObserver = new IntersectionObserver(
      (entries) => {
        setVisibleCards((prev) => {
          const newVisibleSet = new Set(prev);
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              // Grab the index of the card that entered the screen and mark it visible
              const index = Number(entry.target.dataset.index);
              newVisibleSet.add(index);
              cardObserver.unobserve(entry.target);
            }
          });
          return newVisibleSet;
        });
      },
      { threshold: 0.15 } // start the animation once 15% of the card is visible
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

  // Slides the row over by exactly one card (+ the gap between cards) instead
  // of an arbitrary distance, so each arrow click moves one product at a time.
  const scrollByCard = (direction) => {
    const container = scrollRef.current;
    const firstCard = cardsRef.current[0];
    if (!container || !firstCard) return;
    const gap = parseFloat(getComputedStyle(container).columnGap || '0');
    const cardWidth = firstCard.getBoundingClientRect().width + gap;
    container.scrollBy({ left: direction * cardWidth, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="w-full py-24 text-center text-xs tracking-[0.3em] uppercase text-gray-400">
        Loading Fragrance Collection...
      </div>
    );
  }

  return (
    <section ref={sectionRef} className="bg- py-16 px-4 md:px-8 xl:px-16 2xl:px-24 w-full overflow-">
      <div className="w-full">

        {/* Title Animation */}
        <div className={`text-center transform transition-all duration-1000 ease-out flex flex-col items-center ${
          isTitleVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
        }`}>
          <h1 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
            TOP RATED
          </h1>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative">
          {isOverflowing && (
            <button
              onClick={() => scrollByCard(-1)}
              aria-label="Scroll left"
              className="hidden sm:flex absolute left-1 top-1/2 -translate-y-1/2 z-20 items-center justify-center text-white/40 hover:text-white transition-colors duration-300"
            >
              <ChevronLeft size={32} strokeWidth={1.5} />
            </button>
          )}

          <div ref={scrollRef} className={`
            flex overflow-x-auto overflow-y-hidden gap-4 sm:gap-6 lg:gap-8 py-8 px-2
            snap-x snap-mandatory scroll-smooth
            ${!isOverflowing ? 'justify-center' : ''}
            [&::-webkit-scrollbar]:hidden [scrollbar-width:none]
          `}>
            {products.map((product, index) => (
              <div
                key={product.id}
                // Give the card a ref and a data attribute so the observer above can track it
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
                  badge="Top Rated"
                />
              </div>
            ))}
          </div>

          {isOverflowing && (
            <button
              onClick={() => scrollByCard(1)}
              aria-label="Scroll right"
              className="hidden sm:flex absolute right-1 top-1/2 -translate-y-1/2 z-20 items-center justify-center text-white/40 hover:text-white transition-colors duration-300"
            >
              <ChevronRight size={32} strokeWidth={1.5} />
            </button>
          )}
        </div>

      </div>
    </section>
  );
}