const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── GET /api/categories ──────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const categories = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.status = 'published'
    GROUP BY c.id
    ORDER BY c.sort_order ASC, c.name ASC
  `).all();

  res.json({ success: true, data: { categories } });
});

// ─── GET /api/categories/:slug ────────────────────────────────────────────────

router.get('/:slug', (req, res) => {
  const category = db.prepare(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category_id = c.id AND p.status = 'published'
    WHERE c.slug = ?
    GROUP BY c.id
  `).get(req.params.slug);

  if (!category) {
    return res.status(404).json({ success: false, error: 'Danh mục không tồn tại.' });
  }

  res.json({ success: true, data: { category } });
});

// ─── GET /api/categories/:slug/products ──────────────────────────────────────

router.get('/:slug/products', (req, res) => {
  const category = db.prepare('SELECT * FROM categories WHERE slug = ?').get(req.params.slug);
  if (!category) {
    return res.status(404).json({ success: false, error: 'Danh mục không tồn tại.' });
  }

  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 12));
  const offset = (page - 1) * limit;
  const sort = req.query.sort || 'newest';
  const { min_price, max_price, search } = req.query;

  let whereClauses = ['p.category_id = ?', "p.status = 'published'"];
  let params = [category.id];

  if (search && search.trim()) {
    whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
    const searchTerm = `%${search.trim()}%`;
    params.push(searchTerm, searchTerm);
  }

  if (min_price) {
    whereClauses.push('p.price >= ?');
    params.push(parseInt(min_price));
  }
  if (max_price) {
    whereClauses.push('p.price <= ?');
    params.push(parseInt(max_price));
  }

  const whereSQL = 'WHERE ' + whereClauses.join(' AND ');

  let orderSQL = 'ORDER BY p.created_at DESC';
  switch (sort) {
    case 'bestseller': orderSQL = 'ORDER BY p.sold_count DESC'; break;
    case 'price_asc': orderSQL = 'ORDER BY p.price ASC'; break;
    case 'price_desc': orderSQL = 'ORDER BY p.price DESC'; break;
    case 'rating': orderSQL = 'ORDER BY p.rating DESC'; break;
  }

  const baseQuery = `FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereSQL}`;
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
      category,
      products,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      limit,
    },
  });
});

module.exports = router;
