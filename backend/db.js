/**
 * db.js — SQLite database using Node.js built-in node:sqlite (Node 22.5+)
 * No native build required — works out of the box.
 */

const { DatabaseSync } = require('node:sqlite');
const bcrypt = require('bcryptjs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.sqlite');

const db = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// ─── CREATE TABLES ────────────────────────────────────────────────────────────

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT,
    role TEXT NOT NULL DEFAULT 'customer' CHECK(role IN ('customer', 'admin')),
    google_id TEXT,
    avatar TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    icon TEXT,
    description TEXT,
    sort_order INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    price INTEGER NOT NULL,
    original_price INTEGER,
    category_id INTEGER REFERENCES categories(id),
    emoji TEXT,
    color_class TEXT,
    file_format TEXT DEFAULT 'PDF' CHECK(file_format IN ('PDF', 'EPUB', 'PDF+EPUB')),
    file_size TEXT DEFAULT '5.2 MB',
    file_path TEXT DEFAULT 'simulated/path/to/file.pdf',
    page_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0,
    review_count INTEGER DEFAULT 0,
    sold_count INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft', 'published', 'archived')),
    is_featured INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS cart_sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    items_json TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupons (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('percent', 'fixed')),
    value INTEGER NOT NULL,
    min_order INTEGER DEFAULT 0,
    max_uses INTEGER,
    used_count INTEGER DEFAULT 0,
    expires_at TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS coupon_usages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    coupon_id INTEGER NOT NULL REFERENCES coupons(id),
    user_id INTEGER REFERENCES users(id),
    order_id INTEGER,
    used_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_number TEXT UNIQUE NOT NULL,
    user_id INTEGER REFERENCES users(id),
    customer_name TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    subtotal INTEGER NOT NULL,
    discount INTEGER DEFAULT 0,
    total INTEGER NOT NULL,
    coupon_code TEXT,
    payment_method TEXT,
    payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'cancelled')),
    bank_transfer_ref TEXT,
    paid_at TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    product_name TEXT NOT NULL,
    price INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS download_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    token TEXT UNIQUE NOT NULL,
    order_id INTEGER NOT NULL REFERENCES orders(id),
    order_item_id INTEGER REFERENCES order_items(id),
    product_id INTEGER REFERENCES products(id),
    customer_email TEXT NOT NULL,
    download_count INTEGER NOT NULL DEFAULT 0,
    max_downloads INTEGER NOT NULL DEFAULT 5,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL REFERENCES products(id),
    user_id INTEGER REFERENCES users(id),
    reviewer_name TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
    content TEXT,
    is_verified INTEGER NOT NULL DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    is_active INTEGER NOT NULL DEFAULT 1,
    subscribed_at TEXT NOT NULL DEFAULT (datetime('now')),
    unsubscribed_at TEXT
  );
