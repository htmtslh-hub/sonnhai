const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendOrderConfirmation, sendAdminNewOrder } = require('../mailer');
const { fulfillOrder } = require('../fulfillment');

// ─── VietQR config ────────────────────────────────────────────────────────────

const BANK_BIN   = process.env.BANK_BIN   || '970407'; // Techcombank BIN
const BANK_ACCT  = process.env.BANK_ACCOUNT_NUMBER;
const BANK_NAME  = process.env.BANK_ACCOUNT_NAME || 'NGUYEN VAN A';
const VIETQR_URL = 'https://img.vietqr.io/image';

// ─── GET /api/payment/qr/:orderNumber ────────────────────────────────────────
// Trả về URL ảnh QR và thông tin chuyển khoản cho một đơn hàng pending

router.get('/qr/:orderNumber', (req, res) => {
  const order = db.prepare(`SELECT * FROM orders WHERE order_number = ?`)
    .get(req.params.orderNumber.toUpperCase());

  if (!order) {
    return res.status(404).json({ success: false, error: 'Không tìm thấy đơn hàng.' });
  }
  if (order.payment_status === 'paid') {
    return res.json({ success: true, data: { alreadyPaid: true } });
  }
  if (!BANK_ACCT) {
    return res.status(500).json({ success: false, error: 'Chưa cấu hình tài khoản ngân hàng.' });
  }

  const transferContent = `SONHAI ${order.order_number}`;
  const qrUrl = `${VIETQR_URL}/${BANK_BIN}-${BANK_ACCT}-compact2.png`
    + `?amount=${order.total}`
    + `&addInfo=${encodeURIComponent(transferContent)}`
    + `&accountName=${encodeURIComponent(BANK_NAME)}`;

  res.json({
    success: true,
    data: {
      qrUrl,
      bankBin: BANK_BIN,
      accountNumber: BANK_ACCT,
      accountName: BANK_NAME,
      amount: order.total,
      transferContent,
      orderNumber: order.order_number,
      paymentStatus: order.payment_status,
    },
  });
});

// ─── GET /api/payment/status/:orderNumber ─────────────────────────────────────
// Frontend polling — kiểm tra đơn đã paid chưa (mỗi 5–10 giây)

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

// ─── POST /api/payment/confirm ────────────────────────────────────────────────
// Webhook từ Casso — gọi khi có giao dịch mới vào tài khoản
// Header: x-casso-secret phải khớp CASSO_WEBHOOK_SECRET trong .env

router.post('/confirm', express.json(), (req, res) => {
  const secret = process.env.CASSO_WEBHOOK_SECRET;
  if (secret) {
    const received = req.headers['x-casso-secret'] || req.headers['secure-token'];
    if (received !== secret) {
      return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
  }

  // Casso gửi mảng transactions
  const transactions = req.body.data || [req.body];

  for (const tx of transactions) {
    processCassoTransaction(tx).catch(err =>
      console.error('[PAYMENT] Lỗi xử lý giao dịch:', err.message)
    );
  }

  res.json({ success: true });
});

// ─── MANUAL CONFIRM (Admin) ───────────────────────────────────────────────────
// POST /api/payment/manual-confirm — admin xác nhận thủ công

const authRouter = require('./auth');
router.post('/manual-confirm', authRouter.requireAdmin, async (req, res) => {
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
    return res.json({ success: true, data: { message: 'Đơn hàng đã được thanh toán trước đó.' } });
  }

  await fulfillOrder(order.id, 'manual');
  res.json({ success: true, data: { message: `Đã xác nhận thanh toán đơn ${orderNumber}.` } });
});

// ─── INTERNAL: xử lý một giao dịch Casso ────────────────────────────────────

async function processCassoTransaction(tx) {
  // tx.description / tx.corresponsiveName / tx.amount
  const description = (tx.description || tx.content || '').toUpperCase();
  const amount = parseInt(tx.amount || tx.cuSoDuSauGD || 0);

  console.log(`[PAYMENT] Giao dịch Casso: "${description}" — ${amount.toLocaleString('vi-VN')}đ`);

  // Tìm mã đơn hàng trong nội dung chuyển khoản (dạng SNH-YYYYMMDD-XXXX)
  const match = description.match(/SNH-\d{8}-\d{4}/);
  if (!match) return;

  const orderNumber = match[0];
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);
  if (!order || order.payment_status === 'paid') return;

  // Kiểm tra số tiền khớp (cho phép sai lệch ±1000đ)
  if (Math.abs(amount - order.total) > 1000) {
    console.warn(`[PAYMENT] Số tiền không khớp: nhận ${amount}, cần ${order.total} (đơn ${orderNumber})`);
    return;
  }

  await fulfillOrder(order.id, tx.tid || tx.id || 'casso');
}

module.exports = router;
module.exports.processCassoTransaction = processCassoTransaction;
