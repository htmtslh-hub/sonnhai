// ═══════════════════════════════════════════════════════════════════════════════
// Send OTP API — Gửi mã xác thực 6 số về Gmail
// POST /api/auth/send-otp
// ═══════════════════════════════════════════════════════════════════════════════

const { Resend } = require('resend');
const { getAdminDb, admin } = require('../firebase-admin');
const { otpEmail } = require('../email/templates');

const FROM_EMAIL = process.env.FROM_EMAIL || 'Thư viện Sơn Nhai <onboarding@resend.dev>';
const OTP_EXPIRY_MS = 2 * 60 * 1000; // 2 phút
const RATE_LIMIT_MS = 2 * 60 * 1000; // 2 phút giữa các lần gửi

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email } = req.body || {};

  // ─── Validate email ───
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập email' });
  }

  const trimmedEmail = email.trim().toLowerCase();

  if (!trimmedEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ success: false, error: 'Chỉ hỗ trợ đăng nhập bằng Gmail (@gmail.com)' });
  }

  const emailRegex = /^[^\s@]+@gmail\.com$/;
  if (!emailRegex.test(trimmedEmail)) {
    return res.status(400).json({ success: false, error: 'Email không hợp lệ' });
  }

  try {
    const db = getAdminDb();

    // ─── Rate limit: simple query chỉ dùng email (không cần composite index) ───
    try {
      const recentOtps = await db.collection('otp_codes')
        .where('email', '==', trimmedEmail)
        .where('used', '==', false)
        .limit(5)
        .get();

      if (!recentOtps.empty) {
        // Check manually if any OTP was sent within RATE_LIMIT_MS
        const now = Date.now();
        for (const doc of recentOtps.docs) {
          const data = doc.data();
          let sentAt;
          if (data.createdAt && data.createdAt.toDate) {
            sentAt = data.createdAt.toDate().getTime();
          } else if (data.createdAt) {
            sentAt = new Date(data.createdAt).getTime();
          } else {
            continue;
          }
          const waitMs = RATE_LIMIT_MS - (now - sentAt);
          if (waitMs > 0) {
            const waitSec = Math.ceil(waitMs / 1000);
            return res.status(429).json({
              success: false,
              error: `Vui lòng chờ ${waitSec} giây trước khi gửi lại mã`,
              retryAfter: waitSec,
            });
          }
        }
      }
    } catch (rateLimitErr) {
      // Nếu rate limit query lỗi (index chưa có), bỏ qua và cho phép gửi
      console.warn('[OTP] Rate limit check failed (OK for first run):', rateLimitErr.message);
    }

    // ─── Tạo OTP 6 số ───
    const code = String(Math.floor(100000 + Math.random() * 900000));
    const now = admin.firestore.Timestamp.now();
    const expiresAtDate = new Date(Date.now() + OTP_EXPIRY_MS);
    const expiresAt = admin.firestore.Timestamp.fromDate(expiresAtDate);

    // Lưu vào Firestore
    await db.collection('otp_codes').add({
      email: trimmedEmail,
      code,
      createdAt: now,
      expiresAt,
      used: false,
    });

    console.log(`[OTP] Created OTP for ${trimmedEmail}`);

    // ─── Gửi email qua Resend ───
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    if (!RESEND_API_KEY) {
      console.error('[OTP] RESEND_API_KEY not configured');
      return res.status(500).json({ success: false, error: 'Dịch vụ email chưa được cấu hình' });
    }

    const resend = new Resend(RESEND_API_KEY);
    const html = otpEmail({ code, email: trimmedEmail, expiryMinutes: 2 });

    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [trimmedEmail],
      subject: `Mã xác thực: ${code} — Thư viện Sơn Nhai`,
      html,
    });

    if (emailError) {
      console.error('[OTP] Resend error:', JSON.stringify(emailError));
      return res.status(500).json({ success: false, error: 'Không thể gửi email. Vui lòng thử lại.' });
    }

    console.log(`[OTP] ✓ Sent OTP to ${trimmedEmail} (resend id: ${emailResult?.id})`);

    return res.status(200).json({
      success: true,
      message: 'Mã xác thực đã được gửi đến email của bạn',
      expiresIn: OTP_EXPIRY_MS / 1000,
    });

  } catch (error) {
    console.error('[OTP] Error:', error.message, error.stack);
    return res.status(500).json({ success: false, error: 'Đã xảy ra lỗi: ' + error.message });
  }
};
