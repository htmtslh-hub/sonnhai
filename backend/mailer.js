const nodemailer = require('nodemailer');

// ─── TRANSPORTER ──────────────────────────────────────────────────────────────

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;

  _transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  return _transporter;
}

const FROM = process.env.EMAIL_FROM || 'Thư viện Sơn Nhai <no-reply@sonhai.vn>';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const APP_NAME = process.env.APP_NAME || 'Thư viện Sơn Nhai';

// ─── BASE TEMPLATE ────────────────────────────────────────────────────────────

function baseTemplate(content) {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${APP_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0F;padding:40px 20px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

      <!-- Header -->
      <tr><td style="background:#0F1117;border:1px solid #1E2433;border-radius:16px 16px 0 0;padding:32px 40px;text-align:center;">
        <div style="font-size:28px;font-weight:900;letter-spacing:2px;color:#00D4D4;">${APP_NAME.toUpperCase()}</div>
        <div style="font-size:13px;color:#6B7280;margin-top:4px;">Thư viện sách số hàng đầu Việt Nam</div>
      </td></tr>

      <!-- Body -->
      <tr><td style="background:#0F1117;border-left:1px solid #1E2433;border-right:1px solid #1E2433;padding:32px 40px;">
        ${content}
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:#0A0A0F;border:1px solid #1E2433;border-top:none;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;">
        <p style="color:#6B7280;font-size:12px;margin:0 0 8px;">
          © ${new Date().getFullYear()} ${APP_NAME}. Mọi quyền được bảo lưu.
        </p>
        <p style="color:#6B7280;font-size:12px;margin:0;">
          <a href="${APP_URL}" style="color:#00D4D4;text-decoration:none;">Truy cập website</a>
          &nbsp;·&nbsp;
          <a href="mailto:support@sonhai.vn" style="color:#00D4D4;text-decoration:none;">Liên hệ hỗ trợ</a>
        </p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── HELPER ───────────────────────────────────────────────────────────────────

function tealBtn(url, label) {
  return `<a href="${url}" style="display:inline-block;background:#00D4D4;color:#0A0A0F;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none;margin:8px 0;">${label}</a>`;
}

function formatVND(amount) {
  return amount.toLocaleString('vi-VN') + 'đ';
}

// ─── SEND WRAPPER ─────────────────────────────────────────────────────────────

async function send(to, subject, html) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.log(`📧 [EMAIL - không có SMTP] Tới: ${to} | Tiêu đề: ${subject}`);
    return;
  }
  try {
    await getTransporter().sendMail({ from: FROM, to, subject, html });
    console.log(`📧 [EMAIL] Đã gửi tới ${to}: ${subject}`);
  } catch (err) {
    console.error(`❌ [EMAIL] Lỗi gửi tới ${to}:`, err.message);
  }
}

// ─── EMAIL TEMPLATES ──────────────────────────────────────────────────────────

async function sendWelcome({ name, email }) {
  const html = baseTemplate(`
    <h2 style="color:#E8EAF0;font-size:22px;margin:0 0 16px;">Chào mừng bạn, ${name}! 🎉</h2>
    <p style="color:#8B93A8;font-size:15px;line-height:1.7;margin:0 0 20px;">
      Tài khoản của bạn tại <strong style="color:#00D4D4;">${APP_NAME}</strong> đã được tạo thành công.
      Bạn có thể bắt đầu khám phá hàng ngàn đầu sách số chất lượng cao.
    </p>
    <div style="text-align:center;margin:28px 0;">
      ${tealBtn(`${APP_URL}/categories.html`, '📚 Khám phá sách ngay')}
    </div>
    <p style="color:#6B7280;font-size:13px;margin:0;">
      Nếu bạn không tạo tài khoản này, hãy bỏ qua email này hoặc liên hệ hỗ trợ.
    </p>
  `);
  await send(email, `Chào mừng đến với ${APP_NAME}!`, html);
}

