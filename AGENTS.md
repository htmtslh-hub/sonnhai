# AGENTS.md — Digital Products Store

## Project Overview

Website thương mại điện tử bán sản phẩm số (sách, PDF, tài liệu học tập). Giao diện theo phong cách **dark futuristic** — nền đen/tối, accent màu teal/cyan (`#00D4D4`, `#00B4CC`), typography mạnh, card có glow effect, hiệu ứng gradient tinh tế.

**Tech Stack:**
- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui (customized dark theme)
- **Backend:** Next.js API Routes + Node.js
- **Database:** PostgreSQL (via Prisma ORM)
- **Auth:** NextAuth.js (credentials + Google OAuth)
- **Payment:** Stripe + VNPay / MoMo (webhook-based)
- **File Storage:** Cloudflare R2 (lưu PDF, ebook)
- **Email:** Resend (transactional emails)
- **Cache:** Redis (cart, session, rate limiting)
- **Search:** Algolia hoặc Meilisearch
- **Deployment:** Vercel (frontend) + Railway / Render (backend services)

---

## Design System

### Color Palette
```
Background:   #0A0A0F  (primary dark)
Surface:      #0F1117  (card background)
Surface-2:    #161B27  (elevated surface)
Border:       #1E2433  (subtle border)
Accent:       #00D4D4  (teal primary)
Accent-dim:   #00B4CC  (teal secondary)
Accent-glow:  rgba(0, 212, 212, 0.15)
Text:         #E8EAF0  (primary text)
Text-muted:   #6B7280  (secondary text)
Success:      #10B981
Warning:      #F59E0B
Error:        #EF4444
```

### Typography
- **Heading font:** Orbitron hoặc Space Grotesk (futuristic feel)
- **Body font:** Inter hoặc DM Sans
- Heading sizes: `text-5xl` / `text-4xl` / `text-3xl` / `text-xl`
- Body: `text-base` (16px), line-height 1.6

### Component Patterns
- **Cards:** `bg-[#0F1117] border border-[#1E2433] rounded-xl` + hover glow `shadow-[0_0_20px_rgba(0,212,212,0.1)]`
- **Buttons (primary):** `bg-[#00D4D4] text-black font-semibold` + hover scale + glow
- **Buttons (outline):** `border border-[#00D4D4] text-[#00D4D4]` + hover bg fill
- **Badges:** Pill shape, teal/glow background
- **Gradients:** `from-[#00D4D4]/20 via-transparent to-transparent`
- **Hover effects:** scale 1.02, border color brighten, glow intensify

---

## Project Structure

```
/
├── app/                          # Next.js App Router
│   ├── (store)/                  # Public store layout
│   │   ├── page.tsx              # Trang chủ
│   │   ├── categories/
│   │   │   ├── page.tsx          # Danh mục tất cả
│   │   │   └── [slug]/page.tsx   # Danh mục cụ thể
│   │   ├── products/
│   │   │   └── [slug]/page.tsx   # Chi tiết sản phẩm
│   │   ├── cart/page.tsx         # Giỏ hàng
│   │   ├── checkout/page.tsx     # Checkout
│   │   ├── thank-you/page.tsx    # Cảm ơn
│   │   ├── account/              # Tài khoản khách hàng
│   │   │   ├── page.tsx          # Dashboard
│   │   │   ├── orders/page.tsx   # Đơn hàng
│   │   │   ├── downloads/page.tsx# File đã mua
│   │   │   └── settings/page.tsx # Cài đặt
│   │   └── blog/
│   │       ├── page.tsx          # Danh sách bài viết
│   │       └── [slug]/page.tsx   # Chi tiết bài viết
│   ├── (admin)/                  # Admin dashboard layout
│   │   └── admin/
│   │       ├── page.tsx          # Dashboard overview
│   │       ├── products/         # Quản lý sản phẩm
│   │       ├── orders/           # Quản lý đơn hàng
│   │       ├── customers/        # Quản lý khách hàng
│   │       ├── inventory/        # Quản lý tồn kho (licenses/slots)
│   │       ├── coupons/          # Mã giảm giá
│   │       └── emails/           # Email templates
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth
│   │   ├── products/             # CRUD products
│   │   ├── orders/               # Order management
│   │   ├── cart/                 # Cart operations
│   │   ├── checkout/             # Checkout flow
│   │   ├── coupons/              # Coupon validation
│   │   ├── downloads/            # Secure file download
│   │   ├── webhooks/
│   │   │   ├── stripe/           # Stripe webhook
│   │   │   ├── vnpay/            # VNPay webhook
│   │   │   └── momo/             # MoMo webhook
│   │   └── emails/               # Email triggers
│   └── layout.tsx
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── store/                    # Store-specific components
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   ├── ProductCard.tsx
│   │   ├── ProductGrid.tsx
│   │   ├── CartDrawer.tsx
│   │   ├── CheckoutForm.tsx
│   │   ├── CategoryNav.tsx
│   │   └── SearchModal.tsx
│   └── admin/                    # Admin-specific components
│       ├── AdminSidebar.tsx
│       ├── DataTable.tsx
│       └── StatsCard.tsx
├── lib/
│   ├── prisma.ts                 # Prisma client
│   ├── auth.ts                   # NextAuth config
│   ├── stripe.ts                 # Stripe client
│   ├── r2.ts                     # Cloudflare R2 client
│   ├── resend.ts                 # Email client
│   ├── redis.ts                  # Redis client
│   └── utils.ts
├── prisma/
│   └── schema.prisma
├── emails/                       # React Email templates
│   ├── OrderConfirmation.tsx
│   ├── DownloadReady.tsx
│   ├── WelcomeEmail.tsx
│   └── PasswordReset.tsx
└── public/
```

