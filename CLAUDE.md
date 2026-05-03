# CLAUDE.md — Thư viện Sơn Nhai

## Project Overview

Website thương mại điện tử bán sản phẩm số (sách, PDF, tài liệu học tập). Giao diện **dark futuristic** — nền đen/tối, accent teal/cyan (`#00D4D4`), card có glow effect.

**Tech Stack thực tế:**
- **Frontend:** Vanilla HTML/CSS/JS (không framework)
- **Backend/Database:** Firebase (Firestore, Auth, Storage)
- **Hosting:** Vercel (static files)
- **Fonts:** Be Vietnam Pro, Exo 2

**Firebase Project:** `sonnhai-2600f`

---

## Firebase Config

```js
const firebaseConfig = {
  apiKey: "AIzaSyCctQ_86VvAlZPTQDQPyGeYjV9zMHLv_Sc",
  authDomain: "sonnhai-2600f.firebaseapp.com",
  projectId: "sonnhai-2600f",
  storageBucket: "sonnhai-2600f.firebasestorage.app",
  messagingSenderId: "907935883175",
  appId: "1:907935883175:web:0f356a63e28a45a196a082",
  measurementId: "G-JXP5V9W6GN",
};
```

Config này được sử dụng ở 3 file:
- `firebase.js` — config gốc, dùng cho auth-ui.js và các module khác
- `admin.html` — inline `<script type="module">` ở `<head>`
- `js/firestore-sync.js` — data layer cho tất cả trang public

---

## Cấu trúc thư mục

```
sonnhai/
├── index.html          # Trang chủ
├── categories.html     # Danh mục sản phẩm
├── product.html        # Chi tiết sản phẩm (?slug=...)
├── blog.html           # Blog listing
├── blog-post.html      # Blog post detail
├── about.html          # Giới thiệu
├── support.html        # Hỗ trợ, FAQ, liên hệ
├── cart.html            # Giỏ hàng
├── checkout.html        # Thanh toán
├── account.html         # Tài khoản user
├── admin.html           # ★ Admin Dashboard
├── firebase.js          # Firebase SDK config gốc
├── auth-ui.js           # Auth UI component (login/register modal)
├── js/
│   ├── firestore-sync.js   # ★ Data layer Firestore → public pages
│   ├── admin-app.js         # Admin UI logic (navigation, mockData)
│   ├── admin-firebase.js    # Admin Firebase CRUD functions
│   ├── cart-badge.js        # Cart + product data (localStorage)
│   ├── animations.js        # Scroll animations
│   └── parallax-engine.js   # Parallax background effects
├── css/
│   ├── animations.css
│   └── parallax-animations.css
└── api/                     # Express API (optional backend)
```

---

## Firestore Collections

```
users/{uid}
  - name: string
  - email: string
  - role: "admin" | "user"

products/{docId}
  - name, slug, category, price, originalPrice
  - emoji, icon, coverGradient, description, fullDescription
  - rating, soldCount, status ("published"|"draft")
  - pages, format, imageUrl, stock
  - createdAt, updatedAt (serverTimestamp)

combos/{docId}
  - name, tag, productIds[], originalPrice, comboPrice
  - savings, isHot, badgeText, order

blog_posts/{docId}
  - title, slug, category, content, excerpt
  - coverEmoji, coverGradient, readTime
  - status, createdAt, updatedAt

site_content/banner
  - text, type (info|promo|warning|success)
  - enabled: boolean, link, linkText

site_content/about
  - heroEyebrow, heroTitle, heroSub
  - stat1Label, stat1Value, stat2Label, stat2Value, stat3Label, stat3Value
  - storyTitle, storyContent, contactTitle, contactSub

site_content/support
  - heroEyebrow, heroTitle, heroSub
  - email, messenger, zalo, hours, announcement

orders/{docId}             # Tạo khi khách thanh toán SeaPay
  - customer, email, product, amount
  - payment, status, createdAt

payments/{docId}           # Ghi log thanh toán
  - order, customer, amount, method
  - status, createdAt

emails/{docId}             # Log email đã gửi
  - to, subject, type, status, createdAt

admin_logs/{docId}         # Log hoạt động admin
  - time, admin, action, module, detail, ip
```

