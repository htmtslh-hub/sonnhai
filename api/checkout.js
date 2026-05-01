const { mockData } = require('./lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, name, items, couponCode, paymentMethod } = req.body;

  if (!email || !name || !items || items.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Vui lòng điền đầy đủ thông tin và có ít nhất một sản phẩm'
    });
  }

  const orderId = 'ORD-' + Date.now();
  const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const order = {
    id: orderId,
    email,
    name,
    items,
    total,
    couponCode,
    paymentMethod: paymentMethod || 'stripe',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  mockData.orders.push(order);

  res.status(200).json({
    success: true,
    data: {
      orderId: orderId,
      total: total,
      email: email,
      downloadUrl: `/api/downloads/${orderId}`
    }
  });
};
