// ═══════════════════════════════════════════════════════════════════════════════
// SePay Config API — Trả về cấu hình ngân hàng cho frontend
// GET /api/seapay/config
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Trả về config ngân hàng từ environment variables
  // Frontend sử dụng để tạo QR code tĩnh (fallback)
  const bankAccount = process.env.SEPAY_ACCOUNT_NUMBER || '109887120806';
  const bankCode = process.env.SEPAY_BANK_CODE || 'VietinBank';
  const accountName = process.env.SEPAY_ACCOUNT_NAME || 'DINH VAN TRIEN';

  return res.status(200).json({
    success: true,
    data: {
      bankAccount,
      bankCode,
      accountName,
    },
  });
};
