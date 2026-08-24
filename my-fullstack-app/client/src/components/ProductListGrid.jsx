import React, { useEffect, useState } from 'react';
import ProductCard from './ProductCard';
import api from '../lib/api';

// Vertical wrapping grid (page scrolls down) — used by category pages like Mens/Womens/Unisex/CategoryPage.
export default function ProductListGrid({ gender, category }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .get('/products', { params: { gender, category, limit: 60 } })
      .then(({ data }) => !cancelled && setProducts(data.products))
      .catch(() => !cancelled && setProducts([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [gender, category]);

  return (
    <section className="w-full px-4 md:px-8 xl:px-16 2xl:px-24 pb-24">
      <div className="w-full">
        {loading ? (
          <div className="text-center text-gray-400 text-xs tracking-[0.3em] uppercase py-24">
            Loading products...
          </div>
        ) : products.length === 0 ? (
          <div className="text-center text-gray-400 text-xs tracking-[0.3em] uppercase py-24">
            No products available yet
          </div>
        ) : (
          <div className="flex flex-wrap justify-center gap-4 sm:gap-6 lg:gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="flex-none w-[calc((100%-16px)/2)] sm:w-[calc((100%-24px)/2)] md:w-[calc((100%-48px)/3)] lg:w-[calc((100%-96px)/4)] xl:w-[calc((100%-128px)/5)] 2xl:w-[calc((100%-160px)/6)]"
              >
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
