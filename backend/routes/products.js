const express = require('express');
const router = express.Router();
const db = require('../db');
const authRouter = require('./auth');
const requireAuth = authRouter.requireAuth;

// ─── GET /api/products ────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const offset = (page - 1) * limit;

  const { category, sort = 'newest', search, min_price, max_price, status = 'published' } = req.query;

  let whereClauses = [];
  let params = [];

  // Status filter
  if (status === 'all') {
    // no filter
  } else {
    whereClauses.push('p.status = ?');
    params.push(status);
  }

  // Category filter by slug
  if (category) {
    whereClauses.push('c.slug = ?');
    params.push(category);
  }

  // Search
  if (search && search.trim()) {
    whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  // Price range
  if (min_price) {
    whereClauses.push('p.price >= ?');
    params.push(parseInt(min_price));
  }
  if (max_price) {
    whereClauses.push('p.price <= ?');
    params.push(parseInt(max_price));
  }

  const whereSQL = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // Sort
  let orderSQL = 'ORDER BY p.created_at DESC';
  switch (sort) {
    case 'bestseller': orderSQL = 'ORDER BY p.sold_count DESC'; break;
    case 'price_asc': orderSQL = 'ORDER BY p.price ASC'; break;
    case 'price_desc': orderSQL = 'ORDER BY p.price DESC'; break;
    case 'rating': orderSQL = 'ORDER BY p.rating DESC'; break;
    case 'newest':
    default: orderSQL = 'ORDER BY p.created_at DESC'; break;
  }

  const baseQuery = `
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ${whereSQL}
  `;

  const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params).count;

  const products = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
    ${baseQuery}
    ${orderSQL}
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    success: true,
    data: {
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

// ─── GET /api/products/featured ───────────────────────────────────────────────

router.get('/featured', (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit) || 8);
  const products = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.is_featured = 1 AND p.status = 'published'
    ORDER BY p.sold_count DESC
    LIMIT ?
  `).all(limit);

  res.json({ success: true, data: { products } });
});

// ─── GET /api/products/bestsellers ────────────────────────────────────────────

router.get('/bestsellers', (req, res) => {
  const limit = Math.min(20, parseInt(req.query.limit) || 6);
  const products = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    ORDER BY p.sold_count DESC
    LIMIT ?
  `).all(limit);

  res.json({ success: true, data: { products } });
});

// ─── GET /api/products/:slug ──────────────────────────────────────────────────

router.get('/:slug', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug, c.icon as category_icon
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.slug = ? AND p.status = 'published'
  `).get(req.params.slug);

  if (!product) {
    return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' });
  }

  // Get reviews (limit 10)
  const reviews = db.prepare(`
    SELECT r.*, u.name as user_name, u.avatar as user_avatar
    FROM reviews r
    LEFT JOIN users u ON r.user_id = u.id
    WHERE r.product_id = ?
    ORDER BY r.helpful_count DESC, r.created_at DESC
    LIMIT 10
  `).all(product.id);

  // Get related products (same category, exclude current)
  const related = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.category_id = ? AND p.id != ? AND p.status = 'published'
    ORDER BY p.sold_count DESC
    LIMIT 4
  `).all(product.category_id, product.id);

  res.json({
    success: true,
    data: { product, reviews, related },
  });
});

// ─── POST /api/products/:id/reviews ──────────────────────────────────────────

router.post('/:id/reviews', requireAuth, (req, res) => {
  const productId = parseInt(req.params.id);
  const { rating, content } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Điểm đánh giá phải từ 1 đến 5.' });
  }

  const product = db.prepare('SELECT id FROM products WHERE id = ? AND status = ?')
    .get(productId, 'published');
  if (!product) {
    return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' });
  }

  // Check if user already reviewed
  const existingReview = db.prepare('SELECT id FROM reviews WHERE product_id = ? AND user_id = ?')
    .get(productId, req.user.id);
  if (existingReview) {
    return res.status(409).json({ success: false, error: 'Bạn đã đánh giá sản phẩm này rồi.' });
  }

  // Check if user purchased this product
  const hasPurchased = db.prepare(`
    SELECT oi.id FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.user_id = ? AND oi.product_id = ? AND o.payment_status = 'paid'
  `).get(req.user.id, productId);

  const user = db.prepare('SELECT name FROM users WHERE id = ?').get(req.user.id);

  const result = db.prepare(`
    INSERT INTO reviews (product_id, user_id, reviewer_name, rating, content, is_verified)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(productId, req.user.id, user.name, parseInt(rating), content || '', hasPurchased ? 1 : 0);

  // Update product rating and review_count
  const stats = db.prepare(`
    SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?
  `).get(productId);

  db.prepare(`
    UPDATE products SET rating = ?, review_count = ? WHERE id = ?
  `).run(Math.round(stats.avg_rating * 10) / 10, stats.count, productId);

  const review = db.prepare('SELECT * FROM reviews WHERE id = ?').get(result.lastInsertRowid);

  res.status(201).json({ success: true, data: { review } });
});

module.exports = router;
