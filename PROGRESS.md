# Báo Cáo Tiến Độ - Thư viện Sơn Nhai
**Ngày cập nhật:** 04/05/2026 - 16:45
**Website:** https://sonnhai.vercel.app
**Trạng thái tổng:** 🟢 Production — Live & Hoạt động

---

## 📊 Tổng Quan Dự Án

| Hạng mục | Trạng thái |
|---|---|
| 🌐 Website công khai | ✅ Live trên Vercel |
| 🔐 Admin Dashboard | ✅ Hoạt động đầy đủ |
| 🗄️ Database (Firestore) | ✅ Production |
| 💳 Thanh toán (SePay VietQR) | ✅ Tích hợp xong |
| 📧 Email tự động (Resend) | ✅ Hoạt động |
| 🔒 Bảo mật (Firestore Rules) | ✅ Đã cấu hình |
| 🔑 Xác thực khách (Gmail OTP) | ✅ Hoạt động |

---

## ✅ Các Phase Đã Hoàn Thành

### Phase 1: Firebase Auth ✅
- Đăng nhập admin bằng Firebase Auth (`signInWithEmailAndPassword`)
- Check role admin từ Firestore `users/{uid}`
- Error messages cụ thể cho từng lỗi auth

### Phase 2: Products Firestore CRUD ✅
- Admin: Create/Update/Delete products → Firestore
- Admin: Upload ảnh → Firebase Storage
- Public pages: Render sản phẩm dynamic từ Firestore

### Phase 3: Combo — Firestore CRUD + Sync ✅
- Admin: Quản lý combo (sidebar, modal, CRUD)
- Homepage: Render combo dynamic từ `SonHaiData.getCombos()`

### Phase 4: Blog — Firestore CRUD + Sync ✅
- Admin: Quản lý blog (modal editor, CRUD)
- Blog pages: Render dynamic, search, filter, pagination

### Phase 5: About Page — Firestore CRUD + Sync ✅
- Admin: Editor cho hero, stats, story, contact
- About page: Load nội dung từ Firestore

### Phase 6: Support Page — Firestore CRUD + Sync ✅
- Admin: Editor cho hero, contact info, announcement
- Support page: Load nội dung từ Firestore

### Phase 7: Banner Thông Báo ✅
- Admin: Quản lý banner (enabled, type, text, link)
- Tất cả trang: Dynamic banner với color theo type

### Phase 8: Xóa Mock Data — Production Ready ✅
- Dashboard: Thống kê real từ Firestore (products, orders, users)
- Tất cả module: Load data từ Firestore, empty state khi chưa có data

### Phase 9: Tích hợp SePay ✅
- Checkout flow: cart → checkout → SePay VietQR
- API endpoints: `/api/checkout`, `/api/seapay/webhook`, `/api/seapay/status`
- QR code từ `qr.sepay.vn`, polling mỗi 3s, timeout 15 phút
- Ngân hàng: BIDV 2154356816 (DINH VAN TRIEN)

### Phase 10: Email Service (Resend) ✅
- API: `/api/email/send` — Vercel serverless
- Templates: Dark theme, tiếng Việt (order_confirmation, welcome)
- Webhook tự động trigger email sau payment
- Admin: Hiển thị email logs

### Phase 11: Security & SEO ✅
- Firestore Security Rules đã cấu hình
- SEO meta tags trên tất cả trang

### Phase 11.1: Critical Bugfix — Cart, Categories, Admin ✅
- **Root cause:** Firestore IDs là string, code dùng `parseInt()` → NaN
- **10 bugs đã fix** (chi tiết trong CLAUDE.md)

---

## ✅ Công Việc Phiên 03/05/2026 (Cuối ngày)

### 1. Sửa Admin Product Editor ✅
**Vấn đề:** Chức năng "Chỉnh sửa Sản phẩm" không hoạt động
**Nguyên nhân & Fix:**

| Bug | Trước | Sau |
|---|---|---|
| `parseInt(select.value)` | Firestore string ID → NaN → không load SP | Dùng string trực tiếp |
| `p.id === productId` | Luôn false | `String(p.id) === String(productId)` |
| Danh mục sai | Sách Kỹ Năng/Kinh Doanh/Tâm Lý/Công Nghệ | Nhân tính/Tư duy/Kỹ năng sống/Hệ thống/Tài chính/Tình cảm |

**Các field mới thêm vào editor:**

