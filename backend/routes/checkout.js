const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { fulfillOrder } = require('../fulfillment');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function generateOrderNumber() {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `SNH-${datePart}-${rand}`;
}

function calculateDiscount(coupon, subtotal) {
  if (!coupon) return 0;
  if (coupon.type === 'percent') {
    return Math.floor(subtotal * coupon.value / 100);
  }
  return Math.min(coupon.value, subtotal);
}

function validateCouponRecord(code, subtotal) {
  const coupon = db.prepare('SELECT * FROM coupons WHERE code = ? COLLATE NOCASE').get(code);

  if (!coupon) return { valid: false, error: 'Mã giảm giá không tồn tại.' };
  if (!coupon.is_active) return { valid: false, error: 'Mã giảm giá đã bị vô hiệu hóa.' };
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return { valid: false, error: 'Mã giảm giá đã hết hạn.' };
  }
  if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
    return { valid: false, error: 'Mã giảm giá đã hết lượt sử dụng.' };
  }
  if (subtotal < coupon.min_order) {
    const formatted = coupon.min_order.toLocaleString('vi-VN');
    return { valid: false, error: `Đơn hàng tối thiểu ${formatted}đ để sử dụng mã này.` };
  }

  const discount = calculateDiscount(coupon, subtotal);
  const finalTotal = Math.max(0, subtotal - discount);

  return { valid: true, coupon, discount, finalTotal };
}


// ─── POST /api/checkout/validate-coupon ───────────────────────────────────────

router.post('/validate-coupon', (req, res) => {
  const { code, subtotal } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập mã giảm giá.' });
  }
  if (!subtotal || isNaN(subtotal) || subtotal <= 0) {
    return res.status(400).json({ success: false, error: 'Giá trị đơn hàng không hợp lệ.' });
  }

  const result = validateCouponRecord(code.trim().toUpperCase(), parseInt(subtotal));

  if (!result.valid) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      couponId: result.coupon.id,
      code: result.coupon.code,
      type: result.coupon.type,
      value: result.coupon.value,
      discount: result.discount,
      finalTotal: result.finalTotal,
    },
  });
});

// ─── POST /api/checkout ───────────────────────────────────────────────────────

