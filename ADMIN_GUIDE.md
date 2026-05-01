# 📚 HƯỚNG DẪN SỬ DỤNG ADMIN DASHBOARD

**Thư viện Sơn Nhai - Admin System**  
Phiên bản: 1.0.0  
Ngày tạo: 2026-05-01

---

## 🔐 ĐĂNG NHẬP

**Thông tin đăng nhập mặc định:**
- **Email:** `admin@sonnhai.com`
- **Mật khẩu:** `admin123`

⚠️ **LƯU Ý:** Đổi mật khẩu ngay sau lần đăng nhập đầu tiên!

---

## 📊 CÁC MODULE CHÍNH

### 1. **Dashboard (Tổng quan)**
- 📈 Biểu đồ doanh thu 7 ngày
- 📊 Thống kê: Doanh thu, Đơn hàng, Khách hàng, Sản phẩm
- 🔥 Top sản phẩm bán chạy
- 🛒 Đơn hàng gần đây
- 📋 Hoạt động gần đây

**Chức năng:**
- Xem tổng quan hệ thống
- Theo dõi doanh thu theo ngày
- Xem sản phẩm bán chạy nhất
- Theo dõi đơn hàng mới

---

### 2. **Quản lý Sản phẩm**
📚 Quản lý toàn bộ sản phẩm số (ebook, khóa học, template)

**Chức năng:**
- ➕ Thêm sản phẩm mới
- ✏️ Chỉnh sửa sản phẩm
- 🗑️ Xóa sản phẩm
- 🔍 Tìm kiếm sản phẩm
- 🏷️ Lọc theo danh mục, trạng thái
- 📁 Upload file sản phẩm (PDF, EPUB, ZIP)

**Thông tin sản phẩm:**
- Tên sản phẩm
- Danh mục (Ebook, Khóa học, Template, Công cụ)
- Icon (Emoji)
- Mô tả
- Giá & Giá gốc
- Tồn kho (slots)
- Trạng thái (Đã xuất bản, Nháp, Lưu trữ)
- File đính kèm

---

### 3. **Quản lý Đơn hàng**
🛒 Theo dõi và xử lý đơn hàng

**Chức năng:**
- 👁️ Xem chi tiết đơn hàng
- 🔍 Tìm kiếm theo mã đơn, email
- 🏷️ Lọc theo trạng thái, thời gian
- 💸 Hoàn tiền
- ✉️ Gửi lại email tải file

**Trạng thái đơn hàng:**
- ✅ Đã thanh toán
- ⏳ Chờ thanh toán
- ❌ Thất bại
- 💰 Đã hoàn tiền

**Thông tin đơn hàng:**
- Mã đơn hàng
- Thông tin khách hàng
- Sản phẩm đã mua
- Giá trị đơn hàng
- Phương thức thanh toán
- Trạng thái
- Ngày tạo

---

### 4. **Quản lý Khách hàng**
👥 Quản lý thông tin khách hàng

**Chức năng:**
- 👁️ Xem chi tiết khách hàng
- 📊 Xem lịch sử mua hàng
- 🔍 Tìm kiếm khách hàng
- 📈 Sắp xếp theo chi tiêu, đơn hàng
- ✉️ Gửi email cho khách hàng

**Thông tin khách hàng:**
- Họ tên
- Email
- Số đơn hàng
- Tổng chi tiêu
- Ngày đăng ký
- Lịch sử mua hàng

---

### 5. **Quản lý Thanh toán**
💳 Theo dõi giao dịch thanh toán

**Chức năng:**
- 👁️ Xem chi tiết giao dịch
- 🔍 Tìm kiếm theo mã giao dịch
- 🏷️ Lọc theo phương thức, trạng thái
- 💸 Xử lý hoàn tiền

**Phương thức thanh toán:**
- 💳 Stripe (Thẻ quốc tế)
- 🏦 VNPay (Ngân hàng VN)
- 📱 MoMo (Ví điện tử)

**Trạng thái giao dịch:**
- ✅ Thành công
- ⏳ Đang xử lý
- ❌ Thất bại
- 💰 Đã hoàn tiền

---

### 6. **Quản lý Nội dung**
📝 Quản lý blog và trang tĩnh

**Chức năng:**
- ➕ Tạo bài viết mới
- ✏️ Chỉnh sửa nội dung
- 🗑️ Xóa nội dung
- 🔍 Tìm kiếm bài viết
- 🏷️ Lọc theo loại, trạng thái
- 🔍 SEO: Meta description

**Loại nội dung:**
- 📝 Bài viết (Blog)
- 📄 Trang tĩnh (About, Contact, etc.)

**Thông tin nội dung:**
- Tiêu đề
- Loại
- Tác giả
- Lượt xem
- Trạng thái
- Nội dung
- Meta description (SEO)

---

### 7. **Quản lý Email**
✉️ Gửi email và quản lý template

**Chức năng:**
- ✉️ Gửi email thủ công
- 📧 Xem email đã gửi
- 📝 Quản lý email templates
- ✏️ Chỉnh sửa template

