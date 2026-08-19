import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ProductListGrid from '../componants/ProductListGrid';
import ReviewSection from '../componants/ReviewSection';
import api from '../lib/api';

export default function CategoryPage() {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [notFound, setNotFound] = useState(false);

  // Fetch all categories, then find the one whose slug matches the URL.
  useEffect(() => {
    setCategory(null);
    setNotFound(false);
    api
      .get('/categories')
      .then(({ data }) => {
        const match = data.categories.find((c) => c.slug === slug);
        if (match) setCategory(match);
        else setNotFound(true);
      })
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-gray-400 tracking-widest uppercase text-sm">Category not found</p>
        <Link to="/" className="text-white underline underline-offset-4">Back to Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="flex flex-col items-center justify-center text-center px-4 py-16">
        <h1 className="font-konexy text-2xl lg:text-xl text-white tracking-[4px] uppercase mb-4">
          {category ? category.name : ' '}
        </h1>
      </div>

      <ProductListGrid category={slug} />

      <ReviewSection />
    </div>
  );
}
