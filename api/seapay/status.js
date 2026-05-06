// ═══════════════════════════════════════════════════════════════════════════════
// SePay Order Status API
// GET /api/seapay/status?orderNumber=SN1234567
//
// Frontend dùng endpoint này để kiểm tra trạng thái đơn hàng
// khi không thể dùng Firestore client SDK trực tiếp
// ═══════════════════════════════════════════════════════════════════════════════

const { getAdminDb } = require('../firebase-admin');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://sonnhai.vercel.app');
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

    // Tìm đơn hàng theo orderNumber
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

    // Trả về thông tin cơ bản (không trả hết data nhạy cảm)
    return res.status(200).json({
      success: true,
      data: {
        orderNumber: orderData.orderNumber,
        paymentStatus: orderData.paymentStatus || 'pending',
        total: orderData.total,
        paidAmount: orderData.paidAmount || null,
        paidAt: orderData.paidAt ? orderData.paidAt.toDate().toISOString() : null,
        transactionId: orderData.transactionId || null,
        items: (orderData.items || []).map(item => ({
          name: item.name,
          price: item.price,
        })),
      },
    });

  } catch (error) {
    console.error('[SePay Status] Error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};
