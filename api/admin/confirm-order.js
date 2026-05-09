// ═══════════════════════════════════════════════════════════════════════════════
// Admin: Xác nhận thanh toán đơn hàng (1 click)
// POST /api/admin/confirm-order
// Body: { orderNumber: "SN669040009" }
//
// Khi SePay không thể tự động xác nhận (do VietinBank API Banking lỗi),
// admin có thể xác nhận thủ công qua API này.
// Hệ thống sẽ tự động: cập nhật Firestore → gửi email → gửi link tải
// ═══════════════════════════════════════════════════════════════════════════════

const { getAdminDb, admin } = require('../firebase-admin');

// ── Hardcoded product download URLs (Google Drive) ──
const PRODUCT_DOWNLOAD_URLS = {
  'logic-nguoi-ngheo': 'https://drive.google.com/open?id=1lCrwErlcw9B16q51sVXidZFfbWiVR2jO',
  'tu-duy-cuong-gia': 'https://drive.google.com/open?id=16Nc0sa1EU7bKfFuHKs8uG2MISgK96flQ',
  'thuc-tinh-nhan-thuc': 'https://drive.google.com/open?id=1gm1DtXqcT9FyXu121tgYOYPAnsH5685_',
  'an-chua-huyen-co': 'https://drive.google.com/open?id=17hGSh6nh-q43kp-zNEKsnBHwnGZMXBSc',
  'he-thong-manh-me': 'https://drive.google.com/open?id=169PSlPHK7opXz9aeFa1cOgbFN0uqEDj_',
  'thuong-chien': 'https://drive.google.com/open?id=1M9Zza13SSj3Vh69leFwcQdwouL_HFDhA',
  'ban-chat-tai-chinh': 'https://drive.google.com/open?id=1FQXBL4kXab066F_6HAMZNHv8ANNESc7D',
  'tuyet-mat-nhan-tinh': 'https://drive.google.com/open?id=1sQ4pq6ODYhCJJOZJA-rDLsShGXJ2oKxB',
  'goc-nhin-tao-lap': 'https://drive.google.com/open?id=1nnS08CuPIMpEwZH-cSPHCXf1tm2ons4D',
  'tinh-cam-bi-tich': 'https://drive.google.com/open?id=1MdF85FZPcKpcr_w1-kxXyxAIo1FXkM9W',
  'muu-luoc-tuoi-tre': 'https://drive.google.com/open?id=100bycp2pms-yq-N2r1hJfIpnpyRFvnj7',
  'xuyen-thau-nhan-tinh': 'https://drive.google.com/open?id=10a8hLB38hyTqvNTUHFGvwJXg0v9bg10g',
  'muu-luoc-tai-chinh': 'https://drive.google.com/open?id=1vd274ipspAjxjKDwMFaC9nQNYv9Lmbf8',
  'nhan-tinh-den-trang': 'https://drive.google.com/open?id=1rY3S41OljfXGTQy1D1eATInOx2JN8uIo',
  'tu-duy-sau-sac': 'https://drive.google.com/open?id=15Rmta6sip9K2KV9mm5WhCXyTDQS5GAPf',
};

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { orderNumber } = req.body || {};

  if (!orderNumber) {
    return res.status(400).json({ success: false, message: 'Missing orderNumber' });
  }

  try {
    const db = getAdminDb();

    // ─── 1. Tìm đơn hàng ───
    const ordersQuery = db.collection('orders').where('orderNumber', '==', orderNumber).limit(1);
    const snapshot = await ordersQuery.get();

    if (snapshot.empty) {
      return res.status(404).json({ success: false, message: `Order ${orderNumber} not found` });
    }

    const orderDoc = snapshot.docs[0];
    const orderData = orderDoc.data();

    // Nếu đã paid → trả về luôn
    if (orderData.paymentStatus === 'paid') {
      return res.status(200).json({
        success: true,
        message: `Order ${orderNumber} already paid`,
        status: 'paid',
      });
    }

    // ─── 2. Cập nhật đơn hàng → paid ───
    const batch = db.batch();

    batch.update(orderDoc.ref, {
      paymentStatus: 'paid',
      paidAt: admin.firestore.FieldValue.serverTimestamp(),
      transactionId: `admin_confirm_${Date.now()}`,
      paidAmount: orderData.total || 0,
      confirmedBy: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // ─── 3. Tăng soldCount cho từng sản phẩm ───
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

    // ─── 4. Lưu payment record ───
    const paymentRef = db.collection('payments').doc(`admin_${orderNumber}`);
    batch.set(paymentRef, {
      source: 'admin_confirm',
      amount: orderData.total || 0,
      orderNumber,
      orderId: orderDoc.id,
      status: 'matched',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    console.log(`[Admin Confirm] ✓ Order ${orderNumber} marked as PAID`);

    // ─── 5. Gửi email xác nhận (non-blocking) ───
    if (orderData.customerEmail) {
      try {
        const itemsWithDownload = [];
        for (const item of items) {
          let downloadUrl = '';
          if (item.productId) {
            const pSnap = await db.collection('products').doc(item.productId).get();
            if (pSnap.exists) {
              const pData = pSnap.data();
              downloadUrl = pData.downloadUrl || pData.fileUrl || '';
              if (!downloadUrl && pData.slug) {
                downloadUrl = PRODUCT_DOWNLOAD_URLS[pData.slug] || '';
              }
            }
          }
          if (!downloadUrl && item.slug) {
            downloadUrl = PRODUCT_DOWNLOAD_URLS[item.slug] || '';
          }
          itemsWithDownload.push({
            name: item.name || 'Sản phẩm',
            price: item.price || 0,
            emoji: item.emoji || '📦',
            downloadUrl,
          });
        }

        const baseUrl = 'https://sonnhai.vercel.app';
        const emailPayload = {
          type: 'order_confirmation',
          to: orderData.customerEmail,
          data: {
            customerName: orderData.customerName || 'Quý khách',
            orderNumber,
            total: orderData.total || 0,
            paidAmount: orderData.total || 0,
            paidAt: new Date().toISOString(),
            items: itemsWithDownload,
            downloadPageUrl: `${baseUrl}/thank-you.html?order=${orderNumber}`,
          },
        };

        fetch(`${baseUrl}/api/email/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Key': process.env.INTERNAL_API_KEY || 'sonnhai-internal-2026',
          },
          body: JSON.stringify(emailPayload),
        }).then(r => {
          console.log(`[Admin Confirm] Email trigger: ${r.status}`);
        }).catch(e => {
          console.error(`[Admin Confirm] Email trigger failed:`, e.message);
        });

      } catch (emailErr) {
        console.error('[Admin Confirm] Email prep error:', emailErr.message);
      }
    }

    return res.status(200).json({
      success: true,
      message: `Order ${orderNumber} confirmed and marked as paid`,
      status: 'paid',
      orderNumber,
    });

  } catch (error) {
    console.error('[Admin Confirm] Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