---

## Database Schema (Prisma)

Key models — implement all of these:

```prisma
model User { ... }           # Khách hàng
model Product { ... }        # Sản phẩm số
model Category { ... }       # Danh mục
model Order { ... }          # Đơn hàng
model OrderItem { ... }      # Chi tiết đơn
model DownloadToken { ... }  # Token tải file (expire sau N lần/ngày)
model Coupon { ... }         # Mã giảm giá
model Review { ... }         # Đánh giá sản phẩm
model BlogPost { ... }       # Bài viết blog
model EmailLog { ... }       # Log email đã gửi
```

---

## Page Specifications

### Trang Chủ (`/`)
- Hero section: headline lớn, gradient text teal, CTA button, background particle/glow effect
- Featured products: horizontal scroll card grid
- Category showcase: icon + tên danh mục dạng pill/card
- Bestsellers section: top 6-8 sản phẩm
- Social proof: số lượng khách hàng, đánh giá sao
- Latest blog posts: 3 bài mới nhất
- Newsletter signup

### Danh Mục (`/categories/[slug]`)
- Filter sidebar: giá, rating, loại file, ngày đăng
- Sort: mới nhất, bán chạy, giá tăng/giảm
- Product grid: 3-4 cột, lazy load / infinite scroll
- Active filter chips
- Empty state design

### Chi Tiết Sản Phẩm (`/products/[slug]`)
- Gallery: preview ảnh bìa + preview trang sample
- Tên, mô tả, giá, badge "DIGITAL DOWNLOAD"
- Add to cart + Buy Now buttons (teal glow)
- Thông tin file: định dạng PDF/EPUB, dung lượng, số trang
- Tab: Mô tả / Mục lục / Đánh giá
- Related products
- Schema.org structured data cho SEO

### Giỏ Hàng (`/cart`)
- Drawer (slide-in) hoặc trang riêng
- Line items với thumbnail, tên, giá
- Coupon code input
- Order summary: tạm tính, giảm giá, tổng
- Upsell: "Khách hàng cũng mua..."

### Checkout (`/checkout`)
- Guest checkout + đăng nhập
- Thông tin: email, họ tên (không cần địa chỉ giao hàng — digital)
- Payment methods: Stripe card, VNPay QR, MoMo
- Real-time coupon validation
- Order review trước khi đặt

### Trang Cảm Ơn (`/thank-you`)
- Animated success (confetti/glow)
- Tóm tắt đơn hàng
- Hướng dẫn: "Email xác nhận + link tải đã gửi vào [email]"
- Download buttons ngay tại đây (nếu thanh toán thành công)
- CTA: tiếp tục mua sắm, chia sẻ

### Tài Khoản (`/account/*`)
- Dashboard: đơn hàng gần đây, file đã mua
- Lịch sử đơn hàng + trạng thái
- My Downloads: danh sách file với nút tải, số lần còn lại
- Đổi mật khẩu, thông tin cá nhân

---

## Backend Modules

### Quản Lý Sản Phẩm
- CRUD đầy đủ: tên, slug, mô tả, giá, giá gốc (để hiện % giảm), ảnh bìa
- Upload file PDF/EPUB lên Cloudflare R2 (presigned URL)
- SEO fields: meta title, meta description, OG image
- Trạng thái: draft / published / archived
- Bulk actions: publish, archive, delete

### Quản Lý Đơn Hàng
- Danh sách đơn với filter theo trạng thái: pending / paid / failed / refunded
- Chi tiết đơn: thông tin khách, sản phẩm, payment method, timeline
- Manual resend download email
- Refund (trigger Stripe refund API)
- Export CSV

### Quản Lý Tồn Kho
- Với sản phẩm số: quản lý **license slots** (giới hạn số lượng bán) hoặc unlimited
- Cảnh báo khi slots sắp hết
- Download limit per order (VD: mỗi file tải tối đa 5 lần trong 30 ngày)
- Revoke access nếu refund