**Email Templates có sẵn:**
- 🛒 Xác nhận đơn hàng
- 📥 File đã sẵn sàng tải
- 👋 Chào mừng khách hàng mới
- 📰 Newsletter

**Gửi email:**
- Người nhận (email hoặc 'all' cho tất cả)
- Tiêu đề
- Chọn template hoặc tùy chỉnh
- Nội dung

---

### 8. **Quản lý Tài khoản Admin**
👤 Quản lý người dùng admin

**Chức năng:**
- ➕ Thêm admin mới
- ✏️ Chỉnh sửa thông tin admin
- 🗑️ Xóa admin
- 🔐 Phân quyền

**Vai trò Admin:**
- 👑 **Super Admin:** Toàn quyền
- 🔧 **Admin:** Quản lý sản phẩm, đơn hàng
- ✏️ **Editor:** Chỉ quản lý nội dung

**Thông tin admin:**
- Họ tên
- Email
- Mật khẩu
- Vai trò
- Trạng thái (Hoạt động/Không hoạt động)
- Đăng nhập cuối

---

### 9. **Cài đặt Hệ thống**
⚙️ Cấu hình website và tích hợp

**Các mục cài đặt:**

#### 🌐 Thông tin Website
- Tên website
- Mô tả
- Email liên hệ

#### 💳 Thanh toán
- Kích hoạt/Tắt Stripe
- Kích hoạt/Tắt VNPay
- Kích hoạt/Tắt MoMo

#### ✉️ Email
- SMTP Host
- SMTP Port
- Email gửi đi

#### ☁️ Lưu trữ
- Provider (Cloudflare R2, AWS S3, Local)
- Bucket Name
- Public URL

---

### 10. **Nhật ký Hoạt động**
📋 Theo dõi mọi thao tác trong hệ thống

**Chức năng:**
- 📊 Xem lịch sử hoạt động
- 🔍 Tìm kiếm hoạt động
- 🏷️ Lọc theo loại, thời gian

**Loại hoạt động:**
- ➕ Tạo mới
- ✏️ Cập nhật
- 🗑️ Xóa
- 🔐 Đăng nhập

**Thông tin log:**
- Thời gian
- Admin thực hiện
- Hành động
- Module
- Chi tiết
- Địa chỉ IP

---

## ⌨️ PHÍM TẮT

- **ESC:** Đóng modal
- **Click ngoài modal:** Đóng modal

---

## 🎨 GIAO DIỆN

### Theme: Dark Futuristic
- **Màu chủ đạo:** Teal (#00D4D4)
- **Nền:** Đen/Tối (#08090E)
- **Font chính:** Be Vietnam Pro
- **Font heading:** Exo 2

### Responsive
- ✅ Desktop (1920px+)
- ✅ Laptop (1366px+)
- ✅ Tablet (768px+)
- ✅ Mobile (360px+)

---

## 🔧 TÍNH NĂNG KỸ THUẬT

### Frontend
- **Framework:** Vanilla JavaScript (No dependencies)
- **Charts:** Chart.js 4.4.0
- **Icons:** Emoji (Unicode)

### Data
- **Mock Data:** Dữ liệu mẫu trong JavaScript
- **LocalStorage:** Lưu session đăng nhập

### Security
- ✅ Login authentication
- ✅ Session management
- ✅ Input validation
- ✅ XSS protection

---

## 📝 MOCK DATA

File admin hiện đang sử dụng **mock data** (dữ liệu mẫu) để demo.

**Để kết nối với Backend thật:**
1. Thay thế các hàm `load*()` bằng API calls
2. Sử dụng `fetch()` hoặc `axios` để gọi API
3. Cập nhật endpoint trong mỗi function

**Ví dụ:**
```javascript
// Mock (hiện tại)
function loadProducts() {
  renderProducts(mockData.products);
}

// Real API (cần thay đổi)
async function loadProducts() {
  const response = await fetch('/api/products');
  const products = await response.json();
  renderProducts(products);
}
```

---

## 🚀 TRIỂN KHAI

### Development
```bash
# Mở file trực tiếp trong browser
open admin.html
```

### Production
1. Kết nối với Backend API
2. Thay thế mock data bằng API calls
3. Cấu hình CORS
4. Setup authentication token
5. Deploy lên server

---

## 🐛 XỬ LÝ LỖI

### Không đăng nhập được?
- Kiểm tra email: `admin@sonnhai.com`
- Kiểm tra password: `admin123`
- Xóa localStorage: `localStorage.clear()`

### Dữ liệu không hiển thị?
- Mở Console (F12) để xem lỗi
- Kiểm tra mock data trong JavaScript
- Refresh trang (Ctrl+R)

### Modal không đóng?
- Nhấn ESC
- Click vào vùng tối bên ngoài modal
- Refresh trang

---

## 📞 HỖ TRỢ

**Email:** support@sonnhai.com  
**Website:** https://sonnhai.com  
**Docs:** https://docs.sonnhai.com

---

## 📄 LICENSE

© 2026 Thư viện Sơn Nhai. All rights reserved.

---

**Tạo bởi:** Claude (Kiro AI)  
**Ngày:** 2026-05-01  
**Version:** 1.0.0