async function sendOrderConfirmation({ order, downloadTokens }) {
  const { orderNumber, customerName, customerEmail, subtotal, discount, total, paymentMethod } = order;

  const methodNames = { stripe: 'Thẻ tín dụng (Stripe)', vnpay: 'VNPay QR', momo: 'Ví MoMo' };

  const itemsHtml = downloadTokens.map(t => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #1E2433;">
        <div style="color:#E8EAF0;font-size:14px;font-weight:600;">${t.productEmoji || '📖'} ${t.productName}</div>
        <div style="color:#6B7280;font-size:12px;margin-top:4px;">Hết hạn: ${new Date(t.expiresAt).toLocaleDateString('vi-VN')} · Tối đa ${t.maxDownloads} lần tải</div>
      </td>
      <td style="padding:12px 0;border-bottom:1px solid #1E2433;text-align:right;vertical-align:top;">
        <a href="${APP_URL}/api/downloads/${t.token}" style="display:inline-block;background:#161B27;border:1px solid #00D4D4;color:#00D4D4;font-size:12px;font-weight:700;padding:6px 14px;border-radius:6px;text-decoration:none;">⬇ Tải xuống</a>
      </td>
    </tr>
  `).join('');

  const discountRow = discount > 0 ? `
    <tr>
      <td style="color:#8B93A8;font-size:14px;padding:4px 0;">Giảm giá:</td>
      <td style="color:#10B981;font-size:14px;text-align:right;">-${formatVND(discount)}</td>
    </tr>` : '';

  const html = baseTemplate(`
    <h2 style="color:#E8EAF0;font-size:22px;margin:0 0 8px;">✅ Đơn hàng đã được xác nhận!</h2>
    <p style="color:#8B93A8;font-size:14px;margin:0 0 24px;">Mã đơn: <strong style="color:#00D4D4;">${orderNumber}</strong></p>

    <p style="color:#8B93A8;font-size:15px;line-height:1.7;margin:0 0 24px;">
      Cảm ơn <strong style="color:#E8EAF0;">${customerName}</strong>! Thanh toán của bạn đã được xử lý thành công.
      Link tải file bên dưới sẽ hết hạn sau 30 ngày.
    </p>

    <!-- Download links -->
    <div style="background:#161B27;border:1px solid #1E2433;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <div style="color:#00D4D4;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">📥 File của bạn</div>
      <table width="100%" cellpadding="0" cellspacing="0">${itemsHtml}</table>
    </div>

    <!-- Order summary -->
    <div style="background:#161B27;border:1px solid #1E2433;border-radius:12px;padding:20px 24px;margin:0 0 24px;">
      <div style="color:#00D4D4;font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;">🧾 Tóm tắt đơn hàng</div>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="color:#8B93A8;font-size:14px;padding:4px 0;">Tạm tính:</td>
          <td style="color:#E8EAF0;font-size:14px;text-align:right;">${formatVND(subtotal)}</td>
        </tr>
        ${discountRow}
        <tr>
          <td style="color:#E8EAF0;font-size:15px;font-weight:700;padding:8px 0 0;border-top:1px solid #1E2433;">Tổng cộng:</td>
          <td style="color:#00D4D4;font-size:15px;font-weight:700;text-align:right;padding:8px 0 0;border-top:1px solid #1E2433;">${formatVND(total)}</td>
        </tr>
        <tr>
          <td style="color:#6B7280;font-size:13px;padding:8px 0 0;">Phương thức:</td>
          <td style="color:#6B7280;font-size:13px;text-align:right;padding:8px 0 0;">${methodNames[paymentMethod] || paymentMethod}</td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:0 0 16px;">
      ${tealBtn(`${APP_URL}/account.html`, '📂 Xem đơn hàng của tôi')}
    </div>
    <p style="color:#6B7280;font-size:13px;margin:0;text-align:center;">
      Cần hỗ trợ? Liên hệ <a href="mailto:support@sonhai.vn" style="color:#00D4D4;">support@sonhai.vn</a>
    </p>
  `);

  await send(customerEmail, `[${APP_NAME}] Xác nhận đơn hàng ${orderNumber}`, html);
}

async function sendNewsletterConfirmation({ email, name }) {
  const html = baseTemplate(`
    <h2 style="color:#E8EAF0;font-size:22px;margin:0 0 16px;">📬 Đăng ký nhận tin thành công!</h2>
    <p style="color:#8B93A8;font-size:15px;line-height:1.7;margin:0 0 20px;">
      ${name ? `Xin chào <strong style="color:#E8EAF0;">${name}</strong>! ` : ''}
      Bạn đã đăng ký nhận bản tin từ <strong style="color:#00D4D4;">${APP_NAME}</strong>.
      Chúng tôi sẽ thông báo cho bạn về sách mới, khuyến mãi và nội dung đặc biệt.
    </p>
    <div style="text-align:center;margin:28px 0;">
      ${tealBtn(`${APP_URL}/categories.html`, '📚 Xem sách mới nhất')}
    </div>
    <p style="color:#6B7280;font-size:13px;margin:0;text-align:center;">
      Muốn hủy đăng ký? <a href="${APP_URL}/api/newsletter/unsubscribe?email=${encodeURIComponent(email)}" style="color:#6B7280;">Nhấn vào đây</a>
    </p>
  `);
  await send(email, `Đã đăng ký nhận tin từ ${APP_NAME}`, html);
}

async function sendAdminNewOrder({ order, downloadTokens }) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_USER;
  if (!adminEmail) return;

  const { orderNumber, customerName, customerEmail, total, paymentMethod } = order;
  const methodNames = { stripe: 'Stripe', vnpay: 'VNPay', momo: 'MoMo' };
  const itemsList = downloadTokens.map(t => `• ${t.productName}`).join('<br>');

  const html = baseTemplate(`
    <h2 style="color:#E8EAF0;font-size:20px;margin:0 0 20px;">🛒 Đơn hàng mới: <span style="color:#00D4D4;">${orderNumber}</span></h2>
    <div style="background:#161B27;border:1px solid #1E2433;border-radius:12px;padding:20px 24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr><td style="color:#6B7280;font-size:14px;padding:6px 0;">Khách hàng:</td><td style="color:#E8EAF0;font-size:14px;text-align:right;">${customerName}</td></tr>
        <tr><td style="color:#6B7280;font-size:14px;padding:6px 0;">Email:</td><td style="color:#00D4D4;font-size:14px;text-align:right;">${customerEmail}</td></tr>
        <tr><td style="color:#6B7280;font-size:14px;padding:6px 0;">Sản phẩm:</td><td style="color:#E8EAF0;font-size:14px;text-align:right;">${itemsList}</td></tr>
        <tr><td style="color:#6B7280;font-size:14px;padding:6px 0;">Phương thức:</td><td style="color:#E8EAF0;font-size:14px;text-align:right;">${methodNames[paymentMethod] || paymentMethod}</td></tr>
        <tr><td style="color:#E8EAF0;font-size:15px;font-weight:700;padding:10px 0 0;border-top:1px solid #1E2433;">Tổng tiền:</td><td style="color:#00D4D4;font-size:15px;font-weight:700;text-align:right;padding:10px 0 0;border-top:1px solid #1E2433;">${formatVND(total)}</td></tr>
      </table>
    </div>
    <div style="text-align:center;margin:24px 0 0;">
      ${tealBtn(`${APP_URL}/admin.html`, '🔧 Mở Admin Panel')}
    </div>
  `);

  await send(adminEmail, `[Admin] Đơn hàng mới ${orderNumber} - ${formatVND(total)}`, html);
}

module.exports = { sendWelcome, sendOrderConfirmation, sendNewsletterConfirmation, sendAdminNewOrder };
