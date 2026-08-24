import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, Minus, Plus, ShoppingBag, ChevronRight, Heart, Camera, X as XIcon } from 'lucide-react';
import api, { errorMessage } from '../lib/api';
import TopRatedProductGrid from '../components/TopRatedProductGrid';
import ProductCard from '../components/ProductCard';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthProvider';
import { useAuthModal } from '../context/AuthModalContext';

export default function ProductDetail() {
  const { id } = useParams();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { isAuthenticated } = useAuth();
  const { openAuth } = useAuthModal();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [selectedVariant, setSelectedVariant] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [activeIndex, setActiveIndex] = useState(0);

  const [reviewForm, setReviewForm] = useState({ rating: 5, reviewText: '' });
  const [reviewImage, setReviewImage] = useState(null);
  const [reviewStatus, setReviewStatus] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    api
      .get(`/products/${id}`)
      .then(({ data }) => {
        setProduct(data.product);
        setVariants(data.variants);
        setReviews(data.reviews);
        setRelatedProducts(data.relatedProducts || []);
        setSelectedVariant(0);
        setQuantity(1);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Build a temporary preview URL for the chosen review photo, before it's uploaded.
  const reviewImagePreview = useMemo(
    () => (reviewImage ? URL.createObjectURL(reviewImage) : null),
    [reviewImage]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 w-full text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 tracking-widest uppercase text-sm">Loading product...</p>
      </div>
    );
  }

  if (notFound || !product) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] pt-24 pb-20 w-full text-white flex flex-col items-center justify-center gap-4">
        <p className="text-gray-400 tracking-widest uppercase text-sm">Product not found</p>
        <Link to="/" className="text-white underline underline-offset-4">Back to Home</Link>
      </div>
    );
  }

  const wished = isInWishlist(product.id);

  // Main image is always first/centered. Each of the other two slots falls
  // back to the main image independently when its own upload is missing —
  // it must never fall back to whichever image the *other* slot has, or a
  // single missing slot ends up duplicating the wrong photo on both sides.
  const displayImages = [
    product.image,
    product.hoverImage || product.image,
    product.image3 || product.image,
  ];

  // "Full Bottle" isn't a row in product_variants — it's the product's own base price/id.
  // id stays null (not a string sentinel) so addToCart takes the same already-working
  // "no variant" path that products without any variants use today.
  const sizeOptions = [
    ...(product.fullBottleAvailable
      ? [{ id: null, name: 'Full Bottle', label: product.bottleMl ? `${product.bottleMl}ML` : null, price: product.price, stock: product.stock }]
      : []),
    ...variants,
  ];
  const activeVariant = sizeOptions[selectedVariant] || { price: product.price, name: null, id: null, stock: product.stock };
  // Full Bottle uses the product's own stock; a decant variant has its own separate count.
  const activeStock = activeVariant.stock ?? 0;

  const handleSelectVariant = (index) => {
    setSelectedVariant(index);
    setQuantity(1);
  };

  // Lets a finger-swipe on mobile move to the next/previous image, the same
  // way clicking a side image already does on desktop.
  const handleImageSwipe = (e, info) => {
    const threshold = 50;
    if (info.offset.x < -threshold) setActiveIndex((i) => (i + 1) % 3);
    else if (info.offset.x > threshold) setActiveIndex((i) => (i + 2) % 3);
  };

  const handleQuantity = (type) => {
    if (type === 'dec' && quantity > 1) setQuantity(quantity - 1);
    if (type === 'inc' && quantity < activeStock) setQuantity(quantity + 1);
  };

  // Decide how each of the 3 images should look: centered (active), or
  // pushed slightly left/right (inactive), to create the 3D carousel effect.
  const getCarouselStyle = (index) => {
    if (index === activeIndex) {
      return "translate-x-0 scale-100 z-30 opacity-100 brightness-100 shadow-[0_0_40px_rgba(255,255,255,0.1)]";
    } else if (index === (activeIndex + 1) % 3) {
      return "translate-x-[55%] sm:translate-x-[75%] scale-[0.8] z-20 opacity-50 brightness-50 cursor-pointer hover:brightness-75 hover:opacity-80";
    } else {
      return "-translate-x-[55%] sm:-translate-x-[75%] scale-[0.8] z-20 opacity-50 brightness-50 cursor-pointer hover:brightness-75 hover:opacity-80";
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    setSubmittingReview(true);
    setReviewStatus('');
    try {
      const payload = new FormData();
      payload.append('rating', reviewForm.rating);
      payload.append('reviewText', reviewForm.reviewText);
      if (reviewImage) payload.append('reviewImage', reviewImage);

      const { data } = await api.post(`/products/${product.id}/reviews`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReviewStatus(data.message);
      setReviewForm({ rating: 5, reviewText: '' });
      setReviewImage(null);
    } catch (err) {
      setReviewStatus(errorMessage(err));
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="min-h-screen pt-2 pb-24 w-full text-white flex flex-col items-center overflow-x-hidden">

      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center">

        {/* ================= BREADCRUMB ================= */}
        <div className="flex justify-center items-center text-[9px] sm:text-[11px] tracking-[2px] text-gray-500 uppercase font-medium mb-12">
          <Link to="/" className="hover:text-white cursor-pointer transition-colors">Home</Link>
          <ChevronRight size={14} className="mx-2" />
          <span className="hover:text-white cursor-pointer transition-colors">{product.category || 'Fragrances'}</span>
          <ChevronRight size={14} className="mx-2" />
          <span className="text-white">{product.name}</span>
        </div>

        {/* ================= 3D CAROUSEL IMAGE GALLERY ================= */}
        <motion.div
          className="relative w-full max-w-2xl h-[350px] sm:h-[450px] md:h-[500px] flex justify-center items-center mb-16 touch-pan-y"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={handleImageSwipe}
        >
          {displayImages.map((img, index) => (
            <div
              key={index}
              onClick={() => setActiveIndex(index)}
              className={`absolute w-48 sm:w-64 md:w-80 aspect-[4/5] bg-[#111] rounded-xl overflow-hidden border border-white/10 transition-all duration-700 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${getCarouselStyle(index)}`}
            >
              <img
                src={img}
                alt={`${product.name} ${index + 1}`}
                loading="lazy"
                className="w-full h-full object-cover object-center pointer-events-none"
              />
            </div>
          ))}
        </motion.div>

        {/* ================= PRODUCT DETAILS (CENTERED) ================= */}
        <div className="w-full flex flex-col items-center text-center">

          <span className="text-white/40 font-konexy text-[10px] tracking-[4px] uppercase mb-4">
            {product.category || 'Luxury Collection'}
          </span>

          <h1 className="font-konexy text-3xl sm:text-4xl md:text-5xl text-white tracking-[4px] uppercase mb-5 drop-shadow-md">
            {product.name}
          </h1>

          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < Math.round(product.avgRating || 0) ? 'fill-white/80 text-white/80' : 'text-white/20'}
                />
              ))}
            </div>
            <span className="text-white/40 text-xs tracking-widest uppercase mt-0.5">
              ({product.reviewCount || 0} Reviews)
            </span>
          </div>

          <div className="mb-8">
            <span className="text-2xl sm:text-3xl font-light tracking-widest text-white block">
              Rs. {Number(activeVariant.price).toLocaleString()}
            </span>
            {product.bottleMl && (
              <span className="block text-white/40 text-[11px] tracking-[3px] uppercase mt-2">
                Full Bottle Size — {product.bottleMl}ML
              </span>
            )}
          </div>

          {activeStock > 0 && activeStock <= (product.lowStockThreshold ?? 5) && (
            <p className="text-amber-500 text-[11px] tracking-widest uppercase mb-6">
              Only {activeStock} left in stock — order soon
            </p>
          )}
          {activeStock <= 0 && (
            <p className="text-red-500 text-[11px] tracking-widest uppercase mb-6">Currently sold out</p>
          )}

          <p className="text-gray-400 text-sm md:text-base leading-relaxed mb-10 font-light max-w-2xl mx-auto">
            {product.description || `${product.name} — a signature fragrance crafted for those who speak volumes without saying a word.`}
          </p>

          <div className="w-full max-w-md h-[1px] bg-white/10 mb-10"></div>

          {/* Option Selector */}
          {sizeOptions.length > 1 && (
            <div className="w-full max-w-2xl mb-12">
              <span className="block font-konexy text-[11px] tracking-[3px] uppercase text-gray-300 mb-6">
                Select Size
              </span>

              <div className="flex flex-wrap justify-center gap-4">
                {sizeOptions.map((variant, index) => {
                  const soldOut = (variant.stock ?? 0) <= 0;
                  return (
                    <button
                      key={variant.id ?? 'full-bottle'}
                      type="button"
                      disabled={soldOut}
                      onClick={() => handleSelectVariant(index)}
                      className={`relative flex flex-col items-center justify-center py-5 px-3 rounded-xl border transition-all duration-300 bg-black w-full sm:flex-1 sm:basis-0 sm:min-w-[160px] sm:max-w-[220px]
                        ${soldOut
                          ? 'border-white/5 opacity-40 cursor-not-allowed'
                          : selectedVariant === index
                          ? 'border-white shadow-[0_0_20px_rgba(255,255,255,0.08)] scale-[1.02]'
                          : 'border-white/10 hover:border-white/40 hover:-translate-y-1'}`}
                    >
                      <span className={`text-xs uppercase tracking-widest font-medium mb-1.5 transition-colors ${selectedVariant === index && !soldOut ? 'text-white' : 'text-gray-400'}`}>
                        {variant.name}
                      </span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                        {soldOut ? 'Sold Out' : variant.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity and Add to Cart */}
          <div className="flex flex-col sm:flex-row justify-center items-center gap-3 sm:gap-4 w-full max-w-lg mb-12 sm:mb-16">
            <div className="flex items-center justify-between border border-white/10 hover:border-white/40 transition-colors bg-black rounded-lg px-4 h-12 sm:h-14 w-full sm:w-36 shrink-0">
              <button onClick={() => handleQuantity('dec')} className="text-white hover:text-white transition-colors p-2">
                <Minus size={16} />
              </button>
              <span className="text-white text-sm font-medium">{quantity}</span>
              <button onClick={() => handleQuantity('inc')} className="text-white hover:text-white transition-colors p-2">
                <Plus size={16} />
              </button>
            </div>

            <button
              disabled={activeStock <= 0 || quantity > activeStock}
              onClick={() => addToCart(product, activeVariant, quantity)}
              className="h-12 sm:h-14 w-full sm:flex-1 shrink-0 bg-white text-black font-konexy text-[11px] tracking-[3px] uppercase rounded-lg flex items-center justify-center gap-2.5 sm:gap-3 hover:bg-gray-200 hover:shadow-[0_0_30px_rgba(255,255,255,0.15)] transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ShoppingBag size={16} className="sm:hidden" />
              <ShoppingBag size={18} className="hidden sm:block" />
              {activeStock <= 0 ? 'Sold Out' : 'Add To Cart'}
            </button>

            <button
              onClick={() => toggleWishlist(product)}
              aria-label="Toggle Wishlist"
              className="h-12 w-12 sm:h-14 sm:w-14 shrink-0 flex items-center justify-center border border-white/10 hover:border-white/40 bg-black rounded-lg transition-colors"
            >
              <Heart size={18} className={wished ? 'fill-white text-white' : 'text-white/40'} />
            </button>
          </div>

          {/* Scent Notes */}
          {(product.topNotes || product.heartNotes || product.baseNotes) && (
            <div className="w-full max-w-2xl flex flex-wrap justify-center gap-x-8 gap-y-8 border-t border-white/10 pt-10 mb-20">
              {[
                { label: 'Top Notes', value: product.topNotes },
                { label: 'Heart Notes', value: product.heartNotes },
                { label: 'Base Notes', value: product.baseNotes },
              ].filter((tier) => tier.value).map((tier) => (
                <div key={tier.label} className="text-center flex-1 min-w-[180px] max-w-[220px]">
                  <span className="block text-[9px] sm:text-[10px] text-white/40 uppercase tracking-[3px] mb-3">
                    {tier.label}
                  </span>
                  <div className="flex flex-wrap justify-center gap-2">
                    {tier.value.split(',').map((note) => note.trim()).filter(Boolean).map((note) => (
                      <span
                        key={note}
                        className="text-xs sm:text-sm text-white/40 font-light border border-white/10 rounded-full px-3.5 py-1.5"
                      >
                        {note}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {relatedProducts.length > 0 && (
            <div className="w-full border-t border-gray-900 pt-10 mt-16">
              <h3 className="font-konexy text-lg tracking-[3px] uppercase mb-8">You Might Also Like</h3>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 text-left">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </div>
          )}

          {/* ================= REVIEWS ================= */}
          <div className="w-full max-w-2xl border-t border-white/10 pt-10">
            <h3 className="font-konexy text-lg tracking-[3px] uppercase mb-8">Customer Reviews</h3>

            {reviews.length > 0 ? (
              <div className="flex flex-wrap justify-center gap-4 mb-10 text-left">
                {reviews.map((r) => (
                  <div key={r.id} className="flex-none w-full sm:w-[calc((100%-16px)/2)] p-5 bg-black rounded-xl border border-white/10">
                    <div className="flex items-center gap-1 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} className={i < r.rating ? 'fill-white/70 text-white/70' : 'text-white/20'} />
                      ))}
                    </div>
                    <p className="text-white/40 text-sm font-light mb-3">"{r.review_text}"</p>
                    {r.image_url && (
                      <img
                        src={r.image_url}
                        alt={`${r.reviewer_name}'s photo`}
                        loading="lazy"
                        className="w-20 h-24 object-cover rounded-lg border border-white/10 mb-3"
                      />
                    )}
                    <span className="text-white/50 text-[10px] uppercase tracking-widest">{r.reviewer_name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/40 text-xs tracking-widest uppercase mb-10">No reviews yet — be the first.</p>
            )}

            <div className="p-6 bg-black rounded-xl border border-white/10 text-left">
              <h4 className="font-konexy text-[11px] tracking-[3px] uppercase text-white/40 mb-4">Write a Review</h4>
              {isAuthenticated ? (
                <form onSubmit={handleSubmitReview} className="flex flex-col gap-3">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        type="button"
                        key={n}
                        onClick={() => setReviewForm((prev) => ({ ...prev, rating: n }))}
                      >
                        <Star size={18} className={n <= reviewForm.rating ? 'fill-white text-white' : 'text-white/20'} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    required
                    minLength={5}
                    rows={3}
                    placeholder="Share your experience with this fragrance..."
                    value={reviewForm.reviewText}
                    onChange={(e) => setReviewForm((prev) => ({ ...prev, reviewText: e.target.value }))}
                    className="w-full bg-[#111] border border-white/10 rounded-lg py-3 px-4 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-white/40 transition-colors resize-none"
                  />

                  {reviewImagePreview ? (
                    <div className="relative inline-block">
                      <img
                        src={reviewImagePreview}
                        alt="Your upload preview"
                        className="w-20 h-20 object-cover rounded-lg border border-white/10"
                      />
                      <button
                        type="button"
                        onClick={() => setReviewImage(null)}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-black border border-gray-700 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                      >
                        <XIcon size={11} />
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-[11px] text-gray-400 hover:text-white border border-white/10 hover:border-white/40 rounded-lg px-3 py-2.5 cursor-pointer transition-colors w-fit">
                      <Camera size={14} />
                      Add a photo (optional)
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => setReviewImage(e.target.files[0] || null)}
                      />
                    </label>
                  )}

                  {reviewStatus && <p className="text-[11px] text-gray-400">{reviewStatus}</p>}
                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="self-start bg-white text-black font-konexy text-[10px] tracking-[3px] uppercase py-2.5 px-6 rounded-lg hover:bg-gray-200 transition-all disabled:opacity-50"
                  >
                    {submittingReview ? 'Submitting...' : 'Submit Review'}
                  </button>
                </form>
              ) : (
                <p className="text-xs text-gray-500">
                  <button onClick={openAuth} className="text-white underline underline-offset-4">Log in</button> to write a review.
                </p>
              )}
            </div>
          </div>

          {/* ================= YOU MIGHT ALSO LIKE ================= */}
          

        </div>
      </div>

      {/*<div className="w-full mt-16">
        <TopRatedProductGrid excludeId={product.id} />
      </div>*/}
    </div>
  );
}
