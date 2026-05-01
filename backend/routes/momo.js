/**
 * momo.js — Tích hợp MoMo Payment Gateway (ATM/QR)
 *
 * Sandbox: https://developers.momo.vn/
 * Test credentials: https://developers.momo.vn/#/docs/en/aiov2/?id=payment-method
 *
 * Test account sandbox (public, dùng được ngay):
 *   MOMO_PARTNER_CODE = MOMOIQA420180417
 *   MOMO_ACCESS_KEY   = SHhMGbSp9IlXBFx7
 *   MOMO_SECRET_KEY   = iOi1232121312312312
 *
 * Sau khi có merchant account thật, thay bằng credentials production.
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const https = require('https');
const db = require('../db');
const { fulfillOrder } = require('../fulfillment');

// ─── Config ───────────────────────────────────────────────────────────────────

const MOMO_PARTNER_CODE = process.env.MOMO_PARTNER_CODE || 'MOMOIQA420180417';
const MOMO_ACCESS_KEY   = process.env.MOMO_ACCESS_KEY   || 'SHhMGbSp9IlXBFx7';
const MOMO_SECRET_KEY   = process.env.MOMO_SECRET_KEY   || 'iOi1232121312312312';
const MOMO_ENDPOINT     = process.env.MOMO_ENDPOINT     || 'test-payment.momo.vn';
const APP_URL           = process.env.APP_URL           || 'http://localhost:3000';
const MOMO_REDIRECT_URL = `${APP_URL}/momo-return.html`;
const MOMO_IPN_URL      = `${APP_URL}/api/momo/ipn`;

function isProductionMode() {
  return process.env.MOMO_PARTNER_CODE && process.env.MOMO_PARTNER_CODE !== 'MOMOIQA420180417';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hmacSHA256(key, data) {
  return crypto.createHmac('sha256', key).update(data).digest('hex');
}

function momoRequest(path, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body);
    const options = {
      hostname: MOMO_ENDPOINT,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Lỗi parse response từ MoMo')); }
      });
    });

    req.on('error', reject);
    req.write(bodyStr);
    req.end();
  });
}

// ─── POST /api/momo/create-payment ───────────────────────────────────────────

router.post('/create-payment', async (req, res) => {
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

  const requestId   = `${order.order_number}-${Date.now()}`;
  const orderId     = order.order_number;
  const orderInfo   = `Thanh toan don hang ${order.order_number}`;
  const amount      = String(order.total);
  const requestType = 'payWithMethod'; // QR + deeplink cả hai
  const extraData   = '';
  const autoCapture = true;
  const lang        = 'vi';

  // Tạo chữ ký HMAC-SHA256
  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${amount}`,
    `extraData=${extraData}`,
    `ipnUrl=${MOMO_IPN_URL}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `partnerCode=${MOMO_PARTNER_CODE}`,
    `redirectUrl=${MOMO_REDIRECT_URL}`,
    `requestId=${requestId}`,
    `requestType=${requestType}`,
  ].join('&');

  const signature = hmacSHA256(MOMO_SECRET_KEY, rawSignature);

  const body = {
    partnerCode: MOMO_PARTNER_CODE,
    accessKey:   MOMO_ACCESS_KEY,
    requestId,
    amount,
    orderId,
    orderInfo,
    redirectUrl: MOMO_REDIRECT_URL,
    ipnUrl:      MOMO_IPN_URL,
    lang,
    extraData,
    requestType,
    autoCapture,
    signature,
  };

  try {
    const momoRes = await momoRequest('/v2/gateway/api/create', body);

    if (momoRes.resultCode !== 0) {
      console.error(`[MOMO] Lỗi tạo payment: ${momoRes.message} (code ${momoRes.resultCode})`);
      return res.status(502).json({
        success: false,
        error: `MoMo: ${momoRes.message || 'Lỗi tạo thanh toán.'}`,
      });
    }

    console.log(`[MOMO] Tạo payment cho đơn ${orderNumber} — ${order.total.toLocaleString('vi-VN')}đ`);

    res.json({
      success: true,
      data: {
        payUrl:    momoRes.payUrl,    // URL web redirect
        deeplink:  momoRes.deeplink,  // App deeplink (momo://)
        qrCodeUrl: momoRes.qrCodeUrl, // URL ảnh QR (nếu có)
        orderNumber,
        amount: order.total,
      },
    });
  } catch (err) {
    console.error('[MOMO] Lỗi kết nối:', err.message);
    res.status(502).json({ success: false, error: 'Không thể kết nối MoMo. Vui lòng thử lại.' });
  }
});

// ─── POST /api/momo/ipn ───────────────────────────────────────────────────────
// MoMo gọi IPN endpoint sau khi thanh toán (server-to-server)

router.post('/ipn', express.json(), async (req, res) => {
  const {
    partnerCode, orderId, requestId, amount, orderInfo,
    orderType, transId, resultCode, message, payType,
    responseTime, extraData, signature,
  } = req.body;

  // Xác thực chữ ký
  const rawSignature = [
    `accessKey=${MOMO_ACCESS_KEY}`,
    `amount=${amount}`,
    `extraData=${extraData || ''}`,
    `message=${message}`,
    `orderId=${orderId}`,
    `orderInfo=${orderInfo}`,
    `orderType=${orderType}`,
    `partnerCode=${partnerCode}`,
    `payType=${payType}`,
    `requestId=${requestId}`,
    `responseTime=${responseTime}`,
    `resultCode=${resultCode}`,
    `transId=${transId}`,
  ].join('&');

  const checkSignature = hmacSHA256(MOMO_SECRET_KEY, rawSignature);

  if (checkSignature !== signature) {
    console.error('[MOMO] IPN signature không hợp lệ');
    return res.status(403).json({ resultCode: '403', message: 'Invalid signature' });
  }

  const orderNumber = orderId?.toUpperCase();
  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?').get(orderNumber);

  if (!order) return res.json({ resultCode: '0', message: 'Order not found' });
  if (order.payment_status === 'paid') return res.json({ resultCode: '0', message: 'Already paid' });

  if (resultCode === 0 || resultCode === '0') {
    try {
      await fulfillOrder(order.id, String(transId || 'momo'));
      console.log(`[MOMO] ✅ IPN thành công: đơn ${orderNumber}`);
    } catch (err) {
      console.error('[MOMO] Lỗi fulfill:', err.message);
    }
  } else {
    console.log(`[MOMO] Thanh toán thất bại: đơn ${orderNumber} — code ${resultCode}: ${message}`);
    db.prepare(`UPDATE orders SET payment_status='failed', updated_at=datetime('now') WHERE id=?`).run(order.id);
  }

  res.json({ resultCode: '0', message: 'Success' });
});

// ─── GET /api/momo/check-config ───────────────────────────────────────────────

router.get('/check-config', (req, res) => {
  res.json({
    success: true,
    data: {
      configured: true, // Sandbox credentials có sẵn, luôn hoạt động
      isProduction: isProductionMode(),
    },
  });
});

module.exports = router;