| Field | Mô tả |
|---|---|
| 📝 Slug (URL) | Tự động sinh từ tên SP, dùng cho URL sản phẩm |
| 😊 Emoji / Icon | Icon hiện trên card sản phẩm |
| 🖼️ Ảnh bìa | Upload lên Firebase Storage |
| 🎨 Cover Gradient | Nền gradient card (có preview trực tiếp) |
| ⭐ Đánh giá | Rating 1-5 sao |
| 📊 Đã bán | Số lượt bán |

### 2. Tối Ưu Tốc Độ Lưu Sản Phẩm (Optimistic UI) ✅
**Vấn đề:** Lưu sản phẩm chậm (500-2000ms chờ Firestore)
**Giải pháp:** Optimistic UI pattern

| Trước (chậm) | Sau (nhanh) |
|---|---|
| Chờ Firestore write xong → mới hiện toast | Cập nhật local + hiện toast **ngay lập tức** |
| `await firestoreUpdateProduct()` → 500-2000ms | `firestoreUpdateProduct().catch(...)` → fire-and-forget |
| Button disabled "⏳ Đang lưu..." | Toast "✅ Đã lưu" hiện ngay |

### 3. Đồng Bộ Cross-Page (Admin → Public Pages) ✅
**Vấn đề:** Sửa SP ở admin nhưng public pages vẫn hiện data cũ (cache 5 phút)
**Giải pháp:** `syncProductsToPublicPages()` helper

```
Admin Save → syncProductsToPublicPages()
  ├── 1. localStorage['sonhai_products'] = updated data
  ├── 2. localStorage.removeItem('sndata_products')  ← clear cache
  └── 3. Firestore update (background)

User mở trang khác → cache miss → fetch fresh → data mới ✅
```

---

## 📋 Cấu Trúc Trang

### Trang Công Khai (Store)
| # | File | Mô tả |
|---|---|---|
| 1 | `index.html` | Trang chủ (hero, featured products, combos, blog) |
| 2 | `categories.html` | Danh mục sản phẩm (filter, grid) |
| 3 | `product.html` | Chi tiết sản phẩm (?slug=...) |
| 4 | `cart.html` | Giỏ hàng |
| 5 | `checkout.html` | Thanh toán (SePay VietQR) |
| 6 | `thank-you.html` | Trang cảm ơn |
| 7 | `account.html` | Tài khoản khách hàng |
| 8 | `blog.html` | Danh sách blog |
| 9 | `blog-post.html` | Chi tiết bài viết |
| 10 | `about.html` | Giới thiệu |
| 11 | `support.html` | Hỗ trợ/FAQ/Liên hệ |
| 12 | `seapay-return.html` | Xử lý thanh toán return |

### Trang Quản Trị
| # | File | Mô tả |
|---|---|---|
| 13 | `admin.html` | Admin Dashboard (~197KB, full CMS) |

### API Endpoints (Vercel Serverless)
| Endpoint | Method | Mô tả |
|---|---|---|
| `/api/checkout` | POST | Tạo đơn hàng → Firestore |
| `/api/seapay/webhook` | POST | SePay webhook → xác nhận thanh toán |
| `/api/seapay/status` | GET | Poll trạng thái đơn hàng |
| `/api/email/send` | POST | Gửi email qua Resend |

---

## 🔧 Chức Năng Đã Hoàn Thiện

### Admin Panel
- ✅ Dashboard với thống kê real-time (Firestore)
- ✅ Quản lý sản phẩm (CRUD + upload ảnh + editor đầy đủ)
- ✅ Quản lý combo
- ✅ Quản lý đơn hàng
- ✅ Quản lý khách hàng
- ✅ Quản lý thanh toán
- ✅ Quản lý nội dung (Blog, About, Support, Banner)
- ✅ Quản lý email logs
- ✅ Product Editor (slug, emoji, gradient, rating, soldCount, ảnh bìa)
- ✅ SEO Settings
- ✅ Nhật ký hệ thống
- ✅ Login/Logout (Firebase Auth)
- ✅ Optimistic UI (lưu nhanh, sync background)
- ✅ Cross-page sync (admin save → clear public cache)

### Store Frontend
- ✅ Trang chủ với hero, featured products, combos, blog
- ✅ Danh mục sản phẩm với filter
- ✅ Chi tiết sản phẩm
- ✅ Giỏ hàng (add/remove/update quantity)
- ✅ Checkout + SePay VietQR
- ✅ Thank you page
- ✅ Tài khoản khách hàng
- ✅ Blog (listing + detail)
- ✅ About, Support pages
- ✅ Banner thông báo dynamic

