// ═══════════════════════════════════════════════════════════════════════════════
// SePay Order Status API (with SePay Transaction API fallback)
// GET /api/seapay/status?orderNumber=SN1234567
//
// Luồng:
// 1. Tìm đơn hàng trong Firestore
// 2. Nếu đã paid → trả về ngay
// 3. Nếu còn pending → chủ động check SePay Transaction API
//    → Nếu tìm thấy giao dịch khớp → cập nhật Firestore → trả về 'paid'
//    → Nếu không → trả về 'pending'
//
// Đây là cơ chế backup khi webhook SePay không gửi/bị chặn
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

/**
 * Kiểm tra SePay Transaction API để tìm giao dịch khớp với đơn hàng
 * @param {string} orderNumber - Mã đơn hàng (VD: SN1234567)
 * @param {number} orderTotal - Tổng tiền đơn hàng
 * @returns {Object|null} - Giao dịch khớp hoặc null
 */
async function checkSepayTransaction(orderNumber, orderTotal) {
  const SEPAY_API_TOKEN = process.env.SEPAY_API_TOKEN || process.env.SEPAY_API_KEY || '';
  const SEPAY_ACCOUNT = process.env.SEPAY_ACCOUNT_NUMBER || '';

  if (!SEPAY_API_TOKEN) {
    console.log('[SePay Status] No SEPAY_API_TOKEN configured, skipping SePay API check');
    return null;
  }

  try {
    // Thử SePay API v2 trước, fallback v1
    const baseUrl = 'https://my.sepay.vn/userapi/transactions/list';
    const params = new URLSearchParams({
      limit: '20',
      ...(SEPAY_ACCOUNT ? { account_number: SEPAY_ACCOUNT } : {}),
    });

    console.log(`[SePay Status] Checking SePay API for order: ${orderNumber}`);

    const response = await fetch(`${baseUrl}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SEPAY_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`[SePay Status] SePay API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const result = await response.json();
    const transactions = result.transactions || result.data || [];

    if (!Array.isArray(transactions) || transactions.length === 0) {
      console.log('[SePay Status] No transactions found in SePay API');
      return null;
    }

    // Tìm giao dịch có nội dung chứa mã đơn hàng
    const orderRegex = new RegExp(orderNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const match = transactions.find(tx => {
      const content = tx.transaction_content || tx.content || tx.description || '';
      const amount = tx.amount_in || tx.transferAmount || tx.amount || 0;
      const isIncoming = tx.transferType === 'in' || amount > 0;

      // Kiểm tra nội dung chuyển khoản chứa mã đơn
      if (!orderRegex.test(content)) return false;

      // Kiểm tra là tiền vào
      if (!isIncoming) return false;

      // Kiểm tra số tiền (cho phép sai lệch 1% hoặc 1000đ)
      if (orderTotal) {
        const absAmount = Math.abs(amount);
        const tolerance = Math.max(orderTotal * 0.01, 1000);
        if (Math.abs(absAmount - orderTotal) > tolerance) return false;
      }

      return true;
    });

    if (match) {
      console.log(`[SePay Status] ✓ Found matching transaction for ${orderNumber}: amount=${match.amount_in || match.amount}`);
    } else {
      console.log(`[SePay Status] No matching transaction for ${orderNumber} in ${transactions.length} results`);
    }

    return match || null;

  } catch (err) {
    console.error('[SePay Status] SePay API check failed:', err.message);
    return null;
  }
}

/**
 * Xử lý khi tìm thấy giao dịch khớp → cập nhật Firestore
 */
async function processPayment(db, orderDoc, orderData, transaction) {
  const batch = db.batch();

  const paidAmount = transaction.amount_in || transaction.transferAmount || transaction.amount || orderData.total;
  const referenceCode = transaction.reference_number || transaction.referenceCode || `sepay_api_${transaction.id || Date.now()}`;
  const transactionDate = transaction.transaction_date || new Date().toISOString();

  // Cập nhật đơn hàng → paid
  batch.update(orderDoc.ref, {
    paymentStatus: 'paid',
    paidAt: admin.firestore.FieldValue.serverTimestamp(),
    transactionId: referenceCode,
    paidAmount: Math.abs(paidAmount),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    verifiedBy: 'sepay_api_poll', // Đánh dấu được verify bởi API polling
  });

  // Tăng soldCount cho từng sản phẩm
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

  // Lưu payment record (chống trùng lặp)
  const paymentId = `api_verify_${referenceCode}`;
  const paymentRef = db.collection('payments').doc(paymentId);
  const existingPayment = await paymentRef.get();
  if (!existingPayment.exists) {
    batch.set(paymentRef, {
      sepayId: transaction.id || null,
      gateway: transaction.gateway || 'sepay_api',
      transactionDate,
      amount: Math.abs(paidAmount),
      content: transaction.transaction_content || transaction.content || '',
      referenceCode,
      orderNumber: orderData.orderNumber,
      orderId: orderDoc.id,
      status: 'matched',
      amountMatch: true,
      verifiedBy: 'sepay_api_poll',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  await batch.commit();
  console.log(`[SePay Status] ✓ Order ${orderData.orderNumber} verified & marked PAID via API polling`);

  // ── Gửi email xác nhận (non-blocking) ──
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
          emoji: item.emoji || '',
          downloadUrl,
        });
      }

      const baseUrl = 'https://thuviensonnhai.com';
      const emailPayload = {
        type: 'order_confirmation',
        to: orderData.customerEmail,
        data: {
          customerName: orderData.customerName || 'Quý khách',
          orderNumber: orderData.orderNumber,
          total: orderData.total || 0,
          paidAmount: Math.abs(paidAmount),
          paidAt: new Date().toISOString(),
          items: itemsWithDownload,
          downloadPageUrl: `${baseUrl}/thank-you.html?order=${orderData.orderNumber}`,
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
        console.log(`[SePay Status] Email trigger: ${r.status}`);
      }).catch(e => {
        console.error(`[SePay Status] Email trigger failed:`, e.message);
      });
    } catch (emailErr) {
      console.error('[SePay Status] Email prep error:', emailErr.message);
    }
  }

  return Math.abs(paidAmount);
}


