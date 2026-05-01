/**
 * payment-poller.js
 * Polling Casso API mỗi 30 giây để phát hiện giao dịch ngân hàng mới.
 * Tự động fulfill các đơn hàng bank_transfer đang pending.
 *
 * Casso API docs: https://casso.vn/api-doc
 */

const https = require('https');
const { fulfillOrder } = require('./fulfillment');
const db = require('./db');

const POLL_INTERVAL_MS = 30 * 1000; // 30 giây
let lastSeenTxId = null; // ID giao dịch cuối cùng đã xử lý

// ─── Gọi Casso API ────────────────────────────────────────────────────────────

function fetchCassoTransactions() {
  return new Promise((resolve, reject) => {
    const apiKey = process.env.CASSO_API_KEY;
    if (!apiKey) {
      resolve([]);
      return;
    }

    const options = {
      hostname: 'oauth.casso.vn',
      path: '/v2/transactions?sort=DESC&pageSize=20',
      method: 'GET',
      headers: {
        'Authorization': `Apikey ${apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error === 0 && parsed.data && parsed.data.records) {
            resolve(parsed.data.records);
          } else {
            resolve([]);
          }
        } catch {
          resolve([]);
        }
      });
    });

    req.on('error', err => {
      console.error('[POLLER] Lỗi kết nối Casso:', err.message);
      resolve([]);
    });

    req.end();
  });
}

// ─── Xử lý một lần poll ───────────────────────────────────────────────────────

async function poll() {
  if (!process.env.CASSO_API_KEY) return; // Không cấu hình → bỏ qua

  try {
    const transactions = await fetchCassoTransactions();
    if (!transactions.length) return;

    for (const tx of transactions) {
      // Bỏ qua nếu đã xử lý
      if (lastSeenTxId && tx.id <= lastSeenTxId) break;

      const description = (tx.description || '').toUpperCase();
      const amount = parseInt(tx.amount || 0);

      // Chỉ xử lý giao dịch tiền vào (amount > 0)
      if (amount <= 0) continue;

      // Tìm mã đơn hàng SNH-YYYYMMDD-XXXX trong nội dung chuyển khoản
      const match = description.match(/SNH-\d{8}-\d{4}/);
      if (!match) continue;

      const orderNumber = match[0];
      const order = db.prepare(
        "SELECT * FROM orders WHERE order_number = ? AND payment_status = 'pending'"
      ).get(orderNumber);

      if (!order) continue;

      // Kiểm tra số tiền (cho phép sai lệch ±1000đ để bù phí chuyển khoản nội mạng)
      if (Math.abs(amount - order.total) > 1000) {
        console.warn(`[POLLER] Số tiền không khớp: nhận ${amount}đ, cần ${order.total}đ (đơn ${orderNumber})`);
        continue;
      }

      console.log(`[POLLER] ✅ Phát hiện thanh toán khớp: đơn ${orderNumber} — ${amount.toLocaleString('vi-VN')}đ`);
      await fulfillOrder(order.id, String(tx.id));
    }

    // Lưu ID giao dịch mới nhất
    if (transactions.length > 0) {
      lastSeenTxId = transactions[0].id;
    }
  } catch (err) {
    console.error('[POLLER] Lỗi không mong đợi:', err.message);
  }
}

// ─── Start / Stop ─────────────────────────────────────────────────────────────

let timer = null;

function start() {
  if (!process.env.CASSO_API_KEY) {
    console.log('[POLLER] Chưa cấu hình CASSO_API_KEY — polling tắt. Admin có thể xác nhận thủ công.');
    return;
  }

  console.log(`[POLLER] Bắt đầu polling Casso mỗi ${POLL_INTERVAL_MS / 1000}s`);
  poll(); // Chạy ngay lần đầu
  timer = setInterval(poll, POLL_INTERVAL_MS);
}

function stop() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { start, stop };
