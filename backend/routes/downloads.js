const express = require('express');
const router = express.Router();
const db = require('../db');

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getTokenRecord(token) {
  return db.prepare(`
    SELECT dt.*, p.name as product_name, p.emoji, p.file_format, p.file_size, p.page_count
    FROM download_tokens dt
    LEFT JOIN products p ON dt.product_id = p.id
    WHERE dt.token = ?
  `).get(token);
}

function validateToken(record) {
  if (!record) return { valid: false, error: 'Link tải không hợp lệ.' };
  if (new Date(record.expires_at) < new Date()) {
    return { valid: false, error: 'Link tải đã hết hạn.' };
  }
  if (record.download_count >= record.max_downloads) {
    return { valid: false, error: `Đã hết lượt tải. Bạn đã tải ${record.download_count}/${record.max_downloads} lần.` };
  }
  return { valid: true };
}

// ─── GET /api/downloads/:token ────────────────────────────────────────────────

router.get('/:token', (req, res) => {
  if (req.params.token === 'undefined' || !req.params.token) {
    return res.status(400).json({ success: false, error: 'Token không hợp lệ.' });
  }

  const record = getTokenRecord(req.params.token);
  const validation = validateToken(record);

  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  const remainingDownloads = record.max_downloads - record.download_count;
  const expiresAt = new Date(record.expires_at);
  const now = new Date();
  const daysLeft = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

  res.json({
    success: true,
    data: {
      token: record.token,
      productName: record.product_name,
      productEmoji: record.emoji,
      fileFormat: record.file_format,
      fileSize: record.file_size,
      pageCount: record.page_count,
      downloadCount: record.download_count,
      maxDownloads: record.max_downloads,
      remainingDownloads,
      expiresAt: record.expires_at,
      daysLeft,
      customerEmail: record.customer_email,
    },
  });
});

// ─── POST /api/downloads/:token/use ──────────────────────────────────────────

router.post('/:token/use', (req, res) => {
  const record = getTokenRecord(req.params.token);
  const validation = validateToken(record);

  if (!validation.valid) {
    return res.status(400).json({ success: false, error: validation.error });
  }

  // Increment download count
  db.prepare('UPDATE download_tokens SET download_count = download_count + 1 WHERE token = ?')
    .run(req.params.token);

  const updatedRecord = getTokenRecord(req.params.token);
  const remainingDownloads = updatedRecord.max_downloads - updatedRecord.download_count;

  // Generate a safe file name
  const safeName = record.product_name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  const fileName = `${safeName}.pdf`;

  console.log(`📥 [DOWNLOAD] Token: ${req.params.token.slice(0, 8)}... | Sản phẩm: ${record.product_name} | Email: ${record.customer_email} | Lần ${updatedRecord.download_count}/${updatedRecord.max_downloads}`);

  res.json({
    success: true,
    data: {
      fileName,
      fileSize: record.file_size,
      downloadUrl: `/api/downloads/${req.params.token}/file`,
      downloadCount: updatedRecord.download_count,
      maxDownloads: updatedRecord.max_downloads,
      remainingDownloads,
      message: remainingDownloads > 0
        ? `Tải thành công. Còn ${remainingDownloads} lượt tải.`
        : 'Tải thành công. Đây là lần tải cuối cùng của bạn.',
    },
  });
});

// ─── GET /api/downloads/:token/file ──────────────────────────────────────────

router.get('/:token/file', (req, res) => {
  const record = getTokenRecord(req.params.token);

  if (!record) {
    return res.status(400).send('Link tải không hợp lệ.');
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(410).send('Link tải đã hết hạn.');
  }

  if (record.download_count > record.max_downloads) {
    return res.status(403).send('Đã hết lượt tải.');
  }

  // Generate safe file name
  const safeName = record.product_name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();

  const fileName = `${safeName}.pdf`;

  // Placeholder PDF content (simulated — no actual file)
  const placeholderContent = [
    '%PDF-1.4',
    `% Thư viện Sơn Nhai — File giả lập`,
    `% Sản phẩm: ${record.product_name}`,
    `% Email: ${record.customer_email}`,
    `% Ngày tải: ${new Date().toLocaleString('vi-VN')}`,
    `% Lần tải: ${record.download_count}/${record.max_downloads}`,
    '',
    'Đây là file PDF giả lập cho môi trường phát triển.',
    'Trong production, file thực sẽ được stream từ Cloudflare R2.',
    '',
    `Sản phẩm: ${record.product_name}`,
    `Định dạng: ${record.file_format}`,
    `Dung lượng thực: ${record.file_size}`,
    `Số trang: ${record.page_count} trang`,
    '',
    '© Thư viện Sơn Nhai — Tất cả quyền được bảo lưu.',
    'Nghiêm cấm chia sẻ, sao chép hoặc phát tán trái phép.',
  ].join('\n');

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.setHeader('Content-Length', Buffer.byteLength(placeholderContent, 'utf8'));
  res.send(placeholderContent);
});

module.exports = router;
