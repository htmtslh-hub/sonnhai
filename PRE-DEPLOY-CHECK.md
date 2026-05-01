# Báo Cáo Kiểm Tra Dự Án Trước Khi Deploy
**Ngày kiểm tra:** 01/05/2026
**Dự án:** Thư viện Sơn Nhai - Website bán sách số

---

## ❌ VẤN ĐỀ NGHIÊM TRỌNG (Phải sửa trước khi deploy)

### 1. Hardcoded Localhost URLs (17 chỗ)

**Các file bị ảnh hưởng:**
- `cart.html` - 2 chỗ
- `categories.html` - 1 chỗ
- `index.html` - 4 chỗ
- `product.html` - 5 chỗ
- `account.html` - có (binary match)
- `checkout.html` - có (binary match)
- `seapay-return.html` - có (binary match)
- `js/cart-badge.js` - 1 chỗ

**Chi tiết:**
```javascript
// ❌ SAI - Hardcoded localhost
fetch('http://localhost:3000/api/cart/add', ...)

// ✅ ĐÚNG - Relative URL
fetch('/api/cart/add', ...)
```

**Tác động:**
- Khi deploy lên Firebase, tất cả API calls sẽ fail
- Frontend sẽ không kết nối được với backend
- Checkout, cart, authentication sẽ không hoạt động

**Giải pháp:**
Thay tất cả `http://localhost:3000/api` → `/api`

---

### 2. Binary Files trong HTML

**Các file bị lỗi encoding:**
- `account.html`
- `checkout.html`
- `seapay-return.html`

**Triệu chứng:**
```bash
grep: account.html: binary file matches
```

**Nguyên nhân có thể:**
- File bị corrupt
- Encoding sai (UTF-16 thay vì UTF-8)
- Có ký tự đặc biệt không hợp lệ

**Tác động:**
- File có thể không hiển thị đúng trên browser
- Có thể gây lỗi khi deploy

**Giải pháp:**
1. Mở file bằng editor
2. Save as UTF-8 (no BOM)
3. Hoặc tạo lại file từ backup

---

## ⚠️ VẤN ĐỀ TRUNG BÌNH (Nên sửa)

### 3. Thiếu API Base URL Configuration

**Vấn đề:**
Không có file config để quản lý API base URL tập trung.

**Hiện tại:**
- Mỗi file HTML tự hardcode URL
- Khó maintain khi thay đổi domain

**Giải pháp:**
Tạo `js/config.js`:
```javascript
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3000/api'
  : '/api';

export { API_BASE };
```

Hoặc đơn giản hơn, dùng relative URL `/api` cho tất cả.

---

### 4. Placeholder Images

**File:** `thank-you.html`
```html
<img src="https://via.placeholder.com/40" alt="Product">
```

**Vấn đề:**
- Dùng placeholder từ bên thứ 3
- Không có ảnh thật cho sản phẩm

**Giải pháp:**
- Thay bằng ảnh thật từ database
- Hoặc dùng default image local

---

### 5. External CDN Dependencies

**Các CDN đang dùng:**
- Google Fonts (OK)
- Chart.js từ jsdelivr (OK)
- `https://cdn.sonnhai.com` (⚠️ Chưa rõ)

**Lưu ý:**
- CDN có thể down
- Nên có fallback hoặc self-host critical assets

---

## ✅ ĐIỂM TỐT

### 1. Cấu Trúc Dự Án
- ✅ 14 trang HTML hoàn chỉnh
- ✅ CSS/JS được tổ chức trong folders
- ✅ Backend có đầy đủ dependencies
- ✅ Database SQLite hoạt động

### 2. Backend
- ✅ Express server hoàn chỉnh
- ✅ Dependencies đầy đủ (12 packages)
- ✅ Có .env.example
- ✅ Firebase Admin SDK đã setup

### 3. Frontend
- ✅ Responsive design
- ✅ Dark theme nhất quán
- ✅ Google Fonts load đúng
- ✅ Animation/parallax effects

---

## 📋 CHECKLIST SỬA CHỮA

### Ưu tiên CAO (Phải làm ngay)
- [ ] **Sửa tất cả localhost URLs** (17 chỗ)
  - [ ] cart.html (2)
  - [ ] categories.html (1)
  - [ ] index.html (4)
  - [ ] product.html (5)
  - [ ] account.html
  - [ ] checkout.html
  - [ ] seapay-return.html
  - [ ] js/cart-badge.js (1)

- [ ] **Fix binary file encoding**
  - [ ] account.html
  - [ ] checkout.html
  - [ ] seapay-return.html

### Ưu tiên TRUNG BÌNH (Nên làm)
- [ ] Tạo API config file tập trung
- [ ] Thay placeholder images
- [ ] Test tất cả API endpoints
- [ ] Verify Firebase config

### Ưu tiên THẤP (Có thể làm sau)
- [ ] Self-host Chart.js
- [ ] Optimize images
- [ ] Add error handling
- [ ] Add loading states

---

## 🔧 SCRIPT TỰ ĐỘNG SỬA

Tạo `fix-localhost.sh`:
```bash
#!/bin/bash

# Backup files
mkdir -p backup
cp *.html backup/
cp js/*.js backup/

# Replace localhost URLs
find . -name "*.html" -type f -exec sed -i 's|http://localhost:3000/api|/api|g' {} +
find js/ -name "*.js" -type f -exec sed -i 's|http://localhost:3000/api|/api|g' {} +

echo "✓ Fixed localhost URLs"
echo "Backup saved in backup/"
```

Chạy:
```bash
bash fix-localhost.sh
```

---

## 📊 THỐNG KÊ

### Files
- **HTML:** 14 files
- **CSS:** 2 files (animations.css, parallax-animations.css)
- **JS:** 3 files (animations.js, cart-badge.js, parallax-engine.js)
- **Backend:** 6 JS files + routes/

### Issues Found
- **Critical:** 2 (localhost URLs, binary files)
- **Medium:** 3 (config, placeholders, CDN)
- **Low:** 0

### Estimated Fix Time
- **Localhost URLs:** 30 phút (tự động)
- **Binary files:** 15 phút (manual)
- **Config:** 15 phút
- **Total:** ~1 giờ

---

## 🚀 NEXT STEPS

1. **Sửa localhost URLs** (30 phút)
   ```bash
   bash fix-localhost.sh
   ```

2. **Fix binary files** (15 phút)
   - Mở từng file
   - Save as UTF-8
   - Verify content

3. **Test local** (30 phút)
   ```bash
   cd backend
   npm start
   # Test từng trang
   ```

4. **Prepare for Firebase** (1 giờ)
   - Tạo firebase.json
   - Setup functions/
   - Migrate database

5. **Deploy** (theo plan)

---

## ⚠️ CẢNH BÁO

**KHÔNG DEPLOY** cho đến khi:
1. ✅ Tất cả localhost URLs đã được sửa
2. ✅ Binary files đã được fix
3. ✅ Test local thành công
4. ✅ Firebase Emulator test pass

**Nếu deploy với localhost URLs:**
- Website sẽ không hoạt động
- Tất cả API calls sẽ fail
- Users không thể mua hàng
- Admin panel không hoạt động

---

## 📝 GHI CHÚ

- Backend đang dùng SQLite, cần migrate sang Firestore
- Frontend đang dùng mock data ở một số chỗ
- Payment integration (Stripe, VNPay, MoMo) cần test kỹ
- Email service (Nodemailer) cần config SMTP

---

**Kết luận:** Dự án CẦN SỬA 2 vấn đề nghiêm trọng trước khi deploy. Ước tính 1 giờ để fix tất cả issues.
