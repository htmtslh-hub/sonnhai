// ═══════════════════════════════════════════════════════════════════════════════
// Email Templates — HTML templates cho Thư viện Sơn Nhai
// Thiết kế: Dark theme, teal accent (#00D4D4), tiếng Việt
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Email xác nhận đơn hàng + link tải sản phẩm
 * @param {Object} data - Order data
 * @param {string} data.customerName
 * @param {string} data.orderNumber
 * @param {number} data.total
 * @param {number} data.paidAmount
 * @param {string} data.paidAt
 * @param {Array}  data.items - [{name, price, emoji, downloadUrl}]
 * @param {string} data.downloadPageUrl - URL trang tải sản phẩm
 */
function orderConfirmation(data) {
  const {
    customerName = 'Quý khách',
    orderNumber = '',
    total = 0,
    paidAmount = 0,
    paidAt = '',
    items = [],
    downloadPageUrl = '',
  } = data;

  const formatVND = (n) => new Intl.NumberFormat('vi-VN').format(n) + 'đ';
  const paidDate = paidAt ? new Date(paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }) : '';

  // Render danh sách sản phẩm
  const itemRows = items.map(item => `
    <tr>
      <td style="padding:12px 16px;border-bottom:1px solid #1C2232;font-size:14px;color:#DDE1EC;">
        <span style="font-size:18px;margin-right:8px;">${item.emoji || ''}</span>
        ${item.name || 'Sản phẩm'}
      </td>
      <td style="padding:12px 16px;border-bottom:1px solid #1C2232;font-size:14px;color:#00D4D4;text-align:right;font-weight:600;">
        ${formatVND(item.price || 0)}
      </td>
    </tr>
  `).join('');

  // Render download links
  const downloadSection = items.some(i => i.downloadUrl) ? `
    <div style="margin-top:28px;padding:24px;background:#12161F;border:1px solid #1C2232;border-radius:12px;">
      <h3 style="margin:0 0 16px;font-size:16px;color:#00D4D4;font-weight:700;">
         Tải sản phẩm
      </h3>
      ${items.filter(i => i.downloadUrl).map(item => `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 0;border-bottom:1px solid #1C2232;">
          <span style="font-size:14px;color:#DDE1EC;">
            ${item.emoji || ''} ${item.name || 'Sản phẩm'}
          </span>
          <a href="${item.downloadUrl}" style="display:inline-block;padding:8px 18px;background:#00D4D4;color:#08090E;font-size:13px;font-weight:700;text-decoration:none;border-radius:6px;">
            Tải xuống
          </a>
        </div>
      `).join('')}
      <p style="margin:16px 0 0;font-size:12px;color:#555F75;line-height:1.6;">
         Link tải có hiệu lực trong 7 ngày. Nếu gặp vấn đề, vui lòng liên hệ hỗ trợ.
      </p>
    </div>
  ` : '';

  // Download page button
  const downloadPageButton = downloadPageUrl ? `
    <div style="text-align:center;margin-top:24px;">
      <a href="${downloadPageUrl}" style="display:inline-block;padding:14px 36px;background:#00D4D4;color:#08090E;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;letter-spacing:0.5px;">
         Trang tải sản phẩm
      </a>
      <p style="margin-top:10px;font-size:12px;color:#555F75;">
        Hoặc truy cập: <a href="${downloadPageUrl}" style="color:#00AEAE;">${downloadPageUrl}</a>
      </p>
    </div>
  ` : '';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Xác nhận đơn hàng ${orderNumber}</title>