### Thanh Toán
- ✅ SePay VietQR integration
- ✅ Webhook xác nhận tự động
- ✅ Polling trạng thái realtime
- ✅ Email xác nhận đơn hàng tự động (Resend)

---

## 🚧 Công Việc Cần Làm Tiếp

### Ưu Tiên CAO
- [ ] Custom domain (sonnhai.com → Vercel)
- [ ] Email domain verify trên Resend (hiện dùng onboarding@resend.dev)
- [ ] User test lại cart flow end-to-end trên thiết bị khác

### Ưu Tiên TRUNG BÌNH
- [ ] Upload file PDF/EPUB cho sản phẩm (digital delivery)
- [ ] Quản lý download tokens
- [ ] Quản lý coupon/mã giảm giá
- [ ] Search functionality
- [ ] Product reviews/ratings (user-generated)

### Ưu Tiên THẤP
- [ ] Tối ưu performance (lazy load, image optimization)
- [ ] Accessibility (WCAG)
- [ ] Cross-browser testing
- [ ] Multi-language (i18n)
- [ ] Analytics/Reports nâng cao
- [ ] Newsletter signup

---

## 📝 Ghi Chú Kỹ Thuật

### Design System
- **Colors:** Dark theme với teal accent (#00D4D4)
- **Fonts:** Exo 2 (headings), Be Vietnam Pro (body)
- **Style:** Dark futuristic, card glow effects

### Tech Stack
- **Frontend:** Vanilla HTML/CSS/JS (không framework)
- **Backend/Database:** Firebase (Firestore, Auth, Storage)
- **Hosting:** Vercel (static + serverless functions)
- **Payment:** SePay VietQR (BIDV)
- **Email:** Resend SDK

### Environment Variables (Vercel)
| Variable | Mô tả |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | JSON service account key |
| `SEPAY_API_KEY` | SePay webhook API key |
| `RESEND_API_KEY` | Resend email API key |
| `INTERNAL_API_KEY` | Internal auth key |

### Thông Tin Đăng Nhập Admin
- **URL:** https://sonnhai.vercel.app/admin
- **Email:** admin@sonnhai.com
- **Password:** admin@12345

---

## 🐛 Lỗi Đã Sửa (Tổng Hợp)

### Phiên 01/05/2026
- Thank-you page: Font, link navigation
- Admin modal: z-index, HTML thiếu

### Phiên 03/05/2026 (Sáng)
- **10 critical bugs** (parseInt trên Firestore IDs)
- Cart, Categories, Checkout, Admin modal categories

### Phiên 03/05/2026 (Tối)
- Admin Product Editor: parseInt bug, wrong categories, missing fields
- Save speed: Optimistic UI pattern
- Cross-page sync: Clear sndata_products cache

### Phiên 04/05/2026
- **account.html encoding corruption** — File bị hỏng encoding (UTF-16LE → garbled ï¿½)
  - Fix: Lấy navbar/footer sạch từ index.html, fix ~714 ký tự garbled
- **OTP send-otp.js** — Composite index requirement + JS Date vs Firestore Timestamp
- **HTML structure** — `</div>div>` bị hỏng

---

## ✅ Công Việc Phiên 04/05/2026

### Phase 12: Gmail OTP Login ✅
**Mục tiêu:** Thay đăng nhập email+password bằng OTP qua Gmail

| File | Thay đổi |
|---|---|
| `api/auth/send-otp.js` | **[MỚI]** API gửi OTP 6 số qua Resend, rate limit 2 phút, chỉ Gmail |
| `api/auth/verify-otp.js` | **[MỚI]** API xác thực OTP, tạo/tìm user Firebase, trả custom token |
| `api/email/templates.js` | Thêm `otpEmail()` template dark theme |
| `firebase.js` | Thêm `signInWithCustomToken` + `loginWithOTP()` |
| `auth-ui.js` | Rewrite modal: email+password → OTP 2 bước + Google login |
| `account.html` | Auth page: OTP flow thay login/register forms + fix encoding |
| `firestore.rules` | Thêm `otp_codes` collection rule (server-only) |
| `vercel.json` | Thêm rewrites `/api/auth/send-otp`, `/api/auth/verify-otp` |

**Flow:**
```
User → Nhập Gmail → API send-otp → Email OTP 6 số
User → Nhập OTP → API verify-otp → Firebase Custom Token → Đăng nhập
```

**Bảo mật:**
- Chỉ `@gmail.com`, rate limit 2 phút/email
- OTP hết hạn 2 phút, Firestore `otp_codes` server-only
- Giữ nút "Tiếp tục với Google" (Firebase Auth popup)

---

## 🔄 Đang Triển Khai

### Phase 13: Ảnh Bìa Sản Phẩm ✅ (Hoàn thành 04/05/2026 chiều)
**Mục tiêu:** Thay emoji sản phẩm bằng ảnh thực từ `chuan/`

**14 ảnh đã chuẩn bị:**
- `an_chua_huyen_co.jpeg`, `ban_chat_tai_chinh.jpeg`, `goc_nhin_tao_lap.jpeg`
- `he_thong_manh_me.jpeg`, `logic_nguoi_ngheo.jpeg`, `muu_luoc_tai_chinh.jpeg`
- `muu_luoc_tuoir_tre.jpeg`, `nhan_tinh_den_trang.jpeg`, `thuc_tinh_nhan_thuc.jpeg`
- `tinh_cam_bi_tich.jpeg`, `tu_duy_cuong_gia.jpeg`, `tu_duy_sau_sac.jpeg`
- `tuyet_mat_nhan_tinh.jpeg`, `xuyen_thau_nhan_tinh.jpeg`

**Công việc đã hoàn thành:**

| # | Công việc | File | Trạng thái |
|---|---|---|---|
| 1 | Thêm `imageUrl` vào 10 sản phẩm mặc định | `js/cart-badge.js` | ✅ |
| 2 | Auto-generate `imageUrl` từ slug trong `normalizeProduct()` | `js/cart-badge.js`, `js/firestore-sync.js` | ✅ |
| 3 | Cache version check (buộc refresh khi cấu trúc data thay đổi) | `js/cart-badge.js` | ✅ |
| 4 | Featured grid cards — render `<img>` thay emoji | `index.html` | ✅ |
| 5 | Featured split cover — hardcoded `<img>` + CSS `has-image` | `index.html` | ✅ |
| 6 | Bestseller list — render `<img>` thay emoji | `index.html` | ✅ |
| 7 | Product grid — render `<img>` thay emoji | `categories.html` | ✅ |
| 8 | Product gallery — inject `<img>` thay 3D book emoji | `product.html` | ✅ |
| 9 | Related products — hardcoded `<img>` | `product.html` | ✅ |
| 10 | Cart items + upsell — render `<img>` | `cart.html` | ✅ |
| 11 | Deploy ảnh qua Vercel (`chuan/` → `public/chuan/`) | `prepare-public.js` | ✅ |

**Chi tiết kỹ thuật:**
- `normalizeProduct()` auto-generate: slug `tuyet-mat-nhan-tinh` → `chuan/tuyet_mat_nhan_tinh.jpeg`
- Cache version: `sonhai_products_version = 2` → force-refresh localStorage khi structure thay đổi
- Tất cả ảnh có `onerror` fallback về emoji nếu ảnh lỗi
- CSS `.feat-cover.has-image::before/::after { display: none }` ẩn pseudo-elements khi có ảnh
- `prepare-public.js` đã thêm `chuan` vào `dirs = ['css', 'js', 'chuan']`

**Trạng thái deploy:**
- ✅ Commit `e9226d2` — push thành công lên GitHub
- ✅ Vercel build thành công (43s), deploy Production
- ✅ Ảnh accessible qua URL (đã test: `sonnhai.vercel.app/chuan/he_thong_manh_me.jpeg?v=1`)
- ⚠️ Vercel Edge CDN có thể cache 404 cũ cho URL không có query string — tự hết hạn sau vài phút

---

## 🚧 Công Việc Cần Làm Tiếp (Phiên Sau)

### Ưu Tiên CAO
- [ ] Kiểm tra ảnh sản phẩm trên production (sonnhai.vercel.app) — xác nhận edge cache đã clear
- [ ] Admin modal: dropdown chọn ảnh từ `chuan/` + preview (hiện admin vẫn dùng emoji)
- [ ] Firestore: đảm bảo `imageUrl` field được lưu khi admin edit sản phẩm
- [ ] Custom domain (sonnhai.com → Vercel)
- [ ] Email domain verify trên Resend

### Ưu Tiên TRUNG BÌNH
- [ ] Thêm 4 sản phẩm còn thiếu (hiện chỉ có 10/14 ảnh được map vào SP)
  - Chưa map: `an_chua_huyen_co`, `ban_chat_tai_chinh`, `goc_nhin_tao_lap`, `muu_luoc_tuoir_tre`
- [ ] Upload file PDF/EPUB cho sản phẩm (digital delivery)
- [ ] Quản lý download tokens
- [ ] Quản lý coupon/mã giảm giá
- [ ] Search functionality
- [ ] Product reviews/ratings (user-generated)

### Ưu Tiên THẤP
- [ ] Tối ưu performance (lazy load, image optimization — ảnh ~900KB/ảnh cần optimize)
- [ ] Accessibility (WCAG)
- [ ] Cross-browser testing
- [ ] Multi-language (i18n)
- [ ] Analytics/Reports nâng cao
- [ ] Newsletter signup

---

## 🏗️ Kiến Trúc Hiện Tại

| Component | Tech |
|---|---|
| Frontend | Static HTML + Vanilla JS + CSS |
| Backend | Vercel Serverless Functions (Node.js) |
| Database | Firebase Firestore |
| Auth | Firebase Auth (Google + Gmail OTP) |
| Payment | SePay VietQR |
| Email | Resend API |
| Hosting | Vercel |

### Biến Môi Trường (Vercel)

| Key | Mô tả |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Admin SDK credentials (JSON) |
| `SEPAY_API_KEY` | SePay webhook API key |
| `RESEND_API_KEY` | Resend email API key |
| `INTERNAL_API_KEY` | Internal auth key |

### Thông Tin Đăng Nhập Admin
- **URL:** https://sonnhai.vercel.app/admin
- **Email:** admin@sonnhai.com
- **Password:** admin@12345

---

## 🐛 Lỗi Đã Sửa (Tổng Hợp)

### Phiên 01/05/2026
- Thank-you page: Font, link navigation
- Admin modal: z-index, HTML thiếu

### Phiên 03/05/2026 (Sáng)
- **10 critical bugs** (parseInt trên Firestore IDs)
- Cart, Categories, Checkout, Admin modal categories

### Phiên 03/05/2026 (Tối)
- Admin Product Editor: parseInt bug, wrong categories, missing fields
- Save speed: Optimistic UI pattern
- Cross-page sync: Clear sndata_products cache

### Phiên 04/05/2026
- account.html encoding corruption (714 garbled chars fixed)
- OTP API: composite index + Firestore Timestamp fix
- HTML structure: broken `</div>div>` tag

### Phiên 04/05/2026 (Chiều) — Phase 13
- Thay toàn bộ emoji sản phẩm bằng ảnh thật trên 5 trang (index, categories, product, cart)
- Fix `prepare-public.js` thiếu copy `chuan/` folder → Vercel production 404

---

## 📝 Lưu Ý Cho Phiên Sau

### Các file chính đã sửa trong Phase 13:
| File | Thay đổi chính |
|---|---|
| `js/cart-badge.js` | +`imageUrl` cho 10 SP, `normalizeProduct()` auto-generate, cache version=2 |
| `js/firestore-sync.js` | `normalizeProduct()` auto-generate `imageUrl` từ slug |
| `index.html` | 3 sections render ảnh: featured grid, bestseller, featured split |
| `categories.html` | Product grid render `<img>` với fallback emoji |
| `product.html` | Gallery inject img + related products hardcoded img |
| `cart.html` | Cart items + upsell section dùng `<img>` |
| `prepare-public.js` | Thêm `'chuan'` vào dirs array để Vercel copy ảnh |

### Quy tắc `imageUrl` auto-generate:
```
Slug: "tuyet-mat-nhan-tinh"
→ imageUrl: "chuan/tuyet_mat_nhan_tinh.jpeg"
(replace dấu gạch ngang bằng gạch dưới + thêm .jpeg)
```

### 4 ảnh chưa được map vào sản phẩm:
- `an_chua_huyen_co.jpeg` — chưa có SP tương ứng
- `ban_chat_tai_chinh.jpeg` — chưa có SP tương ứng
- `goc_nhin_tao_lap.jpeg` — chưa có SP tương ứng
- `muu_luoc_tuoir_tre.jpeg` — chưa có SP tương ứng

---

**Tổng kết:** Website đã hoàn thành Phase 1-13. Ảnh bìa sản phẩm thật đã thay thế emoji trên toàn bộ storefront. Live tại https://sonnhai.vercel.app với đầy đủ chức năng: store, cart, checkout (SePay), email tự động, admin CMS, Gmail OTP login, ảnh sản phẩm thật.

