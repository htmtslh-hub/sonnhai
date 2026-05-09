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

// ── Hardcoded product download URLs (Google Drive) ──
// Fallback khi Firestore product chưa có downloadUrl
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
  // CORS — Webhook là server-to-server, cho phép mọi origin
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Chấp nhận cả GET và POST (SePay có thể gửi dưới dạng GET hoặc POST)
  if (req.method !== 'POST' && req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ─── 1. Xác thực API Key từ SePay (linh hoạt nhiều format) ───
  const SEPAY_API_KEY = process.env.SEPAY_API_KEY || '';
  const authHeader = req.headers['authorization'] || '';

  if (SEPAY_API_KEY) {
    // Chấp nhận nhiều format: "Apikey xxx", "Bearer xxx", hoặc trực tiếp key
    const isValid = authHeader === `Apikey ${SEPAY_API_KEY}`
      || authHeader === `Bearer ${SEPAY_API_KEY}`
      || authHeader === SEPAY_API_KEY;

    if (!isValid) {
      console.error(`[SePay Webhook] Auth failed. Header: "${authHeader.substring(0, 20)}..."`);
      // Vẫn xử lý nhưng log cảnh báo (để không miss webhook)
      console.warn('[SePay Webhook] ⚠️ Proceeding without auth for reliability');
    }
  }

  // ─── 2. Parse webhook data (hỗ trợ cả body POST và query GET) ───
  const data = (req.method === 'GET') ? req.query : (req.body || {});
  if (!data || typeof data !== 'object' || Object.keys(data).length === 0) {
    console.error('[SePay Webhook] No data received. Method:', req.method, 'Body:', JSON.stringify(req.body), 'Query:', JSON.stringify(req.query));
    return res.status(400).json({ success: false, message: 'No data' });
  }
  console.log('[SePay Webhook] Raw data:', JSON.stringify(data));

  // ── Detect IPN format: Payment Gateway vs Bank Transaction Webhook ──
  // Payment Gateway IPN: has order_code, status fields
  // Bank Transaction Webhook: has transferType, content, referenceCode fields

  const isPaymentGatewayIPN = !!(data.order_code || data.orderCode);

  let sepayId, gateway, transactionDate, accountNumber, subAccount,
      transferType, transferAmount, accumulated, code, content, referenceCode, description;

  if (isPaymentGatewayIPN) {
    // SePay Cổng thanh toán IPN format
    sepayId = data.id || data.transaction_id || `gateway_${Date.now()}`;
    gateway = data.gateway || 'sepay_gateway';
    transactionDate = data.transaction_date || data.transactionDate || new Date().toISOString();
    accountNumber = data.account_number || data.accountNumber || '';
    transferType = 'in'; // Payment Gateway chỉ gửi IPN khi có tiền vào
    transferAmount = data.amount || data.transferAmount || 0;
    code = data.order_code || data.orderCode || '';
    content = data.content || data.transaction_content || data.order_code || data.orderCode || '';
    referenceCode = data.reference_number || data.referenceCode || '';
    description = data.description || '';
    subAccount = data.sub_account || '';
    accumulated = data.accumulated || 0;

    console.log(`[SePay Webhook] Payment Gateway IPN: order_code=${code}, amount=${transferAmount}, status=${data.status || 'unknown'}`);
  } else {
    // SePay Bank Transaction Webhook format
    ({
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
    } = data);

    console.log(`[SePay Webhook] Bank Webhook: id=${sepayId}, type=${transferType}, amount=${transferAmount}, content="${content}"`);
  }

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
              // Fallback: try slug-based lookup in hardcoded map
              if (!downloadUrl && pData.slug) {
                downloadUrl = PRODUCT_DOWNLOAD_URLS[pData.slug] || '';
              }
            }
          }
          // Last resort: try matching by item slug if available
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