`);

// ─── MIGRATIONS ───────────────────────────────────────────────────────────────
// Add columns that may not exist in older databases

try { db.exec(`ALTER TABLE orders ADD COLUMN bank_transfer_ref TEXT`); } catch {}
try { db.exec(`ALTER TABLE orders ADD COLUMN paid_at TEXT`); } catch {}

// ─── TRANSACTION HELPER ───────────────────────────────────────────────────────
// node:sqlite doesn't have .transaction() helper like better-sqlite3,
// so we implement our own.
db.transaction = function(fn) {
  return function(...args) {
    db.exec('BEGIN');
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  };
};

// ─── SEED DATA ────────────────────────────────────────────────────────────────

function seed() {
  const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@sonhai.vn');
  if (adminExists) return; // Already seeded

  console.log('Seeding database...');

  // Admin account
  const adminHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (name, email, password_hash, role)
    VALUES (?, ?, ?, 'admin')
  `).run('Admin', 'admin@sonhai.vn', adminHash);

  // Categories
  const categories = [
    { name: 'Nhân tính', slug: 'nhan-tinh', icon: '🧠', description: 'Sách về tâm lý học nhân tính, hiểu người hiểu mình', sort_order: 1 },
    { name: 'Nhận thức', slug: 'nhan-thuc', icon: '💡', description: 'Nâng cao nhận thức, mở rộng tư duy', sort_order: 2 },
    { name: 'Tư duy', slug: 'tu-duy', icon: '🔮', description: 'Rèn luyện tư duy logic và phản biện', sort_order: 3 },
    { name: 'Tài chính', slug: 'tai-chinh', icon: '💰', description: 'Kiến thức tài chính cá nhân và đầu tư', sort_order: 4 },
    { name: 'Tình cảm', slug: 'tinh-cam', icon: '🌙', description: 'Tâm lý tình cảm, các mối quan hệ', sort_order: 5 },
    { name: 'Hệ thống', slug: 'he-thong', icon: '⚙️', description: 'Tư duy hệ thống, quản lý hiệu quả', sort_order: 6 },
    { name: 'Kỹ năng sống', slug: 'ky-nang-song', icon: '📊', description: 'Kỹ năng sống thực tiễn hàng ngày', sort_order: 7 },
    { name: 'Phát triển bản thân', slug: 'phat-trien-ban-than', icon: '⚡', description: 'Phát triển bản thân toàn diện', sort_order: 8 },
  ];

  const insertCat = db.prepare(`
    INSERT INTO categories (name, slug, icon, description, sort_order)
    VALUES (?, ?, ?, ?, ?)
  `);
  categories.forEach(c => insertCat.run(c.name, c.slug, c.icon, c.description, c.sort_order));

  // Map category slug -> id
  const catMap = {};
  db.prepare('SELECT id, slug FROM categories').all().forEach(c => { catMap[c.slug] = c.id; });

  // Products
  const products = [
    {
      name: 'Tuyệt mật nhân tính',
      slug: 'tuyet-mat-nhan-tinh',
      description: 'Khám phá những bí mật sâu thẳm trong tâm lý con người. Cuốn sách giúp bạn hiểu rõ bản chất nhân tính, đọc vị người khác và làm chủ cuộc chơi trong mọi mối quan hệ.',
      price: 149000,
      original_price: 199000,
      category_id: catMap['nhan-tinh'],
      emoji: '🧠',
      color_class: 'book-color-1',
      file_format: 'PDF',
      file_size: '8.4 MB',
      page_count: 320,
      rating: 4.9,
      review_count: 48,
      sold_count: 240,
      is_featured: 1,
    },
    {
      name: 'Thức tỉnh nhận thức',
      slug: 'thuc-tinh-nhan-thuc',
      description: 'Hành trình thức tỉnh nhận thức toàn diện — từ cách não bộ xử lý thông tin đến việc phá vỡ những giới hạn tư duy đã ăn sâu trong tiềm thức.',
      price: 129000,
      original_price: 179000,
      category_id: catMap['nhan-thuc'],
      emoji: '💡',
      color_class: 'book-color-2',
      file_format: 'PDF',
      file_size: '7.1 MB',
      page_count: 280,
      rating: 4.8,
      review_count: 36,
      sold_count: 186,
      is_featured: 1,
    },
    {
      name: 'Logic người nghèo',
      slug: 'logic-nguoi-ngheo',
      description: 'Phân tích tư duy và những lỗi logic thường gặp khiến người ta mãi giậm chân tại chỗ. Nhận ra để thay đổi — đây là cuốn sách sẽ làm bạn khó chịu nhưng trưởng thành hơn.',
      price: 129000,
      original_price: 169000,
      category_id: catMap['tu-duy'],
      emoji: '🔮',
      color_class: 'book-color-3',
      file_format: 'PDF',
      file_size: '6.8 MB',
      page_count: 260,
      rating: 4.7,
      review_count: 29,
      sold_count: 118,
      is_featured: 0,
    },
    {
      name: 'Hệ thống mạnh mẽ',
      slug: 'he-thong-manh-me',
      description: 'Xây dựng tư duy hệ thống để giải quyết vấn đề phức tạp. Từ quản lý cá nhân đến điều hành tổ chức — tất cả đều cần một hệ thống vận hành đúng đắn.',
      price: 109000,
      original_price: 149000,
      category_id: catMap['he-thong'],
      emoji: '⚙️',
      color_class: 'book-color-6',
      file_format: 'PDF',
      file_size: '6.2 MB',
      page_count: 240,
      rating: 4.6,
      review_count: 22,
      sold_count: 96,
      is_featured: 0,
    },
    {
      name: 'Mưu lược tài chính',
      slug: 'muu-luoc-tai-chinh',
      description: 'Bí quyết tài chính thực chiến — từ quản lý dòng tiền cá nhân, xây dựng tài sản, đến những chiến lược đầu tư thông minh dành cho người Việt.',
      price: 139000,
      original_price: 189000,
      category_id: catMap['tai-chinh'],
      emoji: '💰',
      color_class: 'book-color-5',
      file_format: 'PDF',
      file_size: '7.8 MB',
      page_count: 300,
      rating: 4.8,
      review_count: 33,
      sold_count: 165,
      is_featured: 1,
    },
    {
      name: 'Tư duy sâu sắc',
      slug: 'tu-duy-sau-sac',
      description: 'Rèn luyện khả năng tư duy sâu sắc, nhìn thấu bề mặt để hiểu bản chất. Cuốn sách trang bị cho bạn công cụ phân tích và phán đoán vượt trội.',
      price: 119000,
      original_price: 159000,
      category_id: catMap['tu-duy'],
      emoji: '🎯',
      color_class: 'book-color-4',
      file_format: 'PDF',
      file_size: '6.5 MB',
      page_count: 256,
      rating: 4.7,
      review_count: 27,
      sold_count: 112,
      is_featured: 0,
    },
    {
      name: 'Tư duy cường giả',
      slug: 'tu-duy-cuong-gia',
      description: 'Tư duy của những người thành công vượt trội — bí mật tư duy giúp họ vươn lên trong mọi hoàn cảnh khắc nghiệt. Áp dụng ngay để bứt phá giới hạn bản thân.',
      price: 119000,
      original_price: 159000,
      category_id: catMap['phat-trien-ban-than'],
      emoji: '⚡',
      color_class: 'book-color-4',
      file_format: 'PDF',
      file_size: '7.3 MB',
      page_count: 290,
      rating: 4.7,
      review_count: 31,
      sold_count: 134,
      is_featured: 1,
    },
    {
      name: 'Tình cảm bí tịch',
      slug: 'tinh-cam-bi-tich',
      description: 'Giải mã tâm lý tình cảm — những điều bạn chưa bao giờ được dạy về tình yêu, sự gắn kết và nghệ thuật duy trì mối quan hệ bền vững.',
      price: 119000,
      original_price: 159000,
      category_id: catMap['tinh-cam'],
      emoji: '🌙',
      color_class: 'book-color-8',
      file_format: 'PDF',
      file_size: '6.9 MB',
      page_count: 272,
      rating: 4.6,
      review_count: 24,
      sold_count: 88,
      is_featured: 0,
    },
    {
      name: 'Xuyên thấu nhân tính',
      slug: 'xuyen-thau-nhan-tinh',
      description: 'Nghệ thuật xuyên thấu tâm lý — đọc ngôn ngữ cơ thể, phát hiện lời nói dối và hiểu động cơ thực sự của mỗi hành động. Dành cho người muốn làm chủ giao tiếp.',
      price: 129000,
      original_price: 169000,
      category_id: catMap['nhan-tinh'],
      emoji: '🔍',
      color_class: 'book-color-6',
      file_format: 'PDF',
      file_size: '7.9 MB',
      page_count: 310,
      rating: 4.8,
      review_count: 38,
      sold_count: 142,
      is_featured: 0,
    },
    {
      name: 'Nhân tính đen trắng',
      slug: 'nhan-tinh-den-trang',
      description: 'Nhìn thẳng vào mặt tối và mặt sáng của con người. Cuốn sách phân tích nhân tính không khoan nhượng — giúp bạn bảo vệ bản thân và lựa chọn đúng người đồng hành.',
      price: 109000,
      original_price: 149000,
      category_id: catMap['nhan-tinh'],
      emoji: '☯️',
      color_class: 'book-color-2',
      file_format: 'PDF',
      file_size: '6.3 MB',
      page_count: 248,
      rating: 4.5,
      review_count: 19,
      sold_count: 78,
      is_featured: 0,
    },
  ];

  const insertProduct = db.prepare(`
    INSERT INTO products (name, slug, description, price, original_price, category_id, emoji, color_class,
      file_format, file_size, page_count, rating, review_count, sold_count, status, is_featured)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)
  `);
  products.forEach(p => insertProduct.run(
    p.name, p.slug, p.description, p.price, p.original_price, p.category_id,
    p.emoji, p.color_class, p.file_format, p.file_size, p.page_count,
    p.rating, p.review_count, p.sold_count, p.is_featured
  ));

  // Coupons
  const coupons = [
    { code: 'WELCOME20', type: 'percent', value: 20, min_order: 0, max_uses: 100 },
    { code: 'SONHAI50K', type: 'fixed', value: 50000, min_order: 150000, max_uses: 50 },
    { code: 'COMBO30', type: 'percent', value: 30, min_order: 200000, max_uses: 30 },
  ];
  const insertCoupon = db.prepare(`
    INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at, is_active)
    VALUES (?, ?, ?, ?, ?, NULL, 1)
  `);
  coupons.forEach(c => insertCoupon.run(c.code, c.type, c.value, c.min_order, c.max_uses));

  // Sample reviews for product 1
  const product1 = db.prepare('SELECT id FROM products WHERE slug = ?').get('tuyet-mat-nhan-tinh');
  if (product1) {
    const sampleReviews = [
      { name: 'Nguyễn Minh Tuấn', rating: 5, content: 'Cuốn sách thay đổi hoàn toàn cách nhìn của mình về con người. Rất đáng đọc!', verified: 1, helpful: 12 },
      { name: 'Trần Thị Lan', rating: 5, content: 'Nội dung sâu sắc, dễ hiểu và áp dụng được ngay vào thực tế. Mình đã mua thêm cho cả gia đình.', verified: 1, helpful: 8 },
      { name: 'Lê Văn Hùng', rating: 4, content: 'Sách hay, phân tích tâm lý rất chi tiết. Chỉ tiếc là một số phần còn lặp lại.', verified: 1, helpful: 5 },
      { name: 'Phạm Thu Hương', rating: 5, content: 'Đọc xong mình hiểu tại sao mình cứ bị lợi dụng mãi. Giờ thì không còn nữa rồi.', verified: 0, helpful: 15 },
      { name: 'Vũ Đức Anh', rating: 5, content: 'Tuyệt vời! Đây là một trong những cuốn sách hay nhất mình từng đọc về tâm lý học.', verified: 1, helpful: 9 },
    ];
    const insertReview = db.prepare(`
      INSERT INTO reviews (product_id, reviewer_name, rating, content, is_verified, helpful_count)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    sampleReviews.forEach(r => insertReview.run(product1.id, r.name, r.rating, r.content, r.verified, r.helpful));
  }

  console.log('Database seeded successfully!');
}

seed();

module.exports = db;
