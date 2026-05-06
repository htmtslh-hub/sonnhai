// ═══════════════════════════════════════════════════════════════════════════════
// SePay Webhook Endpoint — Nhận thông báo giao dịch từ SePay
// POST /api/seapay/webhook
//
// Luồng:
// 1. SePay phát hiện giao dịch mới trên tài khoản ngân hàng
// 2. SePay POST webhook với thông tin giao dịch tới endpoint này
// 3. Endpoint parse nội dung chuyển khoản → tìm mã đơn hàng (SN...)
// 4. Cập nhật đơn hàng trong Firestore → paymentStatus = 'paid'
// 5. Tăng soldCount cho từng sản phẩm trong đơn
// 6. Lưu record vào collection payments
// ═══════════════════════════════════════════════════════════════════════════════

const { getAdminDb, admin } = require('../firebase-admin');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://sonnhai.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ─── 1. Xác thực API Key từ SePay ───
  const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';
  const authHeader = req.headers['authorization'] || '';

  if (SEPAY_API_KEY && authHeader !== `Apikey ${SEPAY_API_KEY}`) {
    console.error('[SePay Webhook] Unauthorized: invalid API key');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // ─── 2. Parse webhook data ───
  const data = req.body;
  if (!data || typeof data !== 'object') {
    return res.status(400).json({ success: false, message: 'No data' });
  }

  const {
    id: sepayId,
    gateway,
    transactionDate,
    accountNumber,
    subAccount,
    transferType,
    transferAmount,
    accumulated,
    code,
    content,
    referenceCode,
    description,
  } = data;

  console.log(`[SePay Webhook] Received: id=${sepayId}, type=${transferType}, amount=${transferAmount}, content="${content}"`);

  // Chỉ xử lý giao dịch tiền vào
  if (transferType !== 'in') {
    console.log('[SePay Webhook] Skipping: not an incoming transfer');
    return res.status(200).json({ success: true, message: 'Skipped: outgoing transfer' });
  }

  try {
    const db = getAdminDb();

    // ─── 3. Lưu giao dịch vào collection payments (chống trùng lặp) ───
    const paymentRef = db.collection('payments').doc(`sepay_${sepayId}`);
    const existingPayment = await paymentRef.get();

    if (existingPayment.exists) {
      console.log(`[SePay Webhook] Duplicate: sepay_${sepayId} already processed`);
      return res.status(200).json({ success: true, message: 'Duplicate transaction' });
    }

    // ─── 4. Tách mã đơn hàng từ nội dung chuyển khoản ───
    // Mã đơn hàng format: SN + 7 số (VD: SN1234567)
    const orderRegex = /SN(\d{5,})/i;
    const match = (content || '').match(orderRegex);

    if (!match) {
      // Thử tìm theo code field (SePay tự nhận diện)
      const codeMatch = (code || '').match(orderRegex);
      if (!codeMatch) {
        console.log(`[SePay Webhook] No order number found in content: "${content}"`);
        // Vẫn lưu giao dịch để admin review
        await paymentRef.set({
          sepayId,
          gateway: gateway || '',
          transactionDate: transactionDate || '',
          accountNumber: accountNumber || '',
          amount: transferAmount || 0,
          content: content || '',
          referenceCode: referenceCode || '',
          description: description || '',
          orderNumber: null,
          status: 'unmatched',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        return res.status(200).json({ success: true, message: 'No order number found' });
      }
    }

    const orderNumber = 'SN' + (match ? match[1] : '');

    // ─── 5. Tìm đơn hàng trong Firestore ───
    const ordersQuery = db.collection('orders').where('orderNumber', '==', orderNumber);
    const ordersSnapshot = await ordersQuery.get();

    if (ordersSnapshot.empty) {
      console.log(`[SePay Webhook] Order not found: ${orderNumber}`);
      await paymentRef.set({
        sepayId,
        gateway: gateway || '',
        transactionDate: transactionDate || '',
        accountNumber: accountNumber || '',
        amount: transferAmount || 0,
        content: content || '',
        referenceCode: referenceCode || '',
        orderNumber,
        status: 'order_not_found',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      return res.status(200).json({ success: true, message: `Order ${orderNumber} not found` });
    }

    const orderDoc = ordersSnapshot.docs[0];
    const orderData = orderDoc.data();

    // ─── 6. Kiểm tra đơn hàng chưa thanh toán và khớp số tiền ───
    if (orderData.paymentStatus === 'paid') {
      console.log(`[SePay Webhook] Order ${orderNumber} already paid`);
      return res.status(200).json({ success: true, message: 'Order already paid' });
    }

    const orderTotal = orderData.total || 0;
    const paidAmount = transferAmount || 0;

    // Cho phép sai lệch 1% hoặc 1000đ (do ngân hàng có thể thay đổi nhẹ)
    const tolerance = Math.max(orderTotal * 0.01, 1000);
    if (Math.abs(paidAmount - orderTotal) > tolerance) {
      console.warn(`[SePay Webhook] Amount mismatch: order ${orderTotal}, paid ${paidAmount}`);
      // Vẫn cập nhật nhưng đánh dấu amount_mismatch
    }

    // ─── 7. Cập nhật đơn hàng → paid ───
    const batch = db.batch();

    // Update order
    batch.update(orderDoc.ref, {
      paymentStatus: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      transactionId: referenceCode || `sepay_${sepayId}`,
      paidAmount: paidAmount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ─── 8. Tăng soldCount cho từng sản phẩm ───
    const items = orderData.items || [];
    for (const item of items) {
      if (item.productId) {
        const productRef = db.collection('products').doc(item.productId);
        const productSnap = await productRef.get();
        if (productSnap.exists) {
          batch.update(productRef, {
            soldCount: admin.firestore.FieldValue.increment(1),
          });
        }
      }
    }

    // ─── 9. Lưu payment record ───
    batch.set(paymentRef, {
      sepayId,
      gateway: gateway || '',
      transactionDate: transactionDate || '',
      accountNumber: accountNumber || '',
      amount: paidAmount,
      content: content || '',
      referenceCode: referenceCode || '',
      description: description || '',
      orderNumber,
      orderId: orderDoc.id,
      status: 'matched',
      amountMatch: Math.abs(paidAmount - orderTotal) <= tolerance,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ─── 10. Commit batch ───
    await batch.commit();

    console.log(`[SePay Webhook] ✓ Order ${orderNumber} marked as PAID (amount: ${paidAmount})`);

    // ─── 11. Gửi email xác nhận (non-blocking) ───
    if (orderData.customerEmail) {
      try {
        // Lấy download URLs cho từng sản phẩm
        const itemsWithDownload = [];
        for (const item of items) {
          let downloadUrl = '';
          if (item.productId) {
            const pSnap = await db.collection('products').doc(item.productId).get();
            if (pSnap.exists) {
              const pData = pSnap.data();
              downloadUrl = pData.downloadUrl || pData.fileUrl || '';
            }
          }
          itemsWithDownload.push({
            name: item.name || 'Sản phẩm',
            price: item.price || 0,
            emoji: item.emoji || '📦',
            downloadUrl,
          });
        }

        const baseUrl = req.headers['x-forwarded-host']
          ? `https://${req.headers['x-forwarded-host']}`
          : 'https://sonnhai.vercel.app';

        const emailPayload = {
          type: 'order_confirmation',
          to: orderData.customerEmail,
          data: {
            customerName: orderData.customerName || 'Quý khách',
            orderNumber,
            total: orderData.total || 0,
            paidAmount,
            paidAt: new Date().toISOString(),
            items: itemsWithDownload,
            downloadPageUrl: `${baseUrl}/thank-you.html?order=${orderNumber}`,
          },
        };

        // Fire-and-forget — không chờ response
        fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': process.env.INTERNAL_API_KEY || 'sonnhai-internal-2026',
          },
          body: JSON.stringify(emailPayload),
        }).then(r => {
          console.log(`[SePay Webhook] Email trigger: ${r.status}`);
        }).catch(e => {
          console.error(`[SePay Webhook] Email trigger failed:`, e.message);
        });

      } catch (emailErr) {
        // Không throw — email fail không ảnh hưởng webhook response
        console.error('[SePay Webhook] Email prep error:', emailErr.message);
      }
    }

    return res.status(200).json({ success: true, message: `Order ${orderNumber} paid successfully` });

  } catch (error) {
    console.error('[SePay Webhook] Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