module.exports = async (req, res) => {
  // CORS — cho phép frontend poll
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { orderNumber } = req.query;

  if (!orderNumber) {
    return res.status(400).json({ success: false, message: 'Missing orderNumber parameter' });
  }

  try {
    const db = getAdminDb();

    // ─── 1. Tìm đơn hàng trong Firestore ───
    const ordersQuery = db.collection('orders')
      .where('orderNumber', '==', orderNumber)
      .limit(1);
    const snapshot = await ordersQuery.get();

    if (snapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    const orderDoc = snapshot.docs[0];
    const orderData = orderDoc.data();

    // ─── 2. Nếu đã paid → trả về ngay ───
    if (orderData.paymentStatus === 'paid') {
      // Build download URLs from items
      const items = orderData.items || [];
      const itemsWithDownload = [];
      for (const item of items) {
        let downloadUrl = '';
        let slug = item.slug || '';

        // Nếu item không có slug, tìm trong Firestore product
        if (!slug && item.productId) {
          try {
            const pSnap = await db.collection('products').doc(item.productId).get();
            if (pSnap.exists) {
              const pData = pSnap.data();
              slug = pData.slug || '';
              downloadUrl = pData.downloadUrl || pData.fileUrl || '';
            }
          } catch (e) {}
        }

        // Fallback: tìm downloadUrl từ hardcoded map bằng slug
        if (!downloadUrl && slug) {
          downloadUrl = PRODUCT_DOWNLOAD_URLS[slug] || '';
        }

        // Last resort: tìm slug từ tên sản phẩm
        if (!downloadUrl && item.name) {
          const nameSlugMap = {
            'Logic Người Nghèo': 'logic-nguoi-ngheo',
            'Tư Duy Cường Giả': 'tu-duy-cuong-gia',
            'Thức Tỉnh Nhận Thức': 'thuc-tinh-nhan-thuc',
            'Ẩn Chứa Huyền Cơ': 'an-chua-huyen-co',
            'Hệ Thống Mạnh Mẽ': 'he-thong-manh-me',
            'Thương Chiến': 'thuong-chien',
            'Bản Chất Tài Chính': 'ban-chat-tai-chinh',
            'Tuyệt Mật Nhân Tính': 'tuyet-mat-nhan-tinh',
            'Góc Nhìn Tạo Lập': 'goc-nhin-tao-lap',
            'Tình Cảm Bí Tịch': 'tinh-cam-bi-tich',
            'Mưu Lược Tuổi Trẻ': 'muu-luoc-tuoi-tre',
            'Xuyên Thấu Nhân Tính': 'xuyen-thau-nhan-tinh',
            'Mưu Lược Tài Chính': 'muu-luoc-tai-chinh',
            'Nhân Tính Đen Trắng': 'nhan-tinh-den-trang',
            'Tư Duy Sâu Sắc': 'tu-duy-sau-sac',
          };
          for (const [nameKey, slugVal] of Object.entries(nameSlugMap)) {
            if (item.name.includes(nameKey) || item.name.toLowerCase().includes(nameKey.toLowerCase())) {
              slug = slugVal;
              downloadUrl = PRODUCT_DOWNLOAD_URLS[slugVal] || '';
              break;
            }
          }
        }

        itemsWithDownload.push({
          name: item.name,
          price: item.price,
          slug: slug,
          downloadUrl,
        });
      }

      return res.status(200).json({
        success: true,
        data: {
          orderNumber: orderData.orderNumber,
          paymentStatus: 'paid',
          total: orderData.total,
          paidAmount: orderData.paidAmount || null,
          paidAt: orderData.paidAt ? (orderData.paidAt.toDate ? orderData.paidAt.toDate().toISOString() : orderData.paidAt) : null,
          transactionId: orderData.transactionId || null,
          items: itemsWithDownload,
        },
      });
    }

    // ─── 3. Đơn hàng còn pending → chủ động check SePay API ───
    if (orderData.paymentStatus === 'pending') {
      console.log(`[SePay Status] Order ${orderNumber} is pending, checking SePay API...`);

      const matchedTx = await checkSepayTransaction(orderNumber, orderData.total);

      if (matchedTx) {
        // Tìm thấy giao dịch → cập nhật Firestore → trả về paid
        const paidAmount = await processPayment(db, orderDoc, orderData, matchedTx);

        const items = orderData.items || [];
        const itemsWithDownload = items.map(item => {
          let downloadUrl = '';
          if (item.slug) {
            downloadUrl = PRODUCT_DOWNLOAD_URLS[item.slug] || '';
          }
          return {
            name: item.name,
            price: item.price,
            slug: item.slug || '',
            downloadUrl,
          };
        });

        return res.status(200).json({
          success: true,
          data: {
            orderNumber: orderData.orderNumber,
            paymentStatus: 'paid',
            total: orderData.total,
            paidAmount,
            paidAt: new Date().toISOString(),
            transactionId: matchedTx.reference_number || matchedTx.referenceCode || null,
            items: itemsWithDownload,
            verifiedBy: 'sepay_api_poll',
          },
        });
      }
    }

    // ─── 4. Vẫn pending hoặc trạng thái khác ───
    return res.status(200).json({
      success: true,
      data: {
        orderNumber: orderData.orderNumber,
        paymentStatus: orderData.paymentStatus || 'pending',
        total: orderData.total,
        paidAmount: orderData.paidAmount || null,
        paidAt: orderData.paidAt ? (orderData.paidAt.toDate ? orderData.paidAt.toDate().toISOString() : orderData.paidAt) : null,
        transactionId: orderData.transactionId || null,
        items: (orderData.items || []).map(item => ({
          name: item.name,
          price: item.price,
          slug: item.slug || '',
        })),
      },
    });

  } catch (error) {
    console.error('[SePay Status] Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
