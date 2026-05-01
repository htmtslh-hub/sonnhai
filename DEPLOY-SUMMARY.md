# Hướng Dẫn Deploy - Thư viện Sơn Nhai
**Project ID:** `ban-sach-24d69`
**Ngày:** 01/05/2026

---

## ✅ ĐÃ TỰ ĐỘNG HOÀN THÀNH

Tôi đã tạo tất cả file cấu hình cần thiết:

1. ✅ `firebase.json` - Firebase configuration
2. ✅ `.firebaserc` - Project ID: `ban-sach-24d69`
3. ✅ `firestore.rules` - Security rules
4. ✅ `firestore.indexes.json` - Database indexes
5. ✅ `functions/index.js` - API server với mock data
6. ✅ `functions/package.json` - Functions dependencies
7. ✅ `functions/node_modules/` - Đã install
8. ✅ `prepare-public.js` - Script copy frontend files
9. ✅ `package.json` - Build scripts
10. ✅ `public/` - Đã copy 13 HTML files + CSS + JS + images

---

## 🚀 BƯỚC 1: Login Firebase (BẮT BUỘC)

Mở terminal và chạy:
```bash
firebase login
```

Làm theo hướng dẫn trên trình duyệt để đăng nhập tài khoản Google.

**Kiểm tra:**
```bash
firebase projects:list
```

Phải thấy project `ban-sach-24d69` trong danh sách.

---

## 🚀 BƯỚC 2: Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

**Expected output:**
```
✔  firestore: released rules firestore.rules
```

---

## 🚀 BƯỚC 3: Deploy Functions

```bash
firebase deploy --only functions
```

**Expected output (3-5 phút):**
```
✔  functions[api(asia-southeast1)]: Successful create operation.
✔  Deploy complete!
```

---

## 🚀 BƯỚC 4: Deploy Hosting

```bash
npm run prepare-public
firebase deploy --only hosting
```

**Expected output (1-2 phút):**
```
✔  hosting: 20 files uploaded successfully
✔  Deploy complete!
```

**Production URL:** `https://ban-sach-24d69.web.app`

---

## 🚀 BƯỚC 5: Deploy Tất Cả (Nếu muốn)

Thay vì deploy từng phần, bạn có thể deploy tất cả cùng lúc:

```bash
# Từ thư mục gốc dự án
npm run deploy
```

Hoặc:
```bash
firebase deploy
```

---

## 🧪 TỰ TEST TRƯỚC KHI DEPLOY (Khuyến nghị)

### Test Local với Emulator

```bash
firebase emulators:start
```

Sau đó mở:
- **Frontend:** http://localhost:5000
- **API:** http://localhost:5001/api/health
- **Emulator UI:** http://localhost:4000

### Test Commands

```bash
# Test API health
curl http://localhost:5001/api/health

# Test products API
curl http://localhost:5001/api/products

# Test cart API
curl -X POST http://localhost:5001/api/cart/add \
  -H "Content-Type: application/json" \
  -d '{"productId": 1, "quantity": 1}'
```

---

## 🔍 POST-DEPLOYMENT CHECKLIST

### 1. Kiểm tra Hosting
- [ ] Mở `https://ban-sach-24d69.web.app`
- [ ] Trang chủ load đúng
- [ ] CSS/JS load không lỗi
- [ ] Images hiển thị

### 2. Kiểm tra API
- [ ] `https://ban-sach-24d69.web.app/api/health` → 200 OK
- [ ] `https://ban-sach-24d69.web.app/api/products` → Có data
- [ ] `https://ban-sach-24d69.web.app/api/cart/count` → 200 OK

### 3. Kiểm tra Functions
```bash
firebase functions:log
```

### 4. Kiểm tra Firestore
Mở Firebase Console → Firestore
- [ ] Database đã tạo
- [ ] Rules đang hoạt động

---

## 🐛 TROUBLESHOOTING

### Lỗi: `Error: Failed to authenticate`
**Giải pháp:** Chạy `firebase login` lại

### Lỗi: `Error: HTTP Error: 403`
**Giải pháp:** Kiểm tra project ID trong `.firebaserc` phải là `ban-sach-24d69`

### Lỗi: `Error: functions predeploy failed`
**Giải pháp:**
```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

### Lỗi: 404 Not Found trên API
**Giải pháp:** Kiểm tra `firebase.json` có rewrite rules cho `/api/**`

### Lỗi: CORS Error
**Giải pháp:** API đã có CORS enabled, kiểm tra browser console để biết thêm chi tiết

---

## 📁 CẤU TRÚC DỰ ÁN SAU KHI SETUP

```
/
├── firebase.json              # ✅ Firebase config
├── .firebaserc               # ✅ Project ID
├── firestore.rules           # ✅ Security rules
├── firestore.indexes.json    # ✅ Database indexes
├── package.json              # ✅ Build scripts
├── prepare-public.js         # ✅ Copy frontend script
├── public/                   # ✅ Frontend files (generated)
│   ├── *.html               # 13 pages
│   ├── css/                 # Stylesheets
│   ├── js/                  # Client scripts
│   └── *.jpg                # Images
├── functions/                # ✅ Firebase Functions
│   ├── index.js             # API server
│   ├── package.json         # Dependencies
│   └── node_modules/        # Installed
├── backend/                  # Original backend (không dùng cho Firebase)
├── css/                      # Original CSS (copied to public/)
├── js/                       # Original JS (copied to public/)
└── *.html                    # Original HTML (copied to public/)
```

---

## 💰 COST ESTIMATION

### Free Tier (Spark Plan)
- Hosting: 10GB storage, 360MB/day bandwidth
- Functions: 125K invocations/month
- Firestore: 50K reads, 20K writes/day

### Nếu vượt quota → Blaze Plan
- ~$25/month cho 1000 users/day
- Pay-as-you-go, không giới hạn

---

## 🔄 DEPLOY LẠI (Sau khi sửa code)

```bash
# 1. Copy files mới vào public/
npm run prepare-public

# 2. Deploy lại
firebase deploy
```

Hoặc riêng lẻ:
```bash
firebase deploy --only hosting     # Chỉ frontend
firebase deploy --only functions   # Chỉ API
firebase deploy --only firestore:rules  # Chỉ rules
```

---

## 📞 HỖ TRỢ

- **Firebase Console:** https://console.firebase.google.com/project/ban-sach-24d69
- **Hosting URL:** https://ban-sach-24d69.web.app
- **Functions Logs:** `firebase functions:log`
- **Emulator UI:** http://localhost:4000

---

## 🎯 LƯU Ý QUAN TRỌNG

1. **Mock data:** API hiện đang dùng mock data, chưa kết nối Firestore
2. **Admin panel:** Login vẫn dùng mock credentials (admin/admin123)
3. **Payment:** Chưa tích hợp Stripe/VNPay/MoMo
4. **Email:** Chưa cấu hình SMTP
5. **Database:** SQLite chưa được migrate sang Firestore

**Bước tiếp theo:** Sau khi deploy thành công, có thể:
- Migrate data từ SQLite sang Firestore
- Tích hợp payment gateways
- Cấu hình email service
- Setup authentication thật

---

## ✨ DONE!

Bạn đã sẵn sàng deploy! Chỉ cần chạy:

```bash
firebase login
firebase deploy
```

Và website sẽ live tại `https://ban-sach-24d69.web.app` 🚀
