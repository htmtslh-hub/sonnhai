// ═══════════════════════════════════════════════════════════════════════════════
// SePay Payment Gateway — Tạo đơn hàng trên SePay
// POST /api/seapay/create-order
//
// Tạo đơn hàng trên SePay Payment Gateway thay vì chỉ tạo QR code tĩnh.
// SePay sẽ tự động khớp giao dịch khi khách thanh toán đúng nội dung + số tiền
// → Gửi IPN đến webhook → Hệ thống tự động xác nhận + gửi link tải
// ═══════════════════════════════════════════════════════════════════════════════

const { getAdminDb } = require('../firebase-admin');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { orderNumber, amount, description } = req.body || {};

  if (!orderNumber || !amount) {
    return res.status(400).json({ success: false, message: 'Missing orderNumber or amount' });
  }

  const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN || process.env.SEPAY_API_KEY || '';
  const SEPAY_ACCOUNT = process.env.SEPAY_ACCOUNT_NUMBER || '';

  if (!SEPAY_API_TOKEN) {
    console.error('[SePay Create Order] No API token configured');
    return res.status(500).json({ success: false, message: 'Payment gateway not configured' });
  }

  try {
    // ─── 1. Lấy bank account ID từ SePay ───
    let bankAccountId = process.env.SEPAY_BANK_ACCOUNT_ID || '';

    if (!bankAccountId) {
      // Tự động lấy bank account ID từ SePay API
      console.log('[SePay Create Order] Fetching bank accounts from SePay...');
      const bankRes = await fetch('https://my.sepay.vn/userapi/bankaccounts', {
        headers: { 'Authorization': `Bearer ${SEPAY_API_TOKEN}` },
      });

      if (bankRes.ok) {
        const bankData = await bankRes.json();
        const accounts = bankData.bankaccounts || bankData.data || [];
        // Tìm tài khoản VietinBank khớp
        const matchedAccount = accounts.find(a =>
          (a.account_number === SEPAY_ACCOUNT) ||
          (a.bank_short_name === 'VietinBank') ||
          (a.bank_short_name === 'CTG')
        ) || accounts[0];

        if (matchedAccount) {
          bankAccountId = matchedAccount.id;
          console.log(`[SePay Create Order] Using bank account: ${bankAccountId} (${matchedAccount.account_number})`);
        }
      }
    }

    if (!bankAccountId) {
      console.error('[SePay Create Order] Could not find bank account ID');
      // Fallback: trả về QR code tĩnh
      return res.status(200).json({
        success: true,
        data: {
          orderNumber,
          amount,
          qrUrl: `https://qr.sepay.vn/img?bank=VietinBank&acc=${SEPAY_ACCOUNT}&template=compact&amount=${amount}&des=${orderNumber}`,
          method: 'static_qr',
        },
      });
    }

    // ─── 2. Tạo đơn hàng trên SePay Payment Gateway ───
    console.log(`[SePay Create Order] Creating order: ${orderNumber}, amount: ${amount}`);

    const orderPayload = {
      order_code: orderNumber,
      amount: parseInt(amount),
      content: description || orderNumber,
      duration: 900, // 15 phút hết hạn
      with_qrcode: '1',
      qrcode_template: 'compact',
    };

    const orderRes = await fetch(`https://my.sepay.vn/userapi/bankaccounts/${bankAccountId}/orders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SEPAY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(orderPayload),
    });

    const orderResult = await orderRes.json();

    if (!orderRes.ok) {
      console.error('[SePay Create Order] SePay API error:', orderRes.status, JSON.stringify(orderResult));

      // Fallback: trả về QR code tĩnh
      return res.status(200).json({
        success: true,
        data: {
          orderNumber,
          amount,
          qrUrl: `https://qr.sepay.vn/img?bank=VietinBank&acc=${SEPAY_ACCOUNT}&template=compact&amount=${amount}&des=${orderNumber}`,
          method: 'static_qr',
          fallbackReason: orderResult.message || 'SePay API error',
        },
      });
    }

    console.log('[SePay Create Order] ✓ Order created on SePay:', JSON.stringify(orderResult));

    // ─── 3. Cập nhật Firestore với SePay order info ───
    try {
      const db = getAdminDb();
      const ordersQuery = db.collection('orders')
        .where('orderNumber', '==', orderNumber)
        .limit(1);
      const snapshot = await ordersQuery.get();
      if (!snapshot.empty) {
        const orderDoc = snapshot.docs[0];
        await orderDoc.ref.update({
          sepayOrderId: orderResult.id || orderResult.order_id || null,
          sepayVaNumber: orderResult.va_number || null,
          sepayQrUrl: orderResult.qr_code_url || null,
          sepayMethod: 'payment_gateway',
        });
      }
    } catch (dbErr) {
      console.warn('[SePay Create Order] DB update warning:', dbErr.message);
    }

    // ─── 4. Trả về thông tin QR ───
    return res.status(200).json({
      success: true,
      data: {
        orderNumber,
        amount,
        sepayOrderId: orderResult.id || orderResult.order_id,
        vaNumber: orderResult.va_number || null,
        qrUrl: orderResult.qr_code_url || `https://qr.sepay.vn/img?bank=VietinBank&acc=${SEPAY_ACCOUNT}&template=compact&amount=${amount}&des=${orderNumber}`,
        qrBase64: orderResult.qr_code || null,
        expiredAt: orderResult.expired_at || null,
        method: 'payment_gateway',
      },
    });

  } catch (error) {
    console.error('[SePay Create Order] Error:', error);

    // Fallback: QR code tĩnh
    return res.status(200).json({
      success: true,
      data: {
        orderNumber,
        amount,
        qrUrl: `https://qr.sepay.vn/img?bank=VietinBank&acc=${SEPAY_ACCOUNT}&template=compact&amount=${amount}&des=${orderNumber}`,
        method: 'static_qr',
        fallbackReason: error.message,
      },
    });
  }
};
