// ═══════════════════════════════════════════════════════════════════════════════
// Email Send API — Gửi email qua Resend
// POST /api/email/send
//
// Luồng:
// 1. Webhook SePay xác nhận thanh toán → gọi endpoint này
// 2. Render HTML template (tiếng Việt, dark theme)
// 3. Gửi qua Resend API
// 4. Lưu log vào Firestore emails/ collection
//
// Body: { type: "order_confirmation"|"welcome", data: {...} }
// Auth: X-Internal-Key header (chỉ nhận từ internal services)
// ═══════════════════════════════════════════════════════════════════════════════

const { Resend } = require('resend');
const { getAdminDb, admin } = require('../firebase-admin');
const { orderConfirmation, welcomeEmail } = require('./templates');

// Sender email — dùng onboarding@resend.dev khi chưa verify domain
const FROM_EMAIL = process.env.FROM_EMAIL || 'Thư viện Sơn Nhai <onboarding@resend.dev>';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || 'sonnhai-internal-2026';

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://sonnhai.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Internal-Key');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // ─── Auth: chỉ nhận request từ internal ───
  const internalKey = req.headers['x-internal-key'] || '';
  if (internalKey !== INTERNAL_KEY) {
    console.error('[Email] Unauthorized: invalid internal key');
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  // ─── Parse request ───
  const { type, data, to } = req.body;

  if (!type || !data || !to) {
    return res.status(400).json({ success: false, message: 'Missing type, data, or to' });
  }

  // ─── Render template ───
  let html = '';
  let subject = '';

  switch (type) {
    case 'order_confirmation':
      subject = ` Xác nhận đơn hàng ${data.orderNumber || ''} — Thư viện Sơn Nhai`;
      html = orderConfirmation(data);
      break;

    case 'welcome':
      subject = ` Chào mừng đến với Thư viện Sơn Nhai!`;
      html = welcomeEmail(data);
      break;

    default:
      return res.status(400).json({ success: false, message: `Unknown email type: ${type}` });
  }

  // ─── Gửi email qua Resend ───
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  if (!RESEND_API_KEY) {
    console.error('[Email] RESEND_API_KEY not configured');
    return res.status(500).json({ success: false, message: 'Email service not configured' });
  }

  const resend = new Resend(RESEND_API_KEY);

  try {
    const { data: emailResult, error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });

    if (emailError) {
      console.error('[Email] Resend error:', emailError);

      // Log failed email
      await logEmail(type, to, subject, 'failed', emailError.message, data);

      return res.status(500).json({ success: false, message: emailError.message });
    }

    console.log(`[Email] ✓ Sent ${type} to ${to} (id: ${emailResult?.id})`);

    // Log successful email
    await logEmail(type, to, subject, 'sent', emailResult?.id, data);

    return res.status(200).json({
      success: true,
      message: 'Email sent',
      emailId: emailResult?.id,
    });

  } catch (error) {
    console.error('[Email] Error:', error);

    // Log error
    await logEmail(type, to, subject, 'error', error.message, data);

    return res.status(500).json({ success: false, message: 'Failed to send email' });
  }
};


/**
 * Lưu log email vào Firestore
 */
async function logEmail(type, to, subject, status, detail, orderData) {
  try {
    const db = getAdminDb();
    await db.collection('emails').add({
      type,
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      status,     // 'sent' | 'failed' | 'error'
      detail,     // emailId hoặc error message
      orderNumber: orderData?.orderNumber || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (e) {
    console.error('[Email] Failed to log email:', e.message);
  }
}
