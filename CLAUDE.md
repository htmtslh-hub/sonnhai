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

## Công việc đã thực hiện

### ✅ Phase 9: Tích hợp SePay — HOÀN THÀNH
- Checkout flow: cart → checkout.html → SePay VietQR
- `api/checkout.js` → tạo order Firestore, trả orderNumber
- `api/seapay/webhook.js` → nhận webhook SePay, cập nhật paid
- `api/seapay/status.js` → frontend poll trạng thái
- QR code từ `qr.sepay.vn`, polling mỗi 3s, timeout 15 phút
- Ngân hàng: VietinBank 109887120806 (DINH VAN TRIEN)

### ✅ Phase 10: Email Service (Resend) — HOÀN THÀNH
- `api/email/send.js` → Vercel serverless, gửi email qua Resend SDK
- `api/email/templates.js` → HTML templates dark theme, tiếng Việt
- Webhook tự động trigger email sau payment (fire-and-forget)
- Loại email: `order_confirmation` (+ link tải), `welcome`
- Admin dashboard: hiển thị email logs từ Firestore
- Env var: `RESEND_API_KEY` trên Vercel
- Free tier: onboarding@resend.dev (chưa verify domain)

### ✅ Phase 11.1: Critical Bugfix — Cart, Categories, Admin (2026-05-03)
- **Root cause:** Firestore IDs là string, code dùng `parseInt()` → NaN → cart không hoạt động
- **10 bugs đã fix:**
  1. `cart-badge.js`: `p.id == productId` → `String(p.id) === String(productId)` (addProduct, removeProduct)
  2. `index.html`: Bỏ `parseInt(card.dataset.productId)` → dùng string trực tiếp
  3. `categories.html`: Bỏ `parseInt(card.dataset.id)` → dùng string
  4. `categories.html`: `renderProducts()` không bao giờ được gọi → thêm init + retry chờ Firestore
  5. `cart.html`: `cart.items` → `cart` (getCart() trả array, không phải object)
  6. `checkout.html`: Cùng bug `cart.items` → `cart.length > 0`
  7. `cart.html`: `removeProduct(parseInt(id))` → bỏ parseInt
  8. `admin.html`: Product modal categories sai (ebook/course) → đúng (Nhân tính/Tư duy/...)
  9. `admin.html`: Thiếu field `product-original-price`, `product-form`, `product-file-preview`
  10. `admin.html`: Auto-seed 10 sản phẩm mặc định vào Firestore khi collection rỗng

---

## Kiến trúc Data Flow

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  cart-badge.js   │ ←── │  localStorage    │ ←── │ firestore-sync  │
│  (IIFE, v5)     │     │  sonhai_products │     │  (ES Module)    │
│  - defaultData  │     │  sonhai_cart_items│     │  - Firestore DB │
│  - addProduct() │     └──────────────────┘     │  - Cache 5min   │
│  - getCart()     │                              │  - normalizeProduct│
└─────────────────┘                              └─────────────────┘
        ↑                                                ↑
   index.html                                      admin.html
   categories.html                              (loadFirestoreProducts)
   product.html                                 (seedProductsToFirestore)
   cart.html
   checkout.html
