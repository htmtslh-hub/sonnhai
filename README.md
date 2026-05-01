# Thư viện Sơn Nhai - Deploy Guide

## 🚀 Deploy lên GitHub + Vercel (5 phút)

### Bước 1: Tạo GitHub Repository

1. Mở https://github.com/new
2. Đặt tên: `thu-vien-son-nhai`
3. Chọn **Public** hoặc **Private**
4. Click **Create repository**
5. Copy URL của repo (ví dụ: `https://github.com/your-username/thu-vien-son-nhai.git`)

### Bước 2: Push Code lên GitHub

Mở terminal trong thư mục dự án, chạy:

```bash
git remote add origin https://github.com/YOUR-USERNAME/thu-vien-son-nhai.git
git branch -M main
git push -u origin main
```

Thay `YOUR-USERNAME` bằng username GitHub của bạn.

### Bước 3: Deploy lên Vercel

#### Cách 1: Dùng Vercel CLI (Nhanh nhất)

```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Deploy
vercel
```

Làm theo hướng dẫn trên terminal:
1. Login với GitHub account
2. Chọn project
3. Confirm settings (Enter cho tất cả)
4. Đợi deploy hoàn tất

**URL:** `https://thu-vien-son-nhai.vercel.app`

#### Cách 2: Deploy từ Vercel Dashboard (Không cần CLI)

1. Mở https://vercel.com/new
2. Click **Import Git Repository**
3. Chọn repo `thu-vien-son-nhai`
4. Settings:
   - **Framework Preset:** Other
   - **Build Command:** `node prepare-public.js`
   - **Output Directory:** `public`
   - **Install Command:** (để trống)
5. Click **Deploy**

### Bước 4: Kiểm Tra

Sau khi deploy xong:

✅ Mở `https://thu-vien-son-nhai.vercel.app` → Trang chủ  
✅ Mở `https://thu-vien-son-nhai.vercel.app/api/health` → API health check  
✅ Mở `https://thu-vien-son-nhai.vercel.app/api/products` → Danh sách sản phẩm

---

## 📁 Cấu Trúc Dự Án

```
/
├── api/                    # Vercel Serverless Functions
│   ├── health.js          # GET /api/health
│   ├── products.js        # GET /api/products
│   ├── checkout.js        # POST /api/checkout
│   ├── lib.js             # Shared mock data
│   ├── cart/
│   │   ├── index.js       # GET /api/cart
│   │   ├── add.js         # POST /api/cart/add
│   │   ├── remove.js      # POST /api/cart/remove
│   │   └── count.js       # GET /api/cart/count
│   ├── newsletter/
│   │   └── subscribe.js   # POST /api/newsletter/subscribe
│   └── seapay/
│       └── create-payment.js  # POST /api/seapay/create-payment
├── public/                # Generated frontend files
│   ├── *.html            # 13 pages
│   ├── css/              # Stylesheets
│   ├── js/               # Client scripts
│   └── *.jpg             # Images
├── vercel.json           # Vercel configuration
├── package.json          # NPM scripts
└── prepare-public.js     # Build script
```

## 🔄 Re-deploy sau khi sửa code

```bash
# 1. Commit changes
git add -A
git commit -m "Update: your message"
git push

# 2. Deploy
vercel --prod
```

Hoặc nếu dùng GitHub integration, Vercel sẽ tự động deploy mỗi khi push lên main branch.

## 📊 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/products` | Danh sách sản phẩm |
| GET | `/api/products?id=1` | Chi tiết sản phẩm |
| GET | `/api/cart` | Xem giỏ hàng |
| POST | `/api/cart/add` | Thêm vào giỏ |
| POST | `/api/cart/remove` | Xóa khỏi giỏ |
| GET | `/api/cart/count` | Đếm số lượng trong giỏ |
| POST | `/api/checkout` | Thanh toán |
| POST | `/api/newsletter/subscribe` | Đăng ký nhận tin |
| POST | `/api/seapay/create-payment` | Tạo thanh toán SeaPay |

## ⚠️ Lưu Ý

1. **Mock Data:** API hiện dùng mock data (in-memory). Mỗi lần deploy sẽ reset.
2. **Cart:** Dữ liệu giỏ hàng lưu trong RAM, mất khi function idle.
3. **Database:** Chưa tích hợp database. Cần setup sau.
4. **Auth:** Admin panel dùng mock login (admin/admin123).

## 🎯 Next Steps (Sau khi deploy thành công)

- [ ] Tích hợp database (Firestore / PostgreSQL / MongoDB)
- [ ] Setup authentication thật (Firebase Auth / NextAuth)
- [ ] Tích hợp payment gateway (Stripe, VNPay, MoMo)
- [ ] Cấu hình email service (Resend / Nodemailer)
- [ ] Setup custom domain trên Vercel
- [ ] Thêm monitoring & analytics