</head>
<body style="margin:0;padding:0;background:#08090E;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 20px;background:linear-gradient(135deg,#0D1018 0%,#12161F 100%);border:1px solid #1C2232;border-radius:16px 16px 0 0;">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#00D4D4;border-radius:12px;font-size:18px;font-weight:900;color:#08090E;text-align:center;font-family:'Segoe UI',sans-serif;">SN</div>
      <h1 style="margin:16px 0 0;font-size:22px;color:#DDE1EC;font-weight:700;">Thư viện Sơn Nhai</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#8B93A8;">Sản phẩm số chất lượng cao</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;background:#0D1018;border-left:1px solid #1C2232;border-right:1px solid #1C2232;">

      <!-- Success Icon -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:rgba(16,185,129,0.15);border-radius:50%;font-size:28px;text-align:center;"></div>
        <h2 style="margin:16px 0 4px;font-size:20px;color:#10B981;font-weight:700;">Thanh toán thành công!</h2>
        <p style="margin:0;font-size:14px;color:#8B93A8;">Cảm ơn bạn đã mua hàng tại Thư viện Sơn Nhai</p>
      </div>

      <!-- Greeting -->
      <p style="font-size:15px;color:#DDE1EC;line-height:1.6;margin-bottom:24px;">
        Xin chào <strong style="color:#00D4D4;">${customerName}</strong>,<br>
        Đơn hàng <strong style="color:#00D4D4;">${orderNumber}</strong> đã được thanh toán thành công. Dưới đây là chi tiết đơn hàng của bạn:
      </p>

      <!-- Order Details -->
      <div style="background:#12161F;border:1px solid #1C2232;border-radius:12px;overflow:hidden;">
        <div style="padding:14px 16px;background:#171C27;border-bottom:1px solid #1C2232;">
          <span style="font-size:13px;font-weight:700;color:#8B93A8;letter-spacing:1px;text-transform:uppercase;">Chi tiết đơn hàng</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${itemRows}
        </table>
        <div style="padding:14px 16px;border-top:1px solid #252D3F;display:flex;justify-content:space-between;">
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:6px 16px;font-size:14px;color:#8B93A8;">Tổng thanh toán:</td>
              <td style="padding:6px 16px;font-size:18px;color:#00D4D4;font-weight:700;text-align:right;">${formatVND(paidAmount || total)}</td>
            </tr>
            <tr>
              <td style="padding:6px 16px;font-size:12px;color:#555F75;">Mã đơn hàng:</td>
              <td style="padding:6px 16px;font-size:12px;color:#8B93A8;text-align:right;font-family:monospace;">${orderNumber}</td>
            </tr>
            ${paidDate ? `
            <tr>
              <td style="padding:6px 16px;font-size:12px;color:#555F75;">Thanh toán lúc:</td>
              <td style="padding:6px 16px;font-size:12px;color:#8B93A8;text-align:right;">${paidDate}</td>
            </tr>
            ` : ''}
          </table>
        </div>
      </div>

      <!-- Download Section -->
      ${downloadSection}

      <!-- Download Page Button -->
      ${downloadPageButton}

    </div>

    <!-- Footer -->
    <div style="padding:24px 28px;background:#0A0B10;border:1px solid #1C2232;border-radius:0 0 16px 16px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#555F75;">
        Cần hỗ trợ? Truy cập <a href="https://sonnhai.vercel.app/support" style="color:#00AEAE;text-decoration:none;">trang hỗ trợ</a>
      </p>
      <p style="margin:0;font-size:11px;color:#3A4255;">
        © ${new Date().getFullYear()} Thư viện Sơn Nhai. Email này được gửi tự động, vui lòng không trả lời.
      </p>
    </div>

  </div>
</body>
</html>`;
}


/**
 * Email chào mừng user mới đăng ký
 * @param {Object} data
 * @param {string} data.name
 * @param {string} data.email
 */
function welcomeEmail(data) {
  const { name = 'bạn' } = data;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chào mừng đến với Thư viện Sơn Nhai</title>
</head>
<body style="margin:0;padding:0;background:#08090E;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 20px;background:linear-gradient(135deg,#0D1018 0%,#12161F 100%);border:1px solid #1C2232;border-radius:16px 16px 0 0;">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#00D4D4;border-radius:12px;font-size:18px;font-weight:900;color:#08090E;text-align:center;">SN</div>
      <h1 style="margin:16px 0 0;font-size:22px;color:#DDE1EC;font-weight:700;">Thư viện Sơn Nhai</h1>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;background:#0D1018;border-left:1px solid #1C2232;border-right:1px solid #1C2232;">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:rgba(0,212,212,0.15);border-radius:50%;font-size:28px;"></div>
        <h2 style="margin:16px 0 4px;font-size:20px;color:#00D4D4;font-weight:700;">Chào mừng ${name}!</h2>
        <p style="margin:0;font-size:14px;color:#8B93A8;">Cảm ơn bạn đã tham gia Thư viện Sơn Nhai</p>
      </div>

      <p style="font-size:15px;color:#DDE1EC;line-height:1.7;">
        Bạn đã đăng ký tài khoản thành công. Giờ đây bạn có thể:
      </p>
      <ul style="padding-left:20px;margin:16px 0;">
        <li style="font-size:14px;color:#DDE1EC;line-height:2;"> Khám phá sách và tài liệu chất lượng cao</li>
        <li style="font-size:14px;color:#DDE1EC;line-height:2;"> Thanh toán nhanh qua chuyển khoản ngân hàng</li>
        <li style="font-size:14px;color:#DDE1EC;line-height:2;"> Tải sản phẩm ngay sau khi thanh toán</li>
        <li style="font-size:14px;color:#DDE1EC;line-height:2;"> Theo dõi lịch sử đơn hàng</li>
      </ul>

      <div style="text-align:center;margin-top:28px;">
        <a href="https://sonnhai.vercel.app" style="display:inline-block;padding:14px 36px;background:#00D4D4;color:#08090E;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">
          Khám phá ngay  - 
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="padding:24px 28px;background:#0A0B10;border:1px solid #1C2232;border-radius:0 0 16px 16px;text-align:center;">
      <p style="margin:0;font-size:11px;color:#3A4255;">
        © ${new Date().getFullYear()} Thư viện Sơn Nhai. Email này được gửi tự động.
      </p>
    </div>

  </div>
</body>
</html>`;
}