```

**Quan trọng:**
- Product ID trên Firestore là **string** (ví dụ: `abc123xyz`), KHÔNG phải number
- Luôn dùng `String(id)` khi so sánh ID
- `getCart()` trả về **array[]**, KHÔNG phải `{items: []}`
- cart-badge.js version hiện tại: `v=5` — tất cả page phải dùng cùng version

---

## API Endpoints (Vercel Serverless)

| Endpoint | Method | Auth | Mô tả |
|---|---|---|---|
| `/api/checkout` | POST | Public | Tạo đơn hàng → Firestore |
| `/api/seapay/webhook` | POST | Apikey header | SePay webhook → xác nhận thanh toán |
| `/api/seapay/status` | GET | Public | Poll trạng thái đơn hàng |
| `/api/email/send` | POST | X-Internal-Key | Gửi email qua Resend |

## Environment Variables (Vercel)

| Variable | Mô tả |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account key |
| `SEPAY_API_KEY` | SePay webhook API key |
| `RESEND_API_KEY` | Resend email API key |
| `INTERNAL_API_KEY` | Internal auth key (default: sonnhai-internal-2026) |

---

## Known Issues / TODO cho phiên tiếp theo

1. **Cần verify thủ công:** User test lại cart flow end-to-end trên thiết bị khác (add→cart→checkout→thanh toán)
2. ~~**Admin "Chỉnh sửa SP":** Modal `saveProductEdit()` — chưa test kỹ~~ → ✅ ĐÃ FIX (03/05 tối)
3. **Firestore products:** Lần đầu admin login sẽ auto-seed. Nếu đã seed rồi thì sẽ load từ Firestore bình thường
4. **Custom domain:** Chưa setup (sonnhai.com → Vercel)
5. **Email domain:** Chưa verify trên Resend (đang dùng onboarding@resend.dev)

### ✅ Đã hoàn thành (Phiên 03/05/2026 tối)
- **Product Editor:** Fix parseInt bug, sai categories, thêm slug/emoji/gradient/rating/soldCount fields
- **Optimistic UI:** Save product phản hồi tức thì, Firestore sync background
- **Cross-page sync:** `syncProductsToPublicPages()` — admin save xóa cache `sndata_products` → public pages luôn lấy data mới

## Cập nhật lần cuối: 2026-05-03 22:00

**Trạng thái:** Phase 1-11 hoàn thành + tất cả Bugfix. Website live tại https://sonnhai.vercel.app. Admin Product Editor hoạt động đầy đủ. Optimistic UI cho save nhanh. Cross-page sync khi admin cập nhật sản phẩm. Cần setup custom domain + verify email domain.

---

## 🎬 Công thức AIDA — Viết Content Video & Bài viết giới thiệu sách

> **Mục đích:** Dùng công thức này để tạo kịch bản video (YouTube, TikTok, Reels) hoặc bài viết giới thiệu/bán sách trên website Sơn Nhai. Áp dụng được cho mọi loại content marketing.

### Tổng quan 8 Giai đoạn

| # | Giai đoạn | Mục tiêu | Thời lượng gợi ý (video) |
|---|-----------|----------|--------------------------|
| 1 | **HOOK — Mở màn** | Giữ chân người xem trong 3 giây đầu | 3–5s |
| 2 | **Nêu vấn đề** | Thu hút sự quan tâm, đồng cảm | 10–20s |
| 3 | **Tương tác lần 1** | Tăng engagement sớm | 5–10s |
| 4 | **Intro thương hiệu** | Cài đặt brand vào tiềm thức | 3–5s |
| 5 | **Xử lý vấn đề / Giải pháp** | Deliver giá trị cốt lõi | Tùy chỉnh (phần lớn thời lượng) |
| 6 | **Kích động cảm xúc** | Đẩy mạnh nhu cầu hành động | 15–30s |
| 7 | **Kêu gọi hành động (CTA)** | Chuyển đổi: mua, đăng ký, follow | 10–15s |
| 8 | **Chào kết / Outro** | Kết thúc chuyên nghiệp + giữ kênh | 5–10s |

---

### Giai đoạn 1 — 🪝 HOOK (Attention)

> **Nguyên tắc:** 3 giây đầu quyết định người xem ở lại hay lướt đi.

**Kỹ thuật HOOK hiệu quả:**
- **Câu hỏi gây sốc:** "Bạn có biết 90% người đọc sách quên hết nội dung sau 7 ngày?"
- **Đoạn highlight:** Cắt đoạn hay nhất, cao trào nhất của video đặt lên đầu
- **Tuyên bố ngược:** "Đọc nhiều sách KHÔNG giúp bạn thành công — đây mới là lý do"
- **Cảm xúc mạnh:** Sợ hãi, tò mò, hài hước, bất ngờ, phẫn nộ
- **Con số gây shock:** "Cuốn sách 200 trang này đã thay đổi tư duy 100.000 người"

**Áp dụng cho bài viết sách:**
> Mở đầu bằng một câu chuyện ngắn, một trích dẫn đắt giá từ sách, hoặc một câu hỏi khiến người đọc phải dừng lại suy nghĩ.

---

### Giai đoạn 2 — 🎯 Nêu vấn đề / Giải pháp (Interest)

> **Nguyên tắc:** Chạm đúng nỗi đau (pain point) của khán giả mục tiêu.

**Cấu trúc:**
1. **Mô tả vấn đề** mà khán giả đang gặp phải (cụ thể, đời thực)
2. **Tạo sự đồng cảm** — "Mình cũng từng như vậy..."
3. **Hé lộ giải pháp** — "Và cuốn sách này đã thay đổi tất cả"

**Ví dụ cho sách:**
> "Bạn đã bao giờ cảm thấy mình đọc rất nhiều nhưng cuộc sống chẳng thay đổi gì? Mình cũng từng vậy — cho đến khi tìm được cuốn sách này..."

---

### Giai đoạn 3 — 💬 Kêu gọi tương tác lần 1 (Engagement Boost)

> **Nguyên tắc:** Tương tác sớm giúp thuật toán đẩy video lên nhiều người hơn.

**Kỹ thuật:**
- **Đặt câu hỏi mở:** "Bạn nghĩ sao? Comment bên dưới cho mình biết nhé!"
- **Thăm dò ý kiến:** "Đã ai từng đọc cuốn này chưa? Like nếu rồi!"
- **Yêu cầu cụ thể:** "Nếu bạn cũng từng gặp vấn đề này, hãy gõ 'YES' dưới comment"
- **Subscribe/Follow:** "Ấn theo dõi để không bỏ lỡ các bài review sách tiếp theo!"

---

### Giai đoạn 4 — 🏷️ Intro thương hiệu (Brand Imprint)

> **Nguyên tắc:** Ngắn gọn, lặp lại mỗi video → ghi nhớ thương hiệu theo thời gian. **Tối đa 3–5 giây.**

**Cấu trúc:**
- Logo/Jingle ngắn của kênh
- Tagline: "Sơn Nhai — Đọc sách, đổi đời" (ví dụ)
- Hoặc đơn giản: "Chào mọi người, mình là [tên] đến từ Thư viện Sơn Nhai"

**Áp dụng cho bài viết:**
> Chèn một dòng brand signature: *"— Thư viện Sơn Nhai: Nơi mỗi cuốn sách là một hành trình."*

---

### Giai đoạn 5 — 📖 Xử lý vấn đề / Giải pháp chi tiết (Desire — Phần chính)

> **Nguyên tắc:** Đây là phần chiếm nhiều thời lượng nhất — deliver giá trị thật sự.

**Cấu trúc cho video review sách:**
1. **Giới thiệu tổng quan sách:** Tác giả, thể loại, bối cảnh
2. **3–5 bài học / ý tưởng hay nhất** từ sách (kèm ví dụ cụ thể)
3. **Trải nghiệm cá nhân:** Cuốn sách đã thay đổi mình như thế nào
4. **Trích dẫn đắt giá:** Đọc 1–2 câu trích hay nhất trong sách

**Kỹ thuật giữ chân:**
- Cứ mỗi 2–3 phút, chèn một câu hỏi hoặc CTA nhỏ (micro-engagement)
- Dùng hình ảnh minh họa, B-roll, text overlay
- Thay đổi góc quay, tốc độ, nhạc nền để tránh nhàm chán

**💡 Tip — Tương tác giữa chừng:**
> *"Trước khi mình nói bài học tiếp theo — bạn đoán xem bài học số 3 là gì? Comment đáp án, mình cho bạn 10 giây..."* (đếm ngược tạo urgency)

---

### Giai đoạn 6 — 🔥 Kích động cảm xúc (Desire — Amplify)

> **Nguyên tắc:** Đẩy cảm xúc lên đỉnh điểm → tạo nhu cầu hành động NGAY.

**A) Tác hại nếu KHÔNG hành động (Fear/Pain):**
- "Nếu bạn không thay đổi tư duy, 5 năm sau bạn vẫn ở đúng vị trí hiện tại"
- "Mỗi ngày trôi qua mà không đọc là một ngày bạn tụt lại phía sau"
- Nhấn mạnh: hậu quả, chi phí cơ hội, sự hối tiếc

**B) Lợi ích nếu hành động (Pleasure/Gain):**
- "Chỉ cần áp dụng 1 bài học trong cuốn sách này, thu nhập mình đã tăng gấp đôi"
- "Hãy tưởng tượng 3 tháng tới, bạn đã đọc xong 10 cuốn sách thay đổi cuộc đời..."
- Nhấn mạnh: kết quả cụ thể, câu chuyện thành công, viễn cảnh tươi sáng

---

### Giai đoạn 7 — 🛒 Kêu gọi hành động — CTA (Action)

> **Nguyên tắc:** Rõ ràng, cụ thể, khẩn cấp. Chỉ MỘT hành động chính.

**Loại CTA phù hợp cho Sơn Nhai:**

| Mục tiêu | CTA mẫu |
|-----------|---------|
| **Bán sách** | "Link mua sách ở dưới mô tả — giá chỉ [X]đ, rẻ hơn 1 ly trà sữa nhưng giá trị cả đời!" |
| **Subscribe** | "Ấn đăng ký và bật chuông để nhận thông báo khi mình ra video mới!" |
| **Cộng đồng** | "Tham gia group đọc sách Sơn Nhai — link Zalo/Facebook ở mô tả!" |
| **Chia sẻ** | "Nếu video này hữu ích, hãy chia sẻ cho 1 người bạn đang cần!" |
| **Website** | "Truy cập sonnhai.vercel.app để xem thêm các cuốn sách hay khác!" |

**Tạo urgency:**
- "Giảm giá chỉ còn hôm nay!"
- "Chỉ còn [X] suất ưu đãi!"
- "Link ở dưới — xem ngay trước khi hết!"

---

### Giai đoạn 8 — 👋 Chào kết / Outro

> **Nguyên tắc:** Kết thúc gọn gàng, chuyên nghiệp, và dẫn dắt sang nội dung tiếp theo.

**Cấu trúc:**
1. **Tóm tắt 1 câu:** "Vậy là hôm nay chúng ta đã cùng tìm hiểu [tên sách] — cuốn sách về [chủ đề]"
2. **Lời chào:** "Cảm ơn mọi người đã xem, hẹn gặp lại ở video tiếp theo!"
3. **End screen:** Đề xuất 2 video liên quan (YouTube end card)
4. **Outro animation:** Logo Sơn Nhai + nhạc kết

---

### 📝 Template nhanh — Viết kịch bản video review sách

```
[HOOK — 3-5s]
"{Câu hỏi/tuyên bố gây sốc liên quan đến chủ đề sách}"