router.post('/', async (req, res) => {
  const { customerName, customerEmail, cartId, paymentMethod, couponCode } = req.body;

  // Validate required fields
  if (!customerName || !customerName.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập họ tên.' });
  }
  if (!customerEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ.' });
  }
  if (!cartId) {
    return res.status(400).json({ success: false, error: 'Không tìm thấy giỏ hàng.' });
  }
  const validMethods = ['stripe', 'vnpay', 'momo', 'seapay', 'bank_transfer'];
  if (!paymentMethod || !validMethods.includes(paymentMethod)) {
    return res.status(400).json({ success: false, error: 'Phương thức thanh toán không hợp lệ.' });
  }

  // Load cart
  const session = db.prepare('SELECT * FROM cart_sessions WHERE id = ?').get(cartId);
  if (!session) {
    return res.status(400).json({ success: false, error: 'Giỏ hàng không tồn tại hoặc đã hết hạn.' });
  }

  let cartItems;
  try {
    cartItems = JSON.parse(session.items_json || '[]');
  } catch {
    cartItems = [];
  }

  if (cartItems.length === 0) {
    return res.status(400).json({ success: false, error: 'Giỏ hàng trống.' });
  }

  // Verify products and get current prices
  const orderItems = [];
  let subtotal = 0;

  for (const item of cartItems) {
    const product = db.prepare("SELECT * FROM products WHERE id = ? AND status = 'published'")
      .get(item.productId);
    if (!product) {
      return res.status(400).json({
        success: false,
        error: `Sản phẩm "${item.productId}" không còn tồn tại. Vui lòng cập nhật giỏ hàng.`,
      });
    }
    orderItems.push({
      product,
      quantity: item.quantity || 1,
      price: product.price,
    });
    subtotal += product.price * (item.quantity || 1);
  }

  // Validate coupon
  let discount = 0;
  let couponRecord = null;
  if (couponCode && couponCode.trim()) {
    const couponResult = validateCouponRecord(couponCode.trim().toUpperCase(), subtotal);
    if (!couponResult.valid) {
      return res.status(400).json({ success: false, error: couponResult.error });
    }
    discount = couponResult.discount;
    couponRecord = couponResult.coupon;
  }

  const total = Math.max(0, subtotal - discount);

  // Find user if logged in
  let userId = null;
  const authHeader = req.headers['authorization'];
  const tokenCookie = req.cookies && req.cookies.token;
  const token = authHeader ? authHeader.slice(7) : tokenCookie;
  if (token) {
    try {
      const jwt = require('jsonwebtoken');
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-this');
      userId = decoded.id;
    } catch { /* guest checkout */ }
  }

  // Generate order number
  let orderNumber = generateOrderNumber();
  // Ensure uniqueness
  while (db.prepare('SELECT id FROM orders WHERE order_number = ?').get(orderNumber)) {
    orderNumber = generateOrderNumber();
  }

  // SeaPay và bank_transfer đều tạo đơn pending rồi thanh toán sau
  const isPendingMethod = paymentMethod === 'bank_transfer' || paymentMethod === 'seapay';

  // ── Tạo đơn hàng ─────────────────────────────────────────────────────────
  const createOrder = db.transaction(() => {
    const initialStatus  = isPendingMethod ? 'pending'    : 'completed';
    const initialPayment = isPendingMethod ? 'pending'    : 'paid';

    const orderResult = db.prepare(`
      INSERT INTO orders (
        order_number, user_id, customer_name, customer_email,
        subtotal, discount, total, coupon_code,
        payment_method, payment_status, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderNumber, userId,
      customerName.trim(), customerEmail.toLowerCase().trim(),
      subtotal, discount, total,
      couponRecord ? couponRecord.code : null,
      paymentMethod, initialPayment, initialStatus
    );

    const orderId = orderResult.lastInsertRowid;

    // Chỉ tạo order items (download tokens sẽ tạo trong fulfillOrder)
    for (const item of orderItems) {
      db.prepare(`
        INSERT INTO order_items (order_id, product_id, product_name, price)
        VALUES (?, ?, ?, ?)
      `).run(orderId, item.product.id, item.product.name, item.price);
    }

    // Tăng coupon usage
    if (couponRecord) {
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(couponRecord.id);
      db.prepare(`INSERT INTO coupon_usages (coupon_id, user_id, order_id) VALUES (?, ?, ?)`)
        .run(couponRecord.id, userId, orderId);
    }

    // Xoá giỏ hàng
    db.prepare(`UPDATE cart_sessions SET items_json = '[]', updated_at = datetime('now') WHERE id = ?`)
      .run(cartId);

    return orderId;
  });

  const orderId = createOrder();

  // ── SeaPay: trả về order, frontend gọi /api/seapay/create-payment để lấy URL ──
  if (paymentMethod === 'seapay') {
    console.log(`[CHECKOUT] Đơn ${orderNumber} — Chờ thanh toán SeaPay ${total.toLocaleString('vi-VN')}đ`);
    return res.status(201).json({
      success: true,
      data: {
        order: {
          orderNumber, orderId,
          customerName: customerName.trim(),
          customerEmail: customerEmail.toLowerCase().trim(),
          subtotal, discount, total,
          paymentMethod,
          paymentStatus: 'pending',
          status: 'pending',
        },
        redirectMethod: 'seapay',
      },
    });
  }

  // ── Bank transfer: trả về QR để khách quét ───────────────────────────────
  if (paymentMethod === 'bank_transfer') {
    const BANK_BIN  = process.env.BANK_BIN || '970407';
    const BANK_ACCT = process.env.BANK_ACCOUNT_NUMBER;
    const BANK_NAME = process.env.BANK_ACCOUNT_NAME || '';

    let qrData = null;
    if (BANK_ACCT) {
      const transferContent = `SONHAI ${orderNumber}`;
      qrData = {
        qrUrl: `https://img.vietqr.io/image/${BANK_BIN}-${BANK_ACCT}-compact2.png`
          + `?amount=${total}`
          + `&addInfo=${encodeURIComponent(transferContent)}`
          + `&accountName=${encodeURIComponent(BANK_NAME)}`,
        bankBin: BANK_BIN,
        accountNumber: BANK_ACCT,
        accountName: BANK_NAME,
        transferContent,
      };
    }

    console.log(`[CHECKOUT] Đơn ${orderNumber} — Chờ chuyển khoản ${total.toLocaleString('vi-VN')}đ`);

    return res.status(201).json({
      success: true,
      data: {
        order: {
          orderNumber, orderId,
          customerName: customerName.trim(),
          customerEmail: customerEmail.toLowerCase().trim(),
          subtotal, discount, total,
          paymentMethod,
          paymentStatus: 'pending',
          status: 'pending',
        },
        qr: qrData,
        pollUrl: `/api/payment/status/${orderNumber}`,
      },
    });
  }

  // ── Stripe/VNPay/MoMo (simulate): fulfill ngay ───────────────────────────
  const methodNames = { stripe: 'Thẻ tín dụng (Stripe)', vnpay: 'VNPay QR', momo: 'Ví MoMo' };
  console.log(`\n💳 [THANH TOÁN] Đơn ${orderNumber} - ${methodNames[paymentMethod] || paymentMethod} - ${total.toLocaleString('vi-VN')}đ`);

  await fulfillOrder(orderId, 'simulated');

  // Lấy download tokens vừa tạo để trả về response
  const downloadTokens = db.prepare(`
    SELECT dt.token, dt.max_downloads, dt.expires_at, p.name as product_name, p.emoji as product_emoji
    FROM download_tokens dt LEFT JOIN products p ON dt.product_id = p.id
    WHERE dt.order_id = ?
  `).all(orderId);

  res.status(201).json({
    success: true,
    data: {
      order: {
        orderNumber, orderId,
        customerName: customerName.trim(),
        customerEmail: customerEmail.toLowerCase().trim(),
        subtotal, discount, total,
        paymentMethod,
        paymentStatus: 'paid',
        status: 'completed',
        downloadTokens,
      },
    },
  });
});

module.exports = router;
module.exports.validateCouponRecord = validateCouponRecord;
