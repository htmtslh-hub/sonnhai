require('dotenv').config();

const functions = require('firebase-functions');

// Set global region
functions.setGlobalOptions({
  region: 'asia-southeast1'
});

const express = require('express');
const cors = require('cors')({ origin: true, credentials: true });
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors);
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const mockData = {
  products: [
    { id: 1, name: 'JavaScript từ A-Z', icon: '📚', category: 'ebook', price: 299000, originalPrice: 399000, sold: 45, stock: 100, status: 'published', description: 'Sách JavaScript toàn tập', format: 'PDF', pages: 320, image: '', createdAt: '2026-04-01', updatedAt: '2026-05-01' },
    { id: 2, name: 'React Master Course', icon: '⚛️', category: 'course', price: 499000, originalPrice: 699000, sold: 38, stock: 50, status: 'published', description: 'Khóa học React từ cơ bản đến nâng cao', format: 'PDF', pages: 450, image: '', createdAt: '2026-04-05', updatedAt: '2026-05-01' },
    { id: 3, name: 'Node.js Backend', icon: '🟢', category: 'course', price: 399000, originalPrice: 499000, sold: 32, stock: 75, status: 'published', description: 'Backend với Node.js và Express', format: 'PDF', pages: 380, image: '', createdAt: '2026-04-10', updatedAt: '2026-05-01' },
    { id: 4, name: 'Python cho AI', icon: '🐍', category: 'course', price: 599000, originalPrice: 799000, sold: 28, stock: 60, status: 'published', description: 'Python cho Machine Learning và AI', format: 'PDF', pages: 520, image: '', createdAt: '2026-04-15', updatedAt: '2026-05-01' },
    { id: 5, name: 'UI/UX Design', icon: '🎨', category: 'ebook', price: 349000, originalPrice: 449000, sold: 24, stock: 80, status: 'published', description: 'Thiết kế UI/UX chuyên nghiệp', format: 'PDF', pages: 280, image: '', createdAt: '2026-04-20', updatedAt: '2026-05-01' },
    { id: 6, name: 'TypeScript Guide', icon: '📘', category: 'ebook', price: 249000, originalPrice: 349000, sold: 18, stock: 100, status: 'draft', description: 'Hướng dẫn TypeScript toàn tập', format: 'PDF', pages: 300, image: '', createdAt: '2026-04-25', updatedAt: '2026-05-01' }
  ],
  orders: [],
  users: [],
  carts: {}
};

// ─── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: functions.config().environment?.value || 'production'
  });
});

// ─── PRODUCTS API ─────────────────────────────────────────────────────────────
app.get('/api/products', (req, res) => {
  const { category, status, search, page = 1, limit = 20 } = req.query;

  let products = mockData.products.filter(p => p.status === 'published');

  if (category) {
    products = products.filter(p => p.category === category);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.description && p.description.toLowerCase().includes(searchLower))
    );
  }

  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = products.slice(start, start + parseInt(limit));

  res.json({
    success: true,
    data: paginated,
    total: products.length,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(products.length / parseInt(limit))
  });
});

app.get('/api/products/:id', (req, res) => {
  const product = mockData.products.find(p => p.id === parseInt(req.params.id));
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, data: product });
});

// ─── CART API ─────────────────────────────────────────────────────────────────
app.get('/api/cart', (req, res) => {
  const cartId = req.headers['x-cart-id'] || 'guest-cart';
  const cart = mockData.carts[cartId] || { items: [], total: 0 };
  res.json({ success: true, data: cart });
});

app.post('/api/cart/add', (req, res) => {
  const { productId, quantity = 1 } = req.body;
  const cartId = req.headers['x-cart-id'] || 'guest-cart';

  if (!mockData.carts[cartId]) {
    mockData.carts[cartId] = { items: [], total: 0, createdAt: new Date().toISOString() };
  }

  const product = mockData.products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const existingItem = mockData.carts[cartId].items.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    mockData.carts[cartId].items.push({
      productId,
      name: product.name,
      price: product.price,
      quantity,
      icon: product.icon,
      image: product.image
    });
  }

  mockData.carts[cartId].total = mockData.carts[cartId].items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  res.json({
    success: true,
    data: mockData.carts[cartId],
    cartCount: mockData.carts[cartId].items.reduce((sum, item) => sum + item.quantity, 0)
  });
});

app.post('/api/cart/remove', (req, res) => {
  const { productId } = req.body;
  const cartId = req.headers['x-cart-id'] || 'guest-cart';

  if (!mockData.carts[cartId]) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }

  mockData.carts[cartId].items = mockData.carts[cartId].items.filter(item => item.productId !== productId);
  mockData.carts[cartId].total = mockData.carts[cartId].items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  res.json({
    success: true,
    data: mockData.carts[cartId],
    cartCount: mockData.carts[cartId].items.reduce((sum, item) => sum + item.quantity, 0)
  });
});

app.get('/api/cart/count', (req, res) => {
  const cartId = req.headers['x-cart-id'] || 'guest-cart';
  const cart = mockData.carts[cartId] || { items: [] };
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  res.json({ success: true, data: { count } });
});

// ─── CHECKOUT API ─────────────────────────────────────────────────────────────
app.post('/api/checkout', (req, res) => {
  const { email, name, items, couponCode, paymentMethod } = req.body;

  if (!email || !name || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng điền đầy đủ thông tin và có ít nhất một sản phẩm'
    });
  }

  const orderId = 'ORD-' + Date.now();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const order = {
    id: orderId,
    email,
    name,
    items,
    total,
    couponCode,
    paymentMethod: paymentMethod || 'stripe',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  mockData.orders.push(order);

  res.json({
    success: true,
    data: {
      orderId: orderId,
      total: total,
      email: email,
      downloadUrl: `/api/downloads/${orderId}`
    }
  });
});

// ─── NEWSLETTER API ───────────────────────────────────────────────────────────
app.post('/api/newsletter/subscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !email.includes('@')) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
  }

  mockData.users.push({ email, subscribedAt: new Date().toISOString() });

  res.json({
    success: true,
    message: 'Đăng ký nhận tin thành công! Cảm ơn bạn.'
  });
});

// ─── ORDERS API (Admin) ──────────────────────────────────────────────────────
app.get('/api/orders', (req, res) => {
  res.json({
    success: true,
    data: mockData.orders,
    total: mockData.orders.length
  });
});

app.get('/api/orders/:id', (req, res) => {
  const order = mockData.orders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// ─── SEA PAY API ──────────────────────────────────────────────────────────────
app.post('/api/seapay/create-payment', (req, res) => {
  const { orderId, amount, email } = req.body;
  res.json({
    success: true,
    data: {
      paymentUrl: `https://seapay.vn/payment/${orderId}`,
      orderId,
      amount
    }
  });
});

app.post('/api/seapay/status/:orderNumber', (req, res) => {
  const { orderNumber } = req.params;
  const order = mockData.orders.find(o => o.id === orderNumber);
  res.json({
    success: true,
    data: {
      orderNumber,
      status: order ? order.status : 'not_found',
      amount: order ? order.total : 0
    }
  });
});

// ─── EXPORT AS FIREBASE FUNCTION ──────────────────────────────────────────────
exports.api = functions
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB',
    minInstances: 0,
    maxInstances: 10
  })
  .https.onRequest(app);