---

## Admin Dashboard Architecture

### Auth Flow (Firebase Auth)
1. User mở `admin.html` → `onAuthStateChanged` check trạng thái
2. Chưa login → hiện login screen
3. Đã login → check `users/{uid}.role === "admin"` trong Firestore
4. Nếu là admin → `showApp()`, load Firestore products
5. Nếu không → alert + signOut

### Data Flow (Products)
```
Admin CRUD → Firestore products/ → localStorage cache
Public pages → firestore-sync.js → SonHaiData.getProducts() → render
```

### Key Functions (admin.html)
- `loadFirestoreProducts()` — đọc Firestore → mockData.products
- `firestoreCreateProduct(data)` — tạo product mới
- `firestoreUpdateProduct(id, data)` — cập nhật product
- `firestoreDeleteProduct(id)` — xóa product
- `firestoreUploadImage(file, productId)` — upload ảnh → Firebase Storage
- `saveProduct()` — form modal → Firestore
- `saveProductEdit()` — product editor → Firestore + upload ảnh

### Key API (js/firestore-sync.js)
```js
window.SonHaiData.getProducts(forceRefresh?)    // → normalized product[]
window.SonHaiData.getProductBySlug(slug)        // → product | null
window.SonHaiData.getCombos(forceRefresh?)      // → combo[]
window.SonHaiData.getBlogPosts(forceRefresh?)    // → post[]
window.SonHaiData.getBanner(forceRefresh?)       // → {text, enabled}
window.SonHaiData.getAbout(forceRefresh?)        // → about data
window.SonHaiData.getSupport(forceRefresh?)      // → support data
window.SonHaiData.clearCache()                   // clear localStorage cache
window.SonHaiData.renderBanner()                 // auto-render .ann-bar
```

Cache: localStorage với prefix `sndata_`, TTL 5 phút.

---

## Tiến độ triển khai (Admin ↔ Firestore ↔ Public Sync)

### ✅ Phase 1: Firebase Auth — HOÀN THÀNH
- Mock login thay bằng `signInWithEmailAndPassword`
- Role check từ Firestore `users/{uid}`
- Error messages cụ thể cho từng lỗi auth

### ✅ Phase 2: Products Firestore CRUD — HOÀN THÀNH
- Admin: Create/Update/Delete products → Firestore
- Admin: Upload ảnh → Firebase Storage
- Admin: Product editor sync Firestore
- `index.html` — import firestore-sync.js, DOMContentLoaded tries Firestore
- `categories.html` — renderProducts() tries Firestore first
- `product.html` — loadProductFromSlug() tries SonHaiData
- `about.html`, `blog.html`, `support.html` — import firestore-sync.js

### ✅ Phase 3: Combo — Firestore CRUD + Sync — HOÀN THÀNH
- Admin: Sidebar "📦 Combo", page `page-combos` với table + modal
- Admin: CRUD functions (loadCombos, saveCombo, editCombo, deleteCombo)
- Admin: Modal chọn products (checkbox), giá combo, badge, hot flag
- `index.html` — combo section render dynamic từ `SonHaiData.getCombos()`
- `buyCombo()` hỗ trợ string IDs (Firestore doc IDs)

### ✅ Phase 4: Blog — Firestore CRUD + Sync — HOÀN THÀNH
- Admin: content-modal HTML (title, slug, category, emoji, excerpt, body, readTime, gradient, type, status, metaDesc)
- Admin: loadContent() → Firestore `blog_posts`, renderContent(), filterContent()
- Admin: saveContent() → addDoc/updateDoc Firestore, auto-generate slug
- Admin: editContent() / deleteContent() → Firestore CRUD
- `blog.html` — render dynamic: featured post, blog grid, sidebar popular, categories, search, filter, pagination
- `index.html` — blog section render 3 bài mới nhất từ `SonHaiData.getBlogPosts()`

