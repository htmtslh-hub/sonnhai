const express = require('express');
const router = express.Router();
const db = require('../db');
const authRouter = require('./auth');
const requireAuth = authRouter.requireAuth;

// ─── GET /api/orders — list current user's orders ────────────────────────────

router.get('/', requireAuth, (req, res) => {
  const orders = db.prepare(`
    SELECT o.*,
      (SELECT COUNT(*) FROM order_items WHERE order_id = o.id) as item_count
    FROM orders o
    WHERE o.user_id = ?
    ORDER BY o.created_at DESC
  `).all(req.user.id);

  res.json({ success: true, data: { orders } });
});

// ─── GET /api/orders/guest/:email/:orderNumber — guest order lookup ───────────

router.get('/guest/:email/:orderNumber', (req, res) => {
  const { email, orderNumber } = req.params;

  const order = db.prepare(`
    SELECT * FROM orders
    WHERE customer_email = ? COLLATE NOCASE AND order_number = ?
  `).get(email.toLowerCase(), orderNumber.toUpperCase());

  if (!order) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
  }

  const items = db.prepare(`
    SELECT oi.*, p.slug as product_slug, p.emoji, p.color_class
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order.id);

  let downloadTokens = [];
  if (order.payment_status === 'paid') {
    downloadTokens = db.prepare(`
      SELECT dt.token, dt.product_id, dt.download_count, dt.max_downloads, dt.expires_at,
        p.name as product_name, p.emoji
      FROM download_tokens dt
      LEFT JOIN products p ON dt.product_id = p.id
      WHERE dt.order_id = ?
    `).all(order.id);
  }

  res.json({
    success: true,
    data: { order, items, downloadTokens },
  });
});

// ─── GET /api/orders/:orderNumber — authenticated order detail ────────────────

router.get('/:orderNumber', requireAuth, (req, res) => {
  const order = db.prepare(`
    SELECT * FROM orders
    WHERE order_number = ? AND (user_id = ? OR ? = 'admin')
  `).get(req.params.orderNumber.toUpperCase(), req.user.id, req.user.role);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
  }

  // Verify ownership (non-admin)
  if (req.user.role !== 'admin' && order.user_id !== req.user.id) {
    return res.status(403).json({ success: false, error: 'Bạn không có quyền xem đơn hàng này.' });
  }

  const items = db.prepare(`
    SELECT oi.*, p.slug as product_slug, p.emoji, p.color_class, p.file_format
    FROM order_items oi
    LEFT JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `).all(order.id);

  let downloadTokens = [];
  if (order.payment_status === 'paid') {
    downloadTokens = db.prepare(`
      SELECT dt.token, dt.product_id, dt.download_count, dt.max_downloads, dt.expires_at,
        p.name as product_name, p.emoji, p.file_format
      FROM download_tokens dt
      LEFT JOIN products p ON dt.product_id = p.id
      WHERE dt.order_id = ?
    `).all(order.id);
  }

  res.json({
    success: true,
    data: { order, items, downloadTokens },
  });
});

module.exports = router;