[VẤN ĐỀ — 10-20s]
"Bạn có bao giờ {mô tả pain point}? {Mô tả hệ quả}..."

[TƯƠNG TÁC 1 — 5s]
"Comment cho mình biết: {câu hỏi liên quan}!"

[INTRO BRAND — 3s]
"Xin chào, mình là [tên] từ Thư viện Sơn Nhai"

[NỘI DUNG CHÍNH — phần lớn thời lượng]
"Hôm nay mình sẽ review cuốn {tên sách} của {tác giả}..."
- Bài học 1: ...
- Bài học 2: ...
- [TƯƠNG TÁC GIỮA CHỪNG]: "Đoán xem bài học tiếp theo là gì?"
- Bài học 3: ...

[KÍCH ĐỘNG — 15-30s]
"Nếu bạn không {hành động}, thì {hậu quả}..."
"Nhưng nếu bạn {hành động}, bạn sẽ {lợi ích}..."

[CTA — 10-15s]
"Link mua sách ở mô tả bên dưới! {Urgency}"

[OUTRO — 5-10s]
"Cảm ơn mọi người! Xem thêm video {đề xuất} nhé! 👋"
```

---

### 📝 Template nhanh — Bài viết giới thiệu sách (cho website Sơn Nhai)

```
[TIÊU ĐỀ BÀI VIẾT]
→ Dùng công thức: Số + Kết quả + Thời gian
→ VD: "5 bài học thay đổi tư duy từ cuốn [Tên sách] — đọc trong 10 phút"

