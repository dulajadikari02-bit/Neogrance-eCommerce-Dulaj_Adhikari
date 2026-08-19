export const mapProduct = (p) => ({
  id: p.id,
  name: p.name,
  slug: p.slug,
  description: p.description,
  topNotes: p.top_notes,
  heartNotes: p.heart_notes,
  baseNotes: p.base_notes,
  price: Number(p.price),
  stock: p.stock,
  lowStockThreshold: p.low_stock_threshold,
  isLowStock: p.stock > 0 && p.stock <= p.low_stock_threshold,
  isSoldOut: p.stock <= 0,
  category: p.category_name || null,
  categoryId: p.category_id,
  gender: p.gender,
  image: p.image_url,
  hoverImage: p.hover_image_url,
  image3: p.image3_url,
  sku: p.sku,
  viewCount: p.view_count,
  soldCount: p.sold_count,
  isActive: !!p.is_active,
  createdAt: p.created_at,
  // Bottle size / availability are purchase info customers need — not sensitive like cost_price.
  bottleMl: p.bottle_ml,
  fullBottleAvailable: !!p.full_bottle_available,
  ...(p.avg_rating !== undefined && {
    avgRating: p.avg_rating ? Number(Number(p.avg_rating).toFixed(1)) : 0,
    reviewCount: p.review_count || 0,
  }),
});

// Admin-only — adds the one genuinely sensitive field (margin data) that must never reach public routes.
export const mapAdminProduct = (p) => ({
  ...mapProduct(p),
  costPrice: p.cost_price != null ? Number(p.cost_price) : null,
});

// Base query used everywhere products are fetched. It joins in the category name
// and calculates each product's average star rating and review count on the fly,
// counting only reviews that an admin has approved.
export const PRODUCT_BASE_SELECT = `
  SELECT p.*, c.name AS category_name,
    (SELECT AVG(r.rating) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS avg_rating,
    (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
`;