### ✅ Phase 5: About Page — Firestore CRUD + Sync — HOÀN THÀNH
- Admin: Sidebar "ℹ️ About", page `page-about` với form editor (hero, stats, story, contact)
- Admin: loadAboutEditor() / saveAboutContent() → Firestore `site_content/about`
- `about.html` — loadAboutContent() updates hero, stats, story, contact sections từ Firestore
- Fix: `setTảimeout` → `setTimeout`, proper indentation

### ✅ Phase 6: Support Page — Firestore CRUD + Sync — HOÀN THÀNH
- Admin: Sidebar "🆘 Support", page `page-support` (hero, contact info, announcement)
- Admin: loadSupportEditor() / saveSupportContent() → Firestore `site_content/support`
- `support.html` — loadSupportContent() updates hero, announcement, contact cards, hours
- Fix: `đưactiveTab` → `activeTab`, `setTảimeout` → `setTimeout`, proper indentation

### ✅ Phase 7: Banner Thông Báo — HOÀN THÀNH
- Admin: Sidebar "📢 Banner", page `page-banner` (enabled, type, text, link, linkText)
- Admin: loadBannerEditor() / saveBannerContent() → Firestore `site_content/banner`
- Admin: Live preview với color theo type (info/promo/warning/success)
- `index.html` — loadHomeBanner() updates `#site-banner`
- `support.html` — loadBannerFromFirestore() updates `.ann-bar`
- Tất cả trang support dynamic color theo banner type

### ✅ Phase 8: Xóa Mock Data — Production Ready — HOÀN THÀNH
- Xóa toàn bộ fake data trong mockData object (stats, orders, customers, payments, emails, admins, logs, charts, topProducts, recentOrders, recentActivity)
- Dashboard: loadDashboard() → async, đếm real products/combos/blog_posts/orders/users từ Firestore
- Dashboard: Revenue chart từ real orders, Top Products từ soldCount, Recent Orders/Activity empty state
- Orders: loadOrders() → Firestore `orders` collection + empty state "SeaPay"
- Customers: loadCustomers() → Firestore `users` collection + empty state
- Payments: loadPayments() → Firestore `payments` collection + empty state
- Emails: loadEmails() → Firestore `emails` collection + empty state
- Admins: loadAdmins() → Firestore `users` WHERE role IN ['admin','super-admin'] + fallback currentAdmin
- Logs: loadLogs() → Firestore `admin_logs` collection + empty state
- Content: Xóa fallback mockData.content, chỉ dùng Firestore blog_posts
- Fix: Thêm `setDoc` vào Firebase import + window._fb exports

---

## Lưu ý quan trọng

1. **Firestore IDs là string** — không dùng parseInt(), so sánh bằng `String(p.id) === String(id)`
2. **Product normalization** — cần map cả `camelCase` và `snake_case` fields (soldCount/sold_count, originalPrice/original_price)
3. **Fallback strategy** — Firestore → localStorage cache → cart-badge defaults
4. **Firebase project** — `sonnhai-2600f` (ĐÃ CẬP NHẬT từ ban-sach-24d69)
5. **Admin user** — UID trong Firestore `users` collection với `role: "admin"`
6. **Thanh toán** — Dự định dùng SeaPay
7. **Email** — Cần tích hợp gửi tự động (Cloud Functions)

---

## Công việc tiếp theo (chưa thực hiện)

### ⬜ Phase 9: Tích hợp SeaPay
- Checkout flow: cart → checkout.html → SeaPay API
- Callback: tạo `orders`, `payments` trong Firestore
- Cập nhật `soldCount` trên products
- Gửi email xác nhận đơn hàng

### ⬜ Phase 10: Email Service
- Firebase Cloud Functions
- Gửi email tự động: xác nhận đơn, link tải, chào mừng
- Ghi log vào Firestore `emails`

### ⬜ Phase 11: Security & Deploy
- Firestore Security Rules (public read, admin write)
- Firebase Hosting hoặc Vercel deploy
- Domain, SSL, SEO meta tags

---

## Cập nhật lần cuối: 2026-05-03

**Trạng thái:** Phase 1-8 hoàn thành. Admin dashboard 100% Firestore. Không còn mock data. Sẵn sàng tích hợp thanh toán SeaPay.
