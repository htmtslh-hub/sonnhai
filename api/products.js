const { mockData } = require('./lib');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { category, status, search, page = 1, limit = 20, id } = req.query;

  // Get single product
  if (id) {
    const product = mockData.products.find(p => p.id === parseInt(id));
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    return res.status(200).json({ success: true, data: product });
  }

  let products = mockData.products.filter(p => p.status === 'published');

  if (category) {
    products = products.filter(p => p.category === category);
  }
  if (search) {
    const searchLower = search.toLowerCase();
    products = products.filter(p =>
      p.name.toLowerCase().includes(searchLower) ||
      (p.description && p.description.toLowerCase().includes(searchLower))
    );
  }

  const start = (parseInt(page) - 1) * parseInt(limit);
  const paginated = products.slice(start, start + parseInt(limit));

  res.status(200).json({
    success: true,
    data: paginated,
    total: products.length,
    page: parseInt(page),
    limit: parseInt(limit),
    pages: Math.ceil(products.length / parseInt(limit))
  });
};
