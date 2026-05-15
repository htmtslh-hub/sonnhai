# SECURITY TODO — Các bước cần làm thủ công

## 1. Đặt Environment Variables trên Vercel

Vào Vercel Dashboard → Settings → Environment Variables, đảm bảo có:

- `FIREBASE_SERVICE_ACCOUNT` — JSON string của service account key
- `INTERNAL_API_KEY` — Key ngẫu nhiên 32+ ký tự (dùng: `openssl rand -hex 32`)
- `SEPAY_API_KEY` — API key từ SePay
- `RESEND_API_KEY` — API key từ Resend

## 2. Cập nhật Firestore Security Rules

Vào Firebase Console → Firestore → Rules, thay bằng:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Products: ai cũng đọc được, chỉ admin write qua server
    match /products/{productId} {
      allow read: if true;
      allow write: if false;
    }

    // Categories: ai cũng đọc được, chỉ admin write qua server
    match /categories/{categoryId} {
      allow read: if true;
      allow write: if false;
    }

    // Orders: chỉ user đọc đơn của mình, write qua server
    match /orders/{orderId} {
      allow read: if request.auth != null &&
        (resource.data.customerEmail == request.auth.token.email ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      allow write: if false;
    }

    // Users: chỉ đọc profile của mình
    match /users/{userId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow write: if false;
    }

    // OTP codes: không ai đọc/ghi từ client
    match /otp_codes/{docId} {
      allow read, write: if false;
    }

    // Payments: không ai đọc/ghi từ client
    match /payments/{docId} {
      allow read, write: if false;
    }

    // Emails log: không ai đọc/ghi từ client
    match /emails/{docId} {
      allow read, write: if false;
    }
  }
}
```

## 3. Chuyển Download URLs sang Firestore

Thay vì hardcode trong source code, lưu downloadUrl vào từng document trong collection `products`:

1. Vào Firebase Console → Firestore → products
2. Với mỗi sản phẩm, thêm field `downloadUrl` chứa link Google Drive
3. Sau khi tất cả sản phẩm đã có downloadUrl, xóa object `PRODUCT_DOWNLOAD_URLS` trong:
   - `api/seapay/webhook.js`
   - `api/admin/confirm-order.js`

## 4. Revoke Firebase Admin Key cũ

1. Vào Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" (key mới)
3. Copy nội dung JSON → paste vào Vercel env var `FIREBASE_SERVICE_ACCOUNT`
4. Key cũ tự động bị vô hiệu hóa

## 5. Cập nhật admin-app.js gửi token khi gọi confirm-order

Khi gọi `/api/admin/confirm-order` từ admin panel, cần gửi kèm Firebase ID token:

```javascript
const token = await auth.currentUser.getIdToken();
const res = await fetch('/api/admin/confirm-order', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  },
  body: JSON.stringify({ orderNumber }),
});
```

## 6. Google Drive — Hạn chế quyền truy cập

Với mỗi file sản phẩm trên Google Drive:
- Tắt "Anyone with the link can view"
- Chỉ share cho email cụ thể hoặc dùng signed URL có thời hạn
