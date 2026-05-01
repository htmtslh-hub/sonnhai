const { mockData } = require('../lib');

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

  const { productId } = req.body;
  const cartId = req.headers['x-cart-id'] || 'guest-cart';

  if (!mockData.carts[cartId]) {
    return res.status(404).json({ success: false, error: 'Cart not found' });
  }

  mockData.carts[cartId].items = mockData.carts[cartId].items.filter(item => item.productId !== productId);
  mockData.carts[cartId].total = mockData.carts[cartId].items.reduce((sum, item) => {
    return sum + (item.price * item.quantity);
  }, 0);

  const cartCount = mockData.carts[cartId].items.reduce((sum, item) => sum + item.quantity, 0);

  res.status(200).json({
    success: true,
    data: mockData.carts[cartId],
    cartCount
  });
};
