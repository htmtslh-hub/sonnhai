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

  const { orderId, amount, email } = req.body;

  res.status(200).json({
    success: true,
    data: {
      paymentUrl: `https://seapay.vn/payment/${orderId}`,
      orderId,
      amount
    }
  });
};
