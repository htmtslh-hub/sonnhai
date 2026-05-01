/**
 * seapay.js — Tích hợp SeaPay Payment Gateway
 *
 * Tài liệu: https://seapay.vn/docs/
 * Endpoint: https://payment.seapay.vn/api/v1/create_url
 *
 * Để sử dụng:
 * 1. Đăng ký merchant tại seapay.vn
 * 2. Lấy merchant_id và secret_key từ dashboard
 * 3. Điền vào .env: SEAPAY_MERCHANT_ID và SEAPAY_SECRET_KEY
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const https = require('https');
const http = require('http');
const db = require('../db');
const { fulfillOrder } = require('../fulfillment');

// ─── Config ───────────────────────────────────────────────────────────────────

const SEAPAY_MERCHANT_ID  = process.env.SEAPAY_MERCHANT_ID  || '';
const SEAPAY_SECRET_KEY   = process.env.SEAPAY_SECRET_KEY   || '';
const SEAPAY_API_URL      = process.env.SEAPAY_API_URL      || 'https://payment.seapay.vn/api/v1/create_url';
const APP_URL             = process.env.APP_URL             || 'http://localhost:3000';
const SEAPAY_RETURN_URL   = `${APP_URL}/seapay-return.html`;
const SEAPAY_CANCEL_URL   = `${APP_URL}/checkout.html?cancelled=1`;
const SEAPAY_CALLBACK_URL = `${APP_URL}/api/seapay/callback`;

function isConfigured() {
  return !!(SEAPAY_MERCHANT_ID && SEAPAY_SECRET_KEY);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Checksum = MD5(merchant_id + order_id + amount + secret_key)
function createChecksum(merchantId, orderId, amount, secretKey) {
  const raw = `${merchantId}${orderId}${amount}${secretKey}`;
  return crypto.createHash('md5').update(raw).digest('hex');
}

function postJson(urlStr, body) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(urlStr);
    const bodyStr = JSON.stringify(body);
    const isHttps = parsed.protocol === 'https:';
    const lib = isHttps ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (isHttps ? 443 : 80),
      path: parsed.pathname + (parsed.search || ''),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── POST /api/seapay/create-payment ─────────────────────────────────────────
// Tạo URL thanh toán SeaPay cho một đơn hàng pending

router.post('/create-payment', async (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'SeaPay chưa được cấu hình. Vui lòng liên hệ admin.',
    });
  }

  const { orderNumber } = req.body;
  if (!orderNumber) {
    return res.status(400).json({ success: false, error: 'Thiếu orderNumber.' });
  }

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?')
    .get(orderNumber.toUpperCase());
  if (!order) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
  }
  if (order.payment_status === 'paid') {
    return res.json({ success: true, data: { alreadyPaid: true } });
  }

  const checksum = createChecksum(
    SEAPAY_MERCHANT_ID,
    order.order_number,
    order.total,
    SEAPAY_SECRET_KEY
  );

  const payload = {
    merchant_id:  SEAPAY_MERCHANT_ID,
    order_id:     order.order_number,
    amount:       order.total,
    order_desc:   `Thanh toan don hang ${order.order_number}`,
    return_url:   SEAPAY_RETURN_URL,
    cancel_url:   SEAPAY_CANCEL_URL,
    callback_url: SEAPAY_CALLBACK_URL,
    checksum,
  };

  try {
    // MOCK: Generate a fake payment URL for the QR code since sandbox doesn't exist
    const paymentUrl = `https://seapay.vn/pay?order=${order.order_number}&amount=${order.total}`;
    console.log(`[SEAPAY] Tạo payment URL cho đơn ${orderNumber} — ${order.total.toLocaleString('vi-VN')}đ`);

    res.json({
      success: true,
      data: { paymentUrl, orderNumber },
    });
    return;
  } catch (err) {
    console.error('[SEAPAY] Lỗi kết nối:', err.message);
    res.status(502).json({ success: false, error: 'Không thể kết nối SeaPay. Vui lòng thử lại.' });
  }
});

// ─── POST /api/seapay/callback ────────────────────────────────────────────────
// SeaPay gọi server-to-server sau khi thanh toán hoàn tất (IPN)

router.post('/callback', express.json(), async (req, res) => {
  const { order_id, amount, status, checksum, transaction_id } = req.body;

  // Xác thực checksum
  const expectedChecksum = createChecksum(
    SEAPAY_MERCHANT_ID,
    order_id,
    amount,
    SEAPAY_SECRET_KEY
  );

  if (checksum !== expectedChecksum) {
    console.error(`[SEAPAY] Checksum không hợp lệ cho đơn ${order_id}`);
    return res.status(403).json({ status: 'error', message: 'Invalid checksum' });
  }

  const orderNumber = (order_id || '').toUpperCase();
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);

  if (!order) {
    return res.json({ status: 'success', message: 'Order not found' });
  }
  if (order.payment_status === 'paid') {
    return res.json({ status: 'success', message: 'Already paid' });
  }

  // Kiểm tra số tiền khớp (±1000đ để bù phí)
  if (Math.abs(parseInt(amount) - order.total) > 1000) {
    console.warn(`[SEAPAY] Số tiền không khớp: nhận ${amount}, cần ${order.total} (đơn ${orderNumber})`);
    return res.json({ status: 'success', message: 'Amount mismatch' });
  }

  if (status === 'success' || status === 'completed' || status === '1') {
    try {
      await fulfillOrder(order.id, String(transaction_id || 'seapay'));
      console.log(`[SEAPAY] ✅ Callback thanh toán thành công: đơn ${orderNumber}`);
    } catch (err) {
      console.error('[SEAPAY] Lỗi fulfill:', err.message);
    }
  } else {
    console.log(`[SEAPAY] Thanh toán thất bại: đơn ${orderNumber} — status: ${status}`);
    db.prepare(`UPDATE orders SET payment_status='failed', updated_at=datetime('now') WHERE id=?`)
      .run(order.id);
  }

  res.json({ status: 'success', message: 'OK' });
});

// ─── GET /api/seapay/return ───────────────────────────────────────────────────
// Redirect sau khi khách thanh toán xong (browser redirect từ SeaPay)

router.get('/return', (req, res) => {
  const { order_id, status, checksum, transaction_id, amount } = req.query;

  let isValid = false;
  if (checksum) {
    const expected = createChecksum(SEAPAY_MERCHANT_ID, order_id, amount, SEAPAY_SECRET_KEY);
    isValid = checksum === expected;
  }

  const params = new URLSearchParams({
    orderNumber: order_id || '',
    status: status || '',
    transactionId: transaction_id || '',
    valid: isValid ? '1' : '0',
  });

  res.redirect(`/seapay-return.html?${params.toString()}`);
});

// ─── GET /api/seapay/status/:orderNumber ─────────────────────────────────────
// Frontend polling — kiểm tra trạng thái thanh toán

router.get('/status/:orderNumber', (req, res) => {
  const order = db.prepare(`
    SELECT order_number, payment_status, status, paid_at FROM orders WHERE order_number = ?
  `).get(req.params.orderNumber.toUpperCase());

  if (!order) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
  }

  let downloadTokens = [];
  if (order.payment_status === 'paid') {
    downloadTokens = db.prepare(`
      SELECT dt.token, dt.max_downloads, dt.expires_at, p.name as product_name, p.emoji
      FROM download_tokens dt
      LEFT JOIN products p ON dt.product_id = p.id
      JOIN orders o ON dt.order_id = o.id
      WHERE o.order_number = ?
    `).all(order.order_number);
  }

  res.json({
    success: true,
    data: {
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
      status: order.status,
      paidAt: order.paid_at,
      downloadTokens,
    },
  });
});

// ─── GET /api/seapay/check-config ─────────────────────────────────────────────

router.get('/check-config', (req, res) => {
  res.json({ success: true, data: { configured: isConfigured() } });
});

module.exports = router;
