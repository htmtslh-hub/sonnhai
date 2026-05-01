const express = require('express');
const router = express.Router();
const { validateCouponRecord } = require('./checkout');

// ─── POST /api/coupons/validate ───────────────────────────────────────────────

router.post('/validate', (req, res) => {
  const { code, subtotal } = req.body;

  if (!code || !code.trim()) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập mã giảm giá.' });
  }
  if (!subtotal || isNaN(subtotal) || parseInt(subtotal) <= 0) {
    return res.status(400).json({ success: false, error: 'Giá trị đơn hàng không hợp lệ.' });
  }

  const result = validateCouponRecord(code.trim().toUpperCase(), parseInt(subtotal));

  if (!result.valid) {
    return res.status(400).json({ success: false, error: result.error });
  }

  res.json({
    success: true,
    data: {
      valid: true,
      couponId: result.coupon.id,
      code: result.coupon.code,
      type: result.coupon.type,
      value: result.coupon.value,
      discount: result.discount,
      finalTotal: result.finalTotal,
      message: result.coupon.type === 'percent'
        ? `Giảm ${result.coupon.value}% — tiết kiệm ${result.discount.toLocaleString('vi-VN')}đ`
        : `Giảm ${result.discount.toLocaleString('vi-VN')}đ`,
    },
  });
});

module.exports = router;