/**
 * Email mã xác thực OTP
 * @param {Object} data
 * @param {string} data.code - Mã OTP 6 số
 * @param {string} data.email
 * @param {number} data.expiryMinutes - Số phút hết hạn
 */
function otpEmail(data) {
  const { code = '000000', email = '', expiryMinutes = 2 } = data;

  // Tách mã thành từng số để hiển thị đẹp
  const codeDigits = code.split('').map(d => `
    <td style="width:48px;height:56px;background:#12161F;border:2px solid #00D4D4;border-radius:12px;text-align:center;font-family:'Segoe UI',Roboto,monospace;font-size:28px;font-weight:900;color:#00D4D4;letter-spacing:2px;">
      ${d}
    </td>
  `).join('<td style="width:8px;"></td>');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Mã xác thực — Thư viện Sơn Nhai</title>
</head>
<body style="margin:0;padding:0;background:#08090E;font-family:'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:20px;">

    <!-- Header -->
    <div style="text-align:center;padding:32px 20px;background:linear-gradient(135deg,#0D1018 0%,#12161F 100%);border:1px solid #1C2232;border-radius:16px 16px 0 0;">
      <div style="display:inline-block;width:48px;height:48px;line-height:48px;background:#00D4D4;border-radius:12px;font-size:18px;font-weight:900;color:#08090E;text-align:center;font-family:'Segoe UI',sans-serif;">SN</div>
      <h1 style="margin:16px 0 0;font-size:22px;color:#DDE1EC;font-weight:700;">Thư viện Sơn Nhai</h1>
      <p style="margin:8px 0 0;font-size:13px;color:#8B93A8;">Xác thực đăng nhập</p>
    </div>

    <!-- Body -->
    <div style="padding:32px 28px;background:#0D1018;border-left:1px solid #1C2232;border-right:1px solid #1C2232;">

      <!-- Lock Icon -->
      <div style="text-align:center;margin-bottom:24px;">
        <div style="display:inline-block;width:64px;height:64px;line-height:64px;background:rgba(0,212,212,0.15);border-radius:50%;font-size:28px;text-align:center;"></div>
        <h2 style="margin:16px 0 4px;font-size:20px;color:#00D4D4;font-weight:700;">Mã xác thực của bạn</h2>
        <p style="margin:0;font-size:14px;color:#8B93A8;">Nhập mã bên dưới để đăng nhập</p>
      </div>

      <!-- OTP Code -->
      <div style="text-align:center;margin:28px 0;">
        <table style="margin:0 auto;border-collapse:separate;border-spacing:0;">
          <tr>${codeDigits}</tr>
        </table>
      </div>

      <!-- Info -->
      <div style="background:#12161F;border:1px solid #1C2232;border-radius:12px;padding:18px 22px;margin:24px 0;">
        <p style="margin:0 0 10px;font-size:13px;color:#DDE1EC;">
           Mã được gửi đến: <strong style="color:#00D4D4;">${email}</strong>
        </p>
        <p style="margin:0 0 10px;font-size:13px;color:#DDE1EC;">
          ⏱ Mã có hiệu lực trong <strong style="color:#F5A623;">${expiryMinutes} phút</strong>
        </p>
        <p style="margin:0;font-size:13px;color:#DDE1EC;">
           Không chia sẻ mã này với bất kỳ ai
        </p>
      </div>

      <!-- Warning -->
      <p style="font-size:12px;color:#555F75;text-align:center;line-height:1.6;margin-top:20px;">
        Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email này.<br>
        Tài khoản của bạn vẫn an toàn.
      </p>

    </div>

    <!-- Footer -->
    <div style="padding:24px 28px;background:#0A0B10;border:1px solid #1C2232;border-radius:0 0 16px 16px;text-align:center;">
      <p style="margin:0 0 8px;font-size:13px;color:#555F75;">
        Cần hỗ trợ? Truy cập <a href="https://sonnhai.vercel.app/support" style="color:#00AEAE;text-decoration:none;">trang hỗ trợ</a>
      </p>
      <p style="margin:0;font-size:11px;color:#3A4255;">
        © ${new Date().getFullYear()} Thư viện Sơn Nhai. Email này được gửi tự động, vui lòng không trả lời.
      </p>
    </div>

  </div>
</body>
</html>`;
}

module.exports = { orderConfirmation, welcomeEmail, otpEmail };
