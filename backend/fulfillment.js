const db = require('./db');
const { v4: uuidv4 } = require('uuid');
const { sendOrderConfirmation, sendAdminNewOrder } = require('./mailer');

/**
 * fulfillOrder — đánh dấu đơn hàng là paid, tạo download tokens (nếu chưa có),
 * rồi gửi email xác nhận cho khách và admin.
 *
 * @param {number} orderId
 * @param {string} txRef  — mã giao dịch ngân hàng hoặc 'manual'
 */
async function fulfillOrder(orderId, txRef) {
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  if (!order) throw new Error(`Order ${orderId} not found`);
  if (order.payment_status === 'paid') {
    console.log(`[FULFILL] Đơn ${order.order_number} đã được fulfill trước đó — bỏ qua.`);
    return;
  }

  const expireDays   = parseInt(process.env.DOWNLOAD_EXPIRE_DAYS) || 30;
  const maxDownloads = parseInt(process.env.DOWNLOAD_MAX_COUNT)   || 5;

  // ── Transaction: cập nhật đơn + tạo download tokens ──────────────────────
  const doFulfill = db.transaction(() => {
    // Đánh dấu paid
    db.prepare(`
      UPDATE orders
      SET payment_status = 'paid',
          status = 'completed',
          bank_transfer_ref = ?,
          paid_at = datetime('now'),
          updated_at = datetime('now')
      WHERE id = ?
    `).run(txRef, orderId);

    // Lấy order items
    const items = db.prepare(`
      SELECT oi.*, p.name as product_name, p.emoji, p.file_format, p.file_size, p.page_count
      FROM order_items oi
      LEFT JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `).all(orderId);

    const downloadTokens = [];

    for (const item of items) {
      // Kiểm tra token đã tồn tại chưa (tránh tạo 2 lần nếu webhook bị gửi 2 lần)
      const existing = db.prepare(
        'SELECT token FROM download_tokens WHERE order_id = ? AND product_id = ?'
      ).get(orderId, item.product_id);

      let tokenStr;
      if (existing) {
        tokenStr = existing.token;
      } else {
        tokenStr = uuidv4();
        const expiresAt = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString();
        db.prepare(`
          INSERT INTO download_tokens
            (token, order_id, order_item_id, product_id, customer_email, max_downloads, expires_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(tokenStr, orderId, item.id, item.product_id,
               order.customer_email, maxDownloads, expiresAt);
      }

      downloadTokens.push({
        token: tokenStr,
        productName: item.product_name,
        productEmoji: item.emoji,
        expiresAt: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString(),
        maxDownloads,
      });

      // Tăng sold_count
      db.prepare('UPDATE products SET sold_count = sold_count + 1 WHERE id = ?')
        .run(item.product_id);
    }

    return downloadTokens;
  });

  const downloadTokens = doFulfill();

  console.log(`✅ [FULFILL] Đơn ${order.order_number} fulfilled — ref: ${txRef}`);

  // ── Gửi email (fire-and-forget) ───────────────────────────────────────────
  const emailOrder = {
    orderNumber:   order.order_number,
    customerName:  order.customer_name,
    customerEmail: order.customer_email,
    subtotal:      order.subtotal,
    discount:      order.discount,
    total:         order.total,
    paymentMethod: order.payment_method || 'bank_transfer',
  };

  sendOrderConfirmation({ order: emailOrder, downloadTokens }).catch(err =>
    console.error('[FULFILL] Lỗi gửi email khách:', err.message)
  );
  sendAdminNewOrder({ order: emailOrder, downloadTokens }).catch(err =>
    console.error('[FULFILL] Lỗi gửi email admin:', err.message)
  );
}

module.exports = { fulfillOrder };
