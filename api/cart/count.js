const { mockData } = require('../lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const cartId = req.headers['x-cart-id'] || 'guest-cart';
  const cart = mockData.carts[cartId] || { items: [] };
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  res.status(200).json({ success: true, data: { count } });
};