### Quản Lý Khách Hàng
- Danh sách user, lịch sử mua hàng
- Tổng chi tiêu, sản phẩm đã mua
- Manually grant/revoke sản phẩm
- Gửi email thủ công

### Quản Lý Mã Giảm Giá
- Tạo coupon: % hoặc số tiền cố định
- Giới hạn: số lần dùng tổng, số lần / user, thời hạn
- Áp dụng cho: tất cả / danh mục / sản phẩm cụ thể
- Tracking: đã dùng bao nhiêu lần

### Webhook Thanh Toán
- **Stripe:** `payment_intent.succeeded` → cập nhật order PAID → tạo download tokens → gửi email
- **VNPay:** verify HMAC → cập nhật order → trigger email
- **MoMo:** verify signature → cập nhật order → trigger email
- Idempotency: check duplicate webhook events
- Retry queue với Redis nếu email fail

### Hệ Thống Email Tự Động (Resend + React Email)

| Trigger | Template |
|---|---|
| Đăng ký tài khoản | Welcome + verify email |
| Đặt hàng thành công | Order confirmation + download links |
| Thanh toán thất bại | Retry payment link |
| Quên mật khẩu | Password reset link |
| Admin gửi thủ công | Custom message |

---

## Security Requirements

- Download URLs phải là **signed/tokenized** — không expose S3/R2 URL trực tiếp
- Download tokens: expire sau 30 ngày, tối đa 5 lần tải / file / order
- Rate limiting trên API (Redis): checkout, coupon check, download
- Webhook endpoints: verify signature (Stripe secret, VNPay HMAC, MoMo signature)
- Admin routes: require role `ADMIN`, separate middleware check
- Input sanitization trên tất cả form fields
- CSRF protection (NextAuth built-in)
- File upload: chỉ accept PDF/EPUB/ZIP, max 500MB, scan tên file

---

## SEO Requirements

- Next.js `generateMetadata()` cho tất cả dynamic pages
- Schema.org `Product`, `BreadcrumbList`, `BlogPosting`
- Open Graph + Twitter Card tags
- Sitemap tự động (`app/sitemap.ts`)
- robots.txt
- Canonical URLs
- Vietnamese locale: `lang="vi"`, currency VNĐ (VND)

---

## Development Guidelines

### Code Style
- TypeScript strict mode — không dùng `any`
- Tất cả component dùng Server Components khi có thể, Client Component khi cần interactivity
- Tên file: `PascalCase` cho components, `camelCase` cho utils/lib
- Dùng `zod` cho tất cả form validation và API input validation

### API Conventions
- RESTful routes: `GET /api/products`, `POST /api/orders`
- Response format: `{ data: ..., error: null }` hoặc `{ data: null, error: "message" }`
- HTTP status codes đúng chuẩn
- Prisma errors phải được catch và trả về user-friendly message

### State Management
- Cart state: `zustand` + persist to localStorage
- Server state / data fetching: TanStack Query (React Query)
- Form state: React Hook Form + Zod resolver

### Testing
- Unit tests: Vitest cho utils và lib functions
- Integration tests: API routes với test database
- E2E tests (optional): Playwright cho critical flows (checkout, download)

### Environment Variables
```
# Database
DATABASE_URL=

# Auth
NEXTAUTH_SECRET=
NEXTAUTH_URL=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Payment
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
VNPAY_TMN_CODE=
VNPAY_HASH_SECRET=
MOMO_PARTNER_CODE=
MOMO_ACCESS_KEY=
MOMO_SECRET_KEY=

# Storage
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_PUBLIC_URL=

# Email
RESEND_API_KEY=

# Redis
REDIS_URL=

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_APP_NAME=
```

---

## Vietnamese Localization

- Currency: hiển thị `đ` hoặc `VNĐ`, format: `150.000đ`
- Phone: Vietnam format (+84)
- Date format: `DD/MM/YYYY`
- Tất cả UI text bằng tiếng Việt
- Error messages bằng tiếng Việt
- Email templates bằng tiếng Việt
- SEO meta description bằng tiếng Việt

---

## Launch Checklist

- [ ] SSL / HTTPS
- [ ] Payment gateway test mode → live mode
- [ ] Webhook endpoints verified
- [ ] Email deliverability test (SPF, DKIM, DMARC)
- [ ] Download flow end-to-end test
- [ ] Mobile responsive check (360px → 1440px)
- [ ] PageSpeed Insights ≥ 90
- [ ] Google Analytics / Pixel setup
- [ ] Error monitoring (Sentry)
- [ ] Database backups configured
- [ ] Rate limiting enabled
- [ ] Terms of Service + Privacy Policy pages
