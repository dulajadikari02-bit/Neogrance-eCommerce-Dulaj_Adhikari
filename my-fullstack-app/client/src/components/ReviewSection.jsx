import React, { useEffect, useRef, useState } from 'react';
import { Star } from 'lucide-react';
import api from '../lib/api';

export default function ReviewSection() {
  const [isTitleVisible, setIsTitleVisible] = useState(false);
  const [visibleCards, setVisibleCards] = useState(new Set());
  const sectionRef = useRef(null);
  const cardsRef = useRef([]);

  const [reviews, setReviews] = useState([]);

  useEffect(() => {
    api
      .get('/products/reviews/approved', { params: { limit: 6 } })
      .then(({ data }) =>
        setReviews(
          data.reviews.map((r) => ({
            id: r.id,
            name: r.reviewer_name,
            product: r.product_name,
            review: r.review_text,
            rating: r.rating,
          }))
        )
      )
      .catch(() => setReviews([]));
  }, []);

  // Watches the title and review cards, and marks them visible once they
  // scroll into view, so we can fade/slide them in with animation.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.target === sectionRef.current) {
            setIsTitleVisible(entry.isIntersecting);
          } else {
            const index = Number(entry.target.getAttribute('data-index'));
            if (entry.isIntersecting) {
              setVisibleCards((prev) => {
                const newSet = new Set(prev);
                newSet.add(index);
                return newSet;
              });
            }
          }
        });
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (sectionRef.current) observer.observe(sectionRef.current);
    cardsRef.current.forEach((card) => {
      if (card) observer.observe(card);
    });

    return () => observer.disconnect();
  }, [reviews]);

  const getAnimationDelay = (index) => {
    return `${index * 200}ms`; // stagger each card so they appear one after another
  };

  if (!reviews.length) return null;

  return (
    <section ref={sectionRef} className="py-24 w-full ">
      
      {/* Title Section */}
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24 mb-16">
        <div className={`text-center transform transition-all duration-1000 ease-out flex flex-col items-center 
        }`}>
          <h2 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
            CLIENT TESTIMONIALS
          </h2>
          
        </div>
      </div>

      {/* Reviews Grid */}
      <div className="w-full px-4 md:px-8 xl:px-16 2xl:px-24">
        <div className="flex flex-wrap justify-center gap-6 lg:gap-8">

          {reviews.map((review, index) => (
            <div
              key={review.id}
              ref={(el) => (cardsRef.current[index] = el)}
              data-index={index}
              className={`
                flex-none w-full md:w-[calc((100%-48px)/3)] lg:w-[calc((100%-64px)/3)] xl:w-[calc((100%-96px)/4)]
                group flex flex-col bg-black rounded-xl border border-white/10 p-8
                hover:border-white/40 transition-all duration-500 hover:-translate-y-1
                hover:shadow-[0_0_30px_rgba(255,255,255,0.05)]
                transform ease-out
                ${visibleCards.has(index) ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-16 scale-95'}
              `}
              style={{ transitionDelay: getAnimationDelay(index) }}
            >
              
              {/* Stars use white/gray instead of gold to match the site theme */}
              <div className="flex items-center gap-1 mb-6">
                {[...Array(review.rating)].map((_, i) => (
                  <Star key={i} size={14} className="fill-white/60 text-white/60 group-hover:fill-white/80 transition-colors duration-300" />
                ))}
              </div>

              {/* Review Text */}
              <p className="text-gray-400 font-light text-sm md:text-base leading-relaxed flex-grow mb-8 group-hover:text-gray-300 transition-colors duration-300">
                "{review.review}"
              </p>

              {/* Client Info */}
              <div className="mt-auto">
                <h4 className="font-konexy text-white tracking-[2px] text-sm uppercase mb-1">
                  {review.name}
                </h4>
                <span className="text-white/40 text-[10px] tracking-[1px] uppercase uppercase font-medium">
                  Verified Buyer — {review.product}
                </span>
              </div>

            </div>
          ))}

        </div>
      </div>
    </section>
  );
}