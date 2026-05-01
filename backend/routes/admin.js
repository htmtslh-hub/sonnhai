const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const authRouter = require('./auth');
const requireAdmin = authRouter.requireAdmin;

// All admin routes require admin role
router.use(requireAdmin);

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────

router.get('/stats', (req, res) => {
  const totalRevenue = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as val FROM orders WHERE payment_status = 'paid'
  `).get().val;

  const totalOrders = db.prepare('SELECT COUNT(*) as val FROM orders').get().val;

  const totalCustomers = db.prepare(`SELECT COUNT(*) as val FROM users WHERE role = 'customer'`).get().val;

  const totalProducts = db.prepare(`SELECT COUNT(*) as val FROM products WHERE status = 'published'`).get().val;

  const recentOrders = db.prepare(`
    SELECT o.id, o.order_number, o.customer_name, o.customer_email,
           o.total, o.payment_status, o.status, o.created_at,
           (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    ORDER BY o.created_at DESC
    LIMIT 10
  `).all();

  const topProducts = db.prepare(`
    SELECT p.id, p.name, p.emoji, p.price, p.sold_count, p.rating,
           c.name as category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    WHERE p.status = 'published'
    ORDER BY p.sold_count DESC
    LIMIT 5
  `).all();

  const newsletterSubscribers = db.prepare(`
    SELECT COUNT(*) as val FROM newsletter_subscribers WHERE is_active = 1
  `).get().val;

  const revenueToday = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as val FROM orders
    WHERE payment_status = 'paid' AND DATE(created_at) = DATE('now')
  `).get().val;

  const ordersToday = db.prepare(`
    SELECT COUNT(*) as val FROM orders WHERE DATE(created_at) = DATE('now')
  `).get().val;

  res.json({
    success: true,
    data: {
      totalRevenue,
      totalOrders,
      totalCustomers,
      totalProducts,
      recentOrders,
      topProducts,
      newsletterSubscribers,
      revenueToday,
      ordersToday,
    },
  });
});

// ─── PRODUCTS MANAGEMENT ──────────────────────────────────────────────────────

router.get('/products', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { status, search } = req.query;

  let whereClauses = [];
  let params = [];

  if (status && status !== 'all') {
    whereClauses.push('p.status = ?');
    params.push(status);
  } else {
    whereClauses.push("p.status != 'archived'");
  }

  if (search && search.trim()) {
    whereClauses.push('(p.name LIKE ? OR p.description LIKE ?)');
    const s = `%${search.trim()}%`;
    params.push(s, s);
  }

  const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const baseQuery = `FROM products p LEFT JOIN categories c ON p.category_id = c.id ${whereSQL}`;

  const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params).count;
  const products = db.prepare(`
    SELECT p.*, c.name as category_name, c.slug as category_slug
    ${baseQuery}
    ORDER BY p.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    success: true,
    data: { products, total, page, totalPages: Math.ceil(total / limit) },
  });
});

router.post('/products', (req, res) => {
  const {
    name, slug, description, price, original_price, category_id,
    emoji, color_class, file_format = 'PDF', file_size, page_count,
    status = 'draft', is_featured = 0,
  } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập tên sản phẩm.' });
  }
  if (!price || isNaN(price) || parseInt(price) <= 0) {
    return res.status(400).json({ success: false, error: 'Giá sản phẩm không hợp lệ.' });
  }
  if (!slug || !slug.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập slug sản phẩm.' });
  }

  const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ?').get(slug.trim());
  if (existingSlug) {
    return res.status(409).json({ success: false, error: 'Slug đã tồn tại, vui lòng dùng slug khác.' });
  }

  const result = db.prepare(`
    INSERT INTO products (name, slug, description, price, original_price, category_id,
      emoji, color_class, file_format, file_size, page_count, status, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), slug.trim(), description || '', parseInt(price),
    original_price ? parseInt(original_price) : null, category_id ? parseInt(category_id) : null,
    emoji || '📄', color_class || 'book-color-1', file_format, file_size || 'N/A',
    page_count ? parseInt(page_count) : 0, status, is_featured ? 1 : 0
  );

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: { product } });
});

router.put('/products/:id', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' });
  }

  const {
    name, slug, description, price, original_price, category_id,
    emoji, color_class, file_format, file_size, page_count, status, is_featured,
  } = req.body;

  // Check slug uniqueness if changing
  if (slug && slug !== product.slug) {
    const existingSlug = db.prepare('SELECT id FROM products WHERE slug = ? AND id != ?')
      .get(slug.trim(), product.id);
    if (existingSlug) {
      return res.status(409).json({ success: false, error: 'Slug đã tồn tại, vui lòng dùng slug khác.' });
    }
  }

  db.prepare(`
    UPDATE products SET
      name = ?, slug = ?, description = ?, price = ?, original_price = ?,
      category_id = ?, emoji = ?, color_class = ?, file_format = ?,
      file_size = ?, page_count = ?, status = ?, is_featured = ?
    WHERE id = ?
  `).run(
    name !== undefined ? name.trim() : product.name,
    slug !== undefined ? slug.trim() : product.slug,
    description !== undefined ? description : product.description,
    price !== undefined ? parseInt(price) : product.price,
    original_price !== undefined ? (original_price ? parseInt(original_price) : null) : product.original_price,
    category_id !== undefined ? (category_id ? parseInt(category_id) : null) : product.category_id,
    emoji !== undefined ? emoji : product.emoji,
    color_class !== undefined ? color_class : product.color_class,
    file_format !== undefined ? file_format : product.file_format,
    file_size !== undefined ? file_size : product.file_size,
    page_count !== undefined ? (page_count ? parseInt(page_count) : 0) : product.page_count,
    status !== undefined ? status : product.status,
    is_featured !== undefined ? (is_featured ? 1 : 0) : product.is_featured,
    product.id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(product.id);
  res.json({ success: true, data: { product: updated } });
});

router.delete('/products/:id', (req, res) => {
  const product = db.prepare('SELECT id, name FROM products WHERE id = ?').get(parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại.' });
  }

  // Soft delete
  db.prepare("UPDATE products SET status = 'archived' WHERE id = ?").run(product.id);
  res.json({ success: true, data: { message: `Sản phẩm "${product.name}" đã được lưu trữ.` } });
});

// ─── ORDERS MANAGEMENT ────────────────────────────────────────────────────────

router.get('/orders', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { status, payment_status, search } = req.query;

  let whereClauses = [];
  let params = [];

  if (status) {
    whereClauses.push('o.status = ?');
    params.push(status);
  }
  if (payment_status) {
    whereClauses.push('o.payment_status = ?');
    params.push(payment_status);
  }
  if (search && search.trim()) {
    whereClauses.push('(o.customer_email LIKE ? OR o.order_number LIKE ? OR o.customer_name LIKE ?)');
    const s = `%${search.trim()}%`;
    params.push(s, s, s);
  }

  const whereSQL = whereClauses.length ? 'WHERE ' + whereClauses.join(' AND ') : '';
  const baseQuery = `FROM orders o ${whereSQL}`;
  const total = db.prepare(`SELECT COUNT(*) as count ${baseQuery}`).get(...params).count;

  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    ${baseQuery}
    ORDER BY o.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    success: true,
    data: { orders, total, page, totalPages: Math.ceil(total / limit) },
  });
});

router.put('/orders/:id/status', (req, res) => {
  const order = db.prepare('SELECT id, order_number FROM orders WHERE id = ?').get(parseInt(req.params.id));
  if (!order) {
    return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại.' });
  }

  const { status, payment_status } = req.body;
  const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
  const validPaymentStatuses = ['pending', 'paid', 'failed', 'refunded'];

  if (status && !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Trạng thái đơn hàng không hợp lệ.' });
  }
  if (payment_status && !validPaymentStatuses.includes(payment_status)) {
    return res.status(400).json({ success: false, error: 'Trạng thái thanh toán không hợp lệ.' });
  }

  const current = db.prepare('SELECT status, payment_status FROM orders WHERE id = ?').get(order.id);
  db.prepare(`
    UPDATE orders SET status = ?, payment_status = ?, updated_at = datetime('now') WHERE id = ?
  `).run(
    status || current.status,
    payment_status || current.payment_status,
    order.id
  );

  const updated = db.prepare('SELECT * FROM orders WHERE id = ?').get(order.id);
  res.json({ success: true, data: { order: updated } });
});

router.post('/orders/:id/resend-download', (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(parseInt(req.params.id));
  if (!order) {
    return res.status(404).json({ success: false, error: 'Đơn hàng không tồn tại.' });
  }
  if (order.payment_status !== 'paid') {
    return res.status(400).json({ success: false, error: 'Chỉ gửi lại link tải cho đơn đã thanh toán.' });
  }

  // Get existing tokens or create new ones
  const existingTokens = db.prepare(`
    SELECT dt.*, p.name as product_name
    FROM download_tokens dt
    LEFT JOIN products p ON dt.product_id = p.id
    WHERE dt.order_id = ?
  `).all(order.id);

  const expireDays = parseInt(process.env.DOWNLOAD_EXPIRE_DAYS) || 30;
  const maxDownloads = parseInt(process.env.DOWNLOAD_MAX_COUNT) || 5;
  let tokens = existingTokens;

  if (existingTokens.length === 0) {
    // Regenerate tokens
    const items = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id);
    tokens = [];

    for (const item of items) {
      const tokenStr = uuidv4();
      const expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString();
      db.prepare(`
        INSERT INTO download_tokens (token, order_id, order_item_id, product_id, customer_email, max_downloads, expires_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(tokenStr, order.id, item.id, item.product_id, order.customer_email, maxDownloads, expiresAt);

      tokens.push({ token: tokenStr, product_name: item.product_name, expires_at: expiresAt });
    }
  }

  console.log(`\n📧 [ADMIN - RESEND] Email gửi tới: ${order.customer_email}`);
  console.log(`   Đơn hàng: ${order.order_number}`);
  console.log(`   Link tải: ${tokens.map(t => `/api/downloads/${t.token}`).join(', ')}\n`);

  res.json({
    success: true,
    data: {
      message: `Đã gửi lại email link tải tới ${order.customer_email}.`,
      tokens: tokens.map(t => ({
        token: t.token,
        productName: t.product_name,
        downloadUrl: `/api/downloads/${t.token}`,
      })),
    },
  });
});

// ─── CUSTOMERS MANAGEMENT ────────────────────────────────────────────────────

router.get('/customers', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;
  const { search } = req.query;

  let whereClauses = ["u.role = 'customer'"];
  let params = [];

  if (search && search.trim()) {
    whereClauses.push('(u.name LIKE ? OR u.email LIKE ?)');
    const s = `%${search.trim()}%`;
    params.push(s, s);
  }

  const whereSQL = 'WHERE ' + whereClauses.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) as count FROM users u ${whereSQL}`).get(...params).count;

  const customers = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar, u.created_at,
      COUNT(DISTINCT o.id) as total_orders,
      COALESCE(SUM(CASE WHEN o.payment_status = 'paid' THEN o.total ELSE 0 END), 0) as total_spent
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    ${whereSQL}
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    success: true,
    data: { customers, total, page, totalPages: Math.ceil(total / limit) },
  });
});

// ─── NEWSLETTER MANAGEMENT ────────────────────────────────────────────────────

router.get('/newsletter', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, parseInt(req.query.limit) || 20);
  const offset = (page - 1) * limit;

  const total = db.prepare('SELECT COUNT(*) as count FROM newsletter_subscribers').get().count;
  const subscribers = db.prepare(`
    SELECT * FROM newsletter_subscribers
    ORDER BY subscribed_at DESC
    LIMIT ? OFFSET ?
  `).all(limit, offset);

  res.json({
    success: true,
    data: { subscribers, total, page, totalPages: Math.ceil(total / limit) },
  });
});

// ─── COUPONS MANAGEMENT ──────────────────────────────────────────────────────

router.get('/coupons', (req, res) => {
  const coupons = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM coupon_usages WHERE coupon_id = c.id) as actual_usage
    FROM coupons c
    ORDER BY c.created_at DESC
  `).all();

  res.json({ success: true, data: { coupons } });
});

router.post('/coupons', (req, res) => {
  const { code, type, value, min_order = 0, max_uses, expires_at } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập mã giảm giá.' });
  }
  if (!type || !['percent', 'fixed'].includes(type)) {
    return res.status(400).json({ success: false, error: 'Loại giảm giá phải là "percent" hoặc "fixed".' });
  }
  if (!value || isNaN(value) || parseInt(value) <= 0) {
    return res.status(400).json({ success: false, error: 'Giá trị giảm giá không hợp lệ.' });
  }
  if (type === 'percent' && parseInt(value) > 100) {
    return res.status(400).json({ success: false, error: 'Phần trăm giảm không được vượt quá 100%.' });
  }

  const upperCode = code.trim().toUpperCase();
  const existing = db.prepare('SELECT id FROM coupons WHERE code = ?').get(upperCode);
  if (existing) {
    return res.status(409).json({ success: false, error: 'Mã giảm giá đã tồn tại.' });
  }

  const result = db.prepare(`
    INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    upperCode, type, parseInt(value), parseInt(min_order) || 0,
    max_uses ? parseInt(max_uses) : null,
    expires_at || null
  );

  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ success: true, data: { coupon } });
});

router.put('/coupons/:id', (req, res) => {
  const coupon = db.prepare('SELECT * FROM coupons WHERE id = ?').get(parseInt(req.params.id));
  if (!coupon) {
    return res.status(404).json({ success: false, error: 'Mã giảm giá không tồn tại.' });
  }

  const { value, min_order, max_uses, expires_at, is_active } = req.body;

  db.prepare(`
    UPDATE coupons SET
      value = ?, min_order = ?, max_uses = ?, expires_at = ?, is_active = ?
    WHERE id = ?
  `).run(
    value !== undefined ? parseInt(value) : coupon.value,
    min_order !== undefined ? parseInt(min_order) : coupon.min_order,
    max_uses !== undefined ? (max_uses ? parseInt(max_uses) : null) : coupon.max_uses,
    expires_at !== undefined ? (expires_at || null) : coupon.expires_at,
    is_active !== undefined ? (is_active ? 1 : 0) : coupon.is_active,
    coupon.id
  );

  const updated = db.prepare('SELECT * FROM coupons WHERE id = ?').get(coupon.id);
  res.json({ success: true, data: { coupon: updated } });
});

module.exports = router;
