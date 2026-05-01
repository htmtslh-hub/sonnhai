const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const admin = require('../firebase-admin');
const { sendWelcome } = require('../mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-this';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// ─── MIDDLEWARE ───────────────────────────────────────────────────────────────

async function requireAuth(req, res, next) {
  let token = null;

  const authHeader = req.headers['authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  if (!token && req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (!token) {
    return res.status(401).json({ success: false, error: 'Vui lòng đăng nhập để tiếp tục.' });
  }

  // Thử JWT local trước
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = { id: decoded.id, email: decoded.email, role: decoded.role };
    return next();
  } catch (_) {}

  // Thử Firebase ID token
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const user = db.prepare('SELECT id, email, role FROM users WHERE email = ?').get(decoded.email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Tài khoản chưa được đồng bộ. Vui lòng đăng nhập lại.' });
    }
    req.user = { id: user.id, email: user.email, role: user.role };
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.' });
  }
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Bạn không có quyền truy cập chức năng này.' });
    }
    next();
  });
}

// Middleware will be attached to router exports after route definitions

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

function setTokenCookie(res, token) {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập họ tên.' });
  }
  if (!email || !validateEmail(email)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ success: false, error: 'Mật khẩu phải có ít nhất 6 ký tự.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (existing) {
    return res.status(409).json({ success: false, error: 'Email đã tồn tại. Vui lòng đăng nhập.' });
  }

  const passwordHash = bcrypt.hashSync(password, 10);
  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'customer')
  `).run(name.trim(), email.toLowerCase().trim(), passwordHash);

  const user = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?')
    .get(result.lastInsertRowid);

  const token = generateToken(user);
  setTokenCookie(res, token);

  sendWelcome({ name: user.name, email: user.email }).catch(() => {});

  res.status(201).json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    },
  });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập email và mật khẩu.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase().trim());
  if (!user) {
    return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng.' });
  }

  if (!user.password_hash) {
    return res.status(401).json({ success: false, error: 'Tài khoản này dùng đăng nhập Google. Vui lòng đăng nhập bằng Google.' });
  }

  const isValid = bcrypt.compareSync(password, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Email hoặc mật khẩu không đúng.' });
  }

  const token = generateToken(user);
  setTokenCookie(res, token);

  res.json({
    success: true,
    data: {
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar },
    },
  });
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true, data: { message: 'Đăng xuất thành công.' } });
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
  }

  res.json({ success: true, data: { user } });
});

// PUT /api/auth/me
router.put('/me', requireAuth, (req, res) => {
  const { name, avatar } = req.body;

  if (name !== undefined && !name.trim()) {
    return res.status(400).json({ success: false, error: 'Tên không được để trống.' });
  }

  const user = db.prepare('SELECT id, name, avatar FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy tài khoản.' });
  }

  const newName = name ? name.trim() : user.name;
  const newAvatar = avatar !== undefined ? avatar : user.avatar;

  db.prepare(`
    UPDATE users SET name = ?, avatar = ?, updated_at = datetime('now') WHERE id = ?
  `).run(newName, newAvatar, req.user.id);

  const updated = db.prepare('SELECT id, name, email, role, avatar, created_at FROM users WHERE id = ?')
    .get(req.user.id);

  res.json({ success: true, data: { user: updated } });
});

// POST /api/auth/change-password
router.post('/change-password', requireAuth, (req, res) => {
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập mật khẩu cũ và mật khẩu mới.' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
  }

  const user = db.prepare('SELECT password_hash FROM users WHERE id = ?').get(req.user.id);
  if (!user || !user.password_hash) {
    return res.status(400).json({ success: false, error: 'Tài khoản này không có mật khẩu để thay đổi.' });
  }

  const isValid = bcrypt.compareSync(oldPassword, user.password_hash);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'Mật khẩu cũ không đúng.' });
  }

  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare(`UPDATE users SET password_hash = ?, updated_at = datetime('now') WHERE id = ?`)
    .run(newHash, req.user.id);

  res.json({ success: true, data: { message: 'Đổi mật khẩu thành công.' } });
});

// ─── FIREBASE AUTH SYNC ───────────────────────────────────────────────────────

// POST /api/auth/firebase
// Nhận Firebase ID token, verify và tạo/sync user vào SQLite
router.post('/firebase', async (req, res) => {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Thiếu Firebase token.' });
  }

  const idToken = authHeader.slice(7);

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(idToken);
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Firebase token không hợp lệ.' });
  }

  const { uid, email, name: fbName, picture } = decoded;
  const displayName = req.body.name || fbName || email.split('@')[0];

  // Upsert user: tạo mới nếu chưa có, cập nhật google_id và avatar nếu đã có
  let user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE email = ?').get(email);

  if (!user) {
    const result = db.prepare(`
      INSERT INTO users (name, email, role, google_id, avatar)
      VALUES (?, ?, 'customer', ?, ?)
    `).run(displayName, email, uid, picture || null);

    user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?')
      .get(result.lastInsertRowid);
  } else {
    // Cập nhật google_id và avatar nếu chưa có
    db.prepare(`
      UPDATE users SET google_id = COALESCE(google_id, ?), avatar = COALESCE(avatar, ?), updated_at = datetime('now')
      WHERE id = ?
    `).run(uid, picture || null, user.id);
    user = db.prepare('SELECT id, name, email, role, avatar FROM users WHERE id = ?').get(user.id);
  }

  res.json({
    success: true,
    data: { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar } },
  });
});

// Export router and middleware so other route files can import them
router.requireAuth = requireAuth;
router.requireAdmin = requireAdmin;
module.exports = router;
