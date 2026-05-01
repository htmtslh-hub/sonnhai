require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── SECURITY MIDDLEWARE ──────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // Disabled so static HTML pages work freely
  crossOriginEmbedderPolicy: false,
}));

// CORS — allow localhost and file:// (null origin)
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'http://localhost:3000',
      'http://localhost:5500',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5500',
      null, // file:// protocol sends null origin
    ];
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Allow all in development
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Cart-Id'],
}));

app.use(cookieParser(process.env.COOKIE_SECRET || 'cookie-secret'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── RATE LIMITING ────────────────────────────────────────────────────────────

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Quá nhiều yêu cầu, vui lòng thử lại sau.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, error: 'Quá nhiều lần đăng nhập, vui lòng thử lại sau 15 phút.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, error: 'Quá nhiều đơn hàng, vui lòng thử lại sau.' },
  skip: (req) => process.env.NODE_ENV === 'development',
});

app.use('/api/', generalLimiter);
app.use('/api/auth', authLimiter);
app.use('/api/checkout', checkoutLimiter);

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.use('/api/auth', require('./routes/auth'));
app.use('/api/products', require('./routes/products'));
app.use('/api/categories', require('./routes/categories'));
app.use('/api/cart', require('./routes/cart'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/checkout', require('./routes/checkout'));
app.use('/api/coupons', require('./routes/coupons'));
app.use('/api/downloads', require('./routes/downloads'));
app.use('/api/newsletter', require('./routes/newsletter'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/seapay', require('./routes/seapay'));
app.use('/api/admin', require('./routes/admin'));

// ─── STATIC FILES ─────────────────────────────────────────────────────────────

// Serve static files from parent directory (the frontend)
app.use(express.static(path.join(__dirname, '..'), {
  index: false, // Don't auto-serve index files
}));

// Root redirect
app.get('/', (req, res) => {
  res.redirect('/index.html');
});

// ─── 404 & ERROR HANDLERS ────────────────────────────────────────────────────

// 404 for API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint không tồn tại.' });
});

// Fallback for non-API routes — try to serve index.html
app.use((req, res) => {
  const indexPath = path.join(__dirname, '..', 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ success: false, error: 'Trang không tìm thấy.' });
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Lỗi server:', err);
  const status = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'Đã xảy ra lỗi, vui lòng thử lại.'
    : err.message || 'Lỗi server nội bộ.';
  res.status(status).json({ success: false, error: message });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────

const paymentPoller = require('./payment-poller');

app.listen(PORT, () => {
  console.log(`\n🚀 Thư viện Sơn Nhai Backend`);
  console.log(`📡 Server chạy tại http://localhost:${PORT}`);
  console.log(`🗄️  Database: SQLite (database.sqlite)`);
  console.log(`🌍 Môi trường: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\nAPI endpoints:`);
  console.log(`  GET  http://localhost:${PORT}/api/products`);
  console.log(`  GET  http://localhost:${PORT}/api/categories`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  POST http://localhost:${PORT}/api/checkout`);
  console.log(`\nAdmin: POST /api/auth/login với admin@sonhai.vn / admin123\n`);
  paymentPoller.start();
});

module.exports = app;
