const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendNewsletterConfirmation } = require('../mailer');

function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── POST /api/newsletter/subscribe ──────────────────────────────────────────

router.post('/subscribe', (req, res) => {
  const { email, name } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập email hợp lệ.' });
  }

  const normalized = email.toLowerCase().trim();
  const existing = db.prepare('SELECT id, is_active FROM newsletter_subscribers WHERE email = ?').get(normalized);

  if (existing) {
    if (existing.is_active) {
      return res.json({
        success: true,
        data: { message: 'Email này đã được đăng ký nhận tin trước đó.', alreadySubscribed: true },
      });
    }
    // Re-activate
    db.prepare(`
      UPDATE newsletter_subscribers
      SET is_active = 1, name = ?, subscribed_at = datetime('now'), unsubscribed_at = NULL
      WHERE email = ?
    `).run(name ? name.trim() : null, normalized);
  } else {
    db.prepare(`
      INSERT INTO newsletter_subscribers (email, name) VALUES (?, ?)
    `).run(normalized, name ? name.trim() : null);
  }

  console.log(`📬 [NEWSLETTER] Đăng ký mới: ${normalized}`);
  sendNewsletterConfirmation({ email: normalized, name: name ? name.trim() : null }).catch(() => {});

  res.status(201).json({
    success: true,
    data: { message: 'Đăng ký nhận tin thành công! Cảm ơn bạn đã theo dõi Thư viện Sơn Nhai.' },
  });
});

// ─── DELETE /api/newsletter/unsubscribe ───────────────────────────────────────

router.delete('/unsubscribe', (req, res) => {
  const { email } = req.body;

  if (!email || !validateEmail(email)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  }

  const normalized = email.toLowerCase().trim();
  const subscriber = db.prepare('SELECT id FROM newsletter_subscribers WHERE email = ?').get(normalized);

  if (!subscriber) {
    return res.status(404).json({ success: false, error: 'Email này chưa đăng ký nhận tin.' });
  }

  db.prepare(`
    UPDATE newsletter_subscribers
    SET is_active = 0, unsubscribed_at = datetime('now')
    WHERE email = ?
  `).run(normalized);

  res.json({
    success: true,
    data: { message: 'Hủy đăng ký nhận tin thành công.' },
  });
});

module.exports = router;
