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

  const { productId, quantity = 1 } = req.body;
  const cartId = req.headers['x-cart-id'] || 'guest-cart';

  if (!mockData.carts[cartId]) {
    mockData.carts[cartId] = { items: [], total: 0, createdAt: new Date().toISOString() };
  }

  const product = mockData.products.find(p => p.id === productId);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }

  const existingItem = mockData.carts[cartId].items.find(item => item.productId === productId);
  if (existingItem) {
    existingItem.quantity += quantity;
  } else {
    mockData.carts[cartId].items.push({
      productId,
      name: product.name,
      price: product.price,
      quantity,
      icon: product.icon,
      image: product.image
    });
  }

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
