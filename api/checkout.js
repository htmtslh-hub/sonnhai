// ═══════════════════════════════════════════════════════════════════════════════
// Checkout API — Tạo đơn hàng vào Firestore
// POST /api/checkout
//
// Endpoint này được gọi từ checkout.html khi người dùng nhấn "Đặt hàng"
// Tạo document trong collection 'orders' với paymentStatus = 'pending'
// ═══════════════════════════════════════════════════════════════════════════════

const { getAdminDb, admin } = require('./firebase-admin');
const { setCors, success, error } = require('./lib');

module.exports = async (req, res) => {
  setCors(res, 'POST, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return error(res, 'Method not allowed', 405);

  const { customerName, customerEmail, customerPhone, items, couponCode, discount, subtotal, total } = req.body;

  // Validate
  if (!customerName || !customerEmail || !items || items.length === 0) {
    return error(res, 'Vui lòng điền đầy đủ thông tin và có ít nhất một sản phẩm');
  }

  if (!total || total <= 0) {
    return error(res, 'Tổng tiền không hợp lệ');
  }

  try {
    const db = getAdminDb();

    // Sinh mã đơn hàng: SN + 7 chữ số
    const orderNumber = 'SN' + String(Date.now()).slice(-7) + String(Math.floor(Math.random() * 100)).padStart(2, '0');

    const orderData = {
      orderNumber,
      customerName,
      customerEmail,
      customerPhone: customerPhone || '',
      items: items.map(item => ({
        productId: item.productId || '',
        name: item.name || '',
        price: item.price || 0,
        emoji: item.emoji || '📦',
        slug: item.slug || '',
      })),
      subtotal: subtotal || total,
      discount: discount || 0,
      couponCode: couponCode || '',
      total,
      paymentMethod: 'sepay_bank_transfer',
      paymentStatus: 'pending',
      paidAt: null,
      transactionId: null,
      paidAmount: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Lưu vào Firestore
    const docRef = await db.collection('orders').add(orderData);

    console.log(`[Checkout] Order created: ${orderNumber} (doc: ${docRef.id})`);

    return success(res, {
      orderId: docRef.id,
      orderNumber,
      total,
    });

  } catch (err) {
    console.error('[Checkout] Error:', err);
    return error(res, 'Có lỗi xảy ra khi tạo đơn hàng. Vui lòng thử lại.', 500);
  }
};
