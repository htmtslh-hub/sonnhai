const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getCartIds(req) {
  const explicitId = req.headers['x-cart-id'] || req.query.cartId || (req.body && req.body.cartId);
  const cookieId = req.cookies.cart_id;
  return [...new Set([explicitId, cookieId].filter(Boolean))];
}

function setCartCookie(res, cartId) {
  res.cookie('cart_id', cartId, {
    httpOnly: true,
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    sameSite: 'lax',
  });
}

function clearCartCookie(res) {
  if (typeof res.clearCookie === 'function') {
    res.clearCookie('cart_id', { sameSite: 'lax' });
  }
}

function getOrCreateCart(req, res) {
  const cartIds = getCartIds(req);

  for (const cartId of cartIds) {
    const session = db.prepare('SELECT * FROM cart_sessions WHERE id = ?').get(cartId);
    if (session) {
      setCartCookie(res, session.id);
      return session;
    }
  }

  if (cartIds.length > 0) clearCartCookie(res);

  // Create new cart session
  const cartId = uuidv4();
  db.prepare(`
    INSERT INTO cart_sessions (id, items_json) VALUES (?, '[]')
  `).run(cartId);

  setCartCookie(res, cartId);

  return db.prepare('SELECT * FROM cart_sessions WHERE id = ?').get(cartId);
}

function parseItems(session) {
  try {
    return JSON.parse(session.items_json || '[]');
  } catch {
    return [];
  }
}

function saveItems(cartId, items) {
  db.prepare(`
    UPDATE cart_sessions SET items_json = ?, updated_at = datetime('now') WHERE id = ?
  `).run(JSON.stringify(items), cartId);
}

function enrichItems(items) {
  return items.map(item => {
    const product = db.prepare(`
      SELECT id, name, slug, price, original_price, emoji, color_class, file_format, status
      FROM products WHERE id = ?
    `).get(item.productId);

    return {
      ...item,
      product: product || null,
      subtotal: product ? product.price * item.quantity : 0,
    };
  }).filter(item => item.product && item.product.status === 'published');
}

// ─── GET /api/cart ────────────────────────────────────────────────────────────

router.get('/', (req, res) => {
  const session = getOrCreateCart(req, res);
  const items = parseItems(session);
  const enriched = enrichItems(items);

  const subtotal = enriched.reduce((sum, item) => sum + item.subtotal, 0);
  const itemCount = enriched.length;

  res.json({
    success: true,
    data: {
      cartId: session.id,
      items: enriched,
      subtotal,
      itemCount,
    },
  });
});

// ─── POST /api/cart/add ───────────────────────────────────────────────────────

router.post('/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ success: false, error: 'Vui lòng chọn sản phẩm.' });
  }

  const qty = Math.max(1, parseInt(quantity) || 1);

  const product = db.prepare("SELECT id, name, status FROM products WHERE id = ? AND status = 'published'")
    .get(parseInt(productId));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Sản phẩm không tồn tại hoặc đã ngừng bán.' });
  }

  const session = getOrCreateCart(req, res);
  const items = parseItems(session);

  const existingIndex = items.findIndex(i => i.productId === product.id);
  if (existingIndex > -1) {
    // Update quantity (digital products: max 1 per item makes sense, but allow as requested)
    items[existingIndex].quantity = qty;
    items[existingIndex].addedAt = new Date().toISOString();
  } else {
    items.push({
      productId: product.id,
      quantity: qty,
      addedAt: new Date().toISOString(),
    });
  }

  saveItems(session.id, items);
  const enriched = enrichItems(items);
  const subtotal = enriched.reduce((sum, item) => sum + item.subtotal, 0);

  res.json({
    success: true,
    data: {
      cartId: session.id,
      items: enriched,
      subtotal,
      itemCount: enriched.length,
      message: 'Đã thêm vào giỏ hàng.',
    },
  });
});

// ─── PUT /api/cart/item/:productId ────────────────────────────────────────────

router.put('/item/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  const { quantity } = req.body;

  if (!quantity || parseInt(quantity) < 1) {
    return res.status(400).json({ success: false, error: 'Số lượng không hợp lệ.' });
  }

  const session = getOrCreateCart(req, res);
  const items = parseItems(session);

  const index = items.findIndex(i => i.productId === productId);
  if (index === -1) {
    return res.status(404).json({ success: false, error: 'Sản phẩm không có trong giỏ hàng.' });
  }

  items[index].quantity = Math.max(1, parseInt(quantity));
  saveItems(session.id, items);

  const enriched = enrichItems(items);
  const subtotal = enriched.reduce((sum, item) => sum + item.subtotal, 0);

  res.json({
    success: true,
    data: {
      items: enriched,
      subtotal,
      itemCount: enriched.length,
    },
  });
});

// ─── DELETE /api/cart/item/:productId ────────────────────────────────────────

router.delete('/item/:productId', (req, res) => {
  const productId = parseInt(req.params.productId);
  const session = getOrCreateCart(req, res);
  const items = parseItems(session);

  const filtered = items.filter(i => i.productId !== productId);
  saveItems(session.id, filtered);

  const enriched = enrichItems(filtered);
  const subtotal = enriched.reduce((sum, item) => sum + item.subtotal, 0);

  res.json({
    success: true,
    data: {
      items: enriched,
      subtotal,
      itemCount: enriched.length,
      message: 'Đã xóa sản phẩm khỏi giỏ hàng.',
    },
  });
});

// ─── DELETE /api/cart/clear ───────────────────────────────────────────────────

router.delete('/clear', (req, res) => {
  const session = getOrCreateCart(req, res);
  saveItems(session.id, []);

  res.json({
    success: true,
    data: {
      items: [],
      subtotal: 0,
      itemCount: 0,
      message: 'Đã xóa toàn bộ giỏ hàng.',
    },
  });
});

// ─── GET /api/cart/count ──────────────────────────────────────────────────────

router.get('/count', (req, res) => {
  const cartIds = getCartIds(req);
  for (const cartId of cartIds) {
    const session = db.prepare('SELECT items_json FROM cart_sessions WHERE id = ?').get(cartId);
    if (session) {
      setCartCookie(res, cartId);
      const items = parseItems(session);
      return res.json({ success: true, data: { cartId, count: items.length } });
    }
  }

  if (cartIds.length > 0) clearCartCookie(res);
  res.json({ success: true, data: { cartId: null, count: 0 } });
});

module.exports = router;
module.exports.getOrCreateCart = getOrCreateCart;
module.exports.parseItems = parseItems;
module.exports.saveItems = saveItems;