[HOOK — Mở bài]
→ Câu chuyện / trích dẫn / câu hỏi gây tò mò

[VẤN ĐỀ & ĐỒNG CẢM]
→ Mô tả pain point → "Mình cũng từng..."

[NỘI DUNG CHÍNH — Giá trị từ sách]
→ 3-5 bài học kèm ví dụ
→ Trích dẫn hay
→ Trải nghiệm cá nhân

[KÍCH ĐỘNG]
→ Tác hại nếu bỏ qua vs. Lợi ích nếu đọc

[CTA]
→ "Mua ngay tại Thư viện Sơn Nhai — [link sản phẩm]"
→ Giá + ưu đãi + urgency

[KẾT BÀI]
→ Tóm tắt 1 dòng + signature brand
```

---

### 💡 Tips thực chiến

1. **Quy tắc 3 giây:** Người xem quyết định ở lại hay lướt trong 3s đầu → HOOK phải cực mạnh
2. **Quy tắc 80/20:** 80% giá trị, 20% bán hàng — đừng quá push CTA
3. **Storytelling > Liệt kê:** Kể câu chuyện thay vì chỉ liệt kê thông tin
4. **Cảm xúc > Logic:** Người ta mua vì cảm xúc, biện minh bằng lý trí
5. **CTA đơn giản:** Mỗi content chỉ nên có 1 CTA chính — đừng yêu cầu quá nhiều thứ cùng lúc
6. **Lặp lại brand:** Cài thương hiệu Sơn Nhai vào mỗi nội dung → nhận diện theo thời gian
7. **Test & Optimize:** A/B test các HOOK khác nhau, theo dõi retention rate

---

*Công thức AIDA được tối ưu bởi Thư viện Sơn Nhai — Cập nhật: 2026-05-08*
