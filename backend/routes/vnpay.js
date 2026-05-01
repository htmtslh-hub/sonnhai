/**
 * vnpay.js — Tích hợp VNPay Payment Gateway
 *
 * Sandbox: https://sandbox.vnpayment.vn/merchantv2/
 * Tài liệu: https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.md
 *
 * Đăng ký tài khoản sandbox tại: https://sandbox.vnpayment.vn/devreg/
 * Sau khi đăng ký sẽ nhận được:
 *   - VNPAY_TMN_CODE (ví dụ: DEMO1234)
 *   - VNPAY_HASH_SECRET (chuỗi 32 ký tự)
 */

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const querystring = require('querystring');
const db = require('../db');
const { fulfillOrder } = require('../fulfillment');

// ─── Config ───────────────────────────────────────────────────────────────────

const VNP_TMN_CODE    = process.env.VNPAY_TMN_CODE    || '';
const VNP_HASH_SECRET = process.env.VNPAY_HASH_SECRET || '';
const VNP_URL         = process.env.VNPAY_URL || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
const VNP_RETURN_URL  = (process.env.APP_URL || 'http://localhost:3000') + '/vnpay-return.html';

function isConfigured() {
  return VNP_TMN_CODE && VNP_HASH_SECRET && VNP_TMN_CODE !== 'placeholder';
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sortObject(obj) {
  const sorted = {};
  const keys = Object.keys(obj).sort();
  for (const key of keys) sorted[key] = obj[key];
  return sorted;
}

function createHmacSHA512(secret, data) {
  return crypto.createHmac('sha512', secret).update(data).digest('hex');
}

function getVnpayDate(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

// ─── POST /api/vnpay/create-payment ──────────────────────────────────────────
// Frontend gọi sau khi tạo order, nhận về redirect URL

router.post('/create-payment', (req, res) => {
  if (!isConfigured()) {
    return res.status(503).json({
      success: false,
      error: 'VNPay chưa được cấu hình. Vui lòng liên hệ admin.',
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

  const ipAddr = req.headers['x-forwarded-for']?.split(',')[0].trim()
    || req.socket.remoteAddress
    || '127.0.0.1';

  const now = new Date();
  const expireDate = new Date(now.getTime() + 15 * 60 * 1000); // 15 phút

  // VNPay amount = số tiền × 100 (không có dấu phẩy)
  const vnpParams = {
    vnp_Version:     '2.1.0',
    vnp_Command:     'pay',
    vnp_TmnCode:     VNP_TMN_CODE,
    vnp_Locale:      'vn',
    vnp_CurrCode:    'VND',
    vnp_TxnRef:      order.order_number,
    vnp_OrderInfo:   `Thanh toan don hang ${order.order_number}`,
    vnp_OrderType:   'other',
    vnp_Amount:      order.total * 100,
    vnp_ReturnUrl:   VNP_RETURN_URL,
    vnp_IpAddr:      ipAddr,
    vnp_CreateDate:  getVnpayDate(now),
    vnp_ExpireDate:  getVnpayDate(expireDate),
  };

  const sortedParams = sortObject(vnpParams);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const secureHash = createHmacSHA512(VNP_HASH_SECRET, signData);
  const paymentUrl = `${VNP_URL}?${signData}&vnp_SecureHash=${secureHash}`;

  console.log(`[VNPAY] Tạo payment URL cho đơn ${orderNumber} — ${order.total.toLocaleString('vi-VN')}đ`);

  res.json({ success: true, data: { paymentUrl, orderNumber } });
});

// ─── GET /api/vnpay/ipn ───────────────────────────────────────────────────────
// VNPay gọi IPN endpoint sau khi thanh toán (server-to-server)

router.get('/ipn', async (req, res) => {
  const vnpParams = { ...req.query };
  const secureHash = vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  const sortedParams = sortObject(vnpParams);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const checkHash = createHmacSHA512(VNP_HASH_SECRET, signData);

  if (secureHash !== checkHash) {
    return res.json({ RspCode: '97', Message: 'Invalid signature' });
  }

  const orderNumber = vnpParams['vnp_TxnRef'];
  const responseCode = vnpParams['vnp_ResponseCode'];
  const transactionStatus = vnpParams['vnp_TransactionStatus'];
  const vnpAmount = parseInt(vnpParams['vnp_Amount'] || '0') / 100;

  const order = db.prepare('SELECT * FROM orders WHERE order_number = ?')
    .get(orderNumber?.toUpperCase());

  if (!order) return res.json({ RspCode: '01', Message: 'Order not found' });
  if (order.payment_status === 'paid') return res.json({ RspCode: '02', Message: 'Order already confirmed' });

  if (Math.abs(vnpAmount - order.total) > 1000) {
    return res.json({ RspCode: '04', Message: 'Invalid amount' });
  }

  if (responseCode === '00' && transactionStatus === '00') {
    try {
      await fulfillOrder(order.id, vnpParams['vnp_TransactionNo'] || 'vnpay');
      console.log(`[VNPAY] ✅ IPN thành công: đơn ${orderNumber}`);
      return res.json({ RspCode: '00', Message: 'Confirm success' });
    } catch (err) {
      console.error('[VNPAY] Lỗi fulfill:', err.message);
      return res.json({ RspCode: '99', Message: 'Internal error' });
    }
  }

  console.log(`[VNPAY] Thanh toán thất bại: đơn ${orderNumber} — code ${responseCode}`);
  db.prepare(`UPDATE orders SET payment_status='failed', updated_at=datetime('now') WHERE id=?`).run(order.id);
  return res.json({ RspCode: '00', Message: 'Confirm success' });
});

// ─── GET /api/vnpay/return ────────────────────────────────────────────────────
// VNPay redirect khách về URL này sau khi thanh toán (browser redirect)
// Frontend vnpay-return.html đọc query params từ URL để hiển thị kết quả

router.get('/return', (req, res) => {
  const vnpParams = { ...req.query };
  const secureHash = vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHash'];
  delete vnpParams['vnp_SecureHashType'];

  const sortedParams = sortObject(vnpParams);
  const signData = querystring.stringify(sortedParams, { encode: false });
  const checkHash = createHmacSHA512(VNP_HASH_SECRET, signData);

  const isValid = secureHash === checkHash;
  const responseCode = vnpParams['vnp_ResponseCode'];
  const orderNumber = vnpParams['vnp_TxnRef'];

  // Redirect về frontend với kết quả
  const params = new URLSearchParams({
    orderNumber: orderNumber || '',
    code: responseCode || '99',
    valid: isValid ? '1' : '0',
  });
  res.redirect(`/vnpay-return.html?${params.toString()}`);
});

// ─── GET /api/vnpay/check-config ─────────────────────────────────────────────
// Frontend kiểm tra VNPay đã cấu hình chưa trước khi hiện payment option

router.get('/check-config', (req, res) => {
  res.json({ success: true, data: { configured: isConfigured() } });
});

module.exports = router;
