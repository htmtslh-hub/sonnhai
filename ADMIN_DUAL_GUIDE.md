# 🎯 HƯỚNG DẪN SỬ DỤNG 2 ADMIN

**Ngày:** 2026-05-01  
**Phiên bản:** 2.0

---

## 📊 TỔNG QUAN

Hệ thống admin được chia thành **2 phần riêng biệt** để dễ quản lý:

### 1. **admin.html** - Quản lý Hệ thống
🎯 **Mục đích:** Quản lý vận hành hàng ngày

**Chức năng:**
- ✅ Dashboard (thống kê, biểu đồ)
- ✅ Quản lý Sản phẩm (CRUD)
- ✅ Quản lý Đơn hàng
- ✅ Quản lý Khách hàng
- ✅ Quản lý Thanh toán
- ✅ Quản lý Email
- ✅ Quản lý Admin accounts
- ✅ Cài đặt hệ thống
- ✅ Nhật ký hoạt động

**Khi nào dùng:**
- Xem thống kê doanh thu
- Xử lý đơn hàng
- Quản lý khách hàng
- Thêm/xóa sản phẩm
- Xem báo cáo

---

### 2. **admin-extended.html** - Quản lý Nội dung
🎯 **Mục đích:** Chỉnh sửa nội dung website

**Chức năng:**
- ✅ Hero Section (tiêu đề, mô tả, buttons)
- ✅ Features (tính năng nổi bật)
- ✅ Pricing / Combo (giá, gói sản phẩm)
- ✅ **Chỉnh sửa chi tiết Sản phẩm** (tên, giá, mô tả)
- ✅ About (về chúng tôi)
- ✅ FAQ (câu hỏi thường gặp)
- ✅ Menu (điều hướng)
- ✅ Footer
- ✅ Testimonials (đánh giá)
- ✅ SEO Settings

**Khi nào dùng:**
- Thay đổi giá sản phẩm
- Cập nhật mô tả sản phẩm
- Sửa nội dung trang chủ
- Thêm/sửa FAQ
- Cập nhật menu
- Thay đổi combo/gói

---

## 🔐 ĐĂNG NHẬP

**Cả 2 admin dùng chung thông tin:**
- **Email:** `admin@sonnhai.com`
- **Password:** `admin123`

---

## 🚀 CÁCH SỬ DỤNG

### Workflow thông thường:

#### Buổi sáng - Kiểm tra hệ thống:
1. Mở **admin.html**
2. Xem Dashboard → Kiểm tra doanh thu, đơn hàng mới
3. Xử lý đơn hàng pending
4. Trả lời khách hàng

#### Khi cần cập nhật nội dung:
1. Mở **admin-extended.html**
2. Chọn module cần sửa
3. Chỉnh sửa nội dung
4. Lưu (Ctrl+S)

#### Khi cần sửa sản phẩm:
**Có 2 cách:**

**Cách 1: Dùng admin.html**
- Vào "Quản lý Sản phẩm"
- Click "✏️ Sửa" hoặc "🗑️ Xóa"
- Thêm/xóa sản phẩm

**Cách 2: Dùng admin-extended.html**
- Vào "Chỉnh sửa Sản phẩm"
- Chọn sản phẩm từ dropdown
- Sửa tên, giá, mô tả chi tiết
- Lưu thay đổi

---

## 📋 SO SÁNH CHI TIẾT

| Tính năng | admin.html | admin-extended.html |
|-----------|------------|---------------------|
| **Dashboard** | ✅ Có | ❌ Không |
| **Thống kê** | ✅ Charts, số liệu | ❌ Không |
| **Quản lý đơn hàng** | ✅ Đầy đủ | ❌ Không |
| **Quản lý khách hàng** | ✅ Đầy đủ | ❌ Không |
| **Thêm/Xóa sản phẩm** | ✅ Có | ❌ Không |
| **Sửa chi tiết SP** | ⚠️ Cơ bản | ✅ Chi tiết |
| **Sửa Hero Section** | ❌ Không | ✅ Có |
| **Sửa Pricing/Combo** | ❌ Không | ✅ Có |
| **Sửa FAQ** | ❌ Không | ✅ Có |
| **Sửa Menu** | ❌ Không | ✅ Có |
| **Live Preview** | ❌ Không | ✅ Có (Hero) |

---

## 💡 TIPS & BEST PRACTICES

### 1. Phân công công việc:

**Admin chính (CEO/Manager):**
- Dùng **admin.html** để xem tổng quan
- Theo dõi doanh thu, đơn hàng
- Quản lý khách hàng

**Content Editor:**
- Dùng **admin-extended.html**
- Cập nhật nội dung website
- Sửa giá, combo, FAQ

**Support Team:**
- Dùng **admin.html** để xem đơn hàng
- Xử lý yêu cầu khách hàng
- Gửi lại email tải file

### 2. Quy trình cập nhật giá:

**Bước 1:** Vào **admin-extended.html**
- Chọn "Pricing / Combo"
- Sửa giá các gói
- Lưu

**Bước 2:** Vào "Chỉnh sửa Sản phẩm"
- Chọn từng sản phẩm
- Cập nhật giá mới
- Lưu

**Bước 3:** Kiểm tra trên website

### 3. Backup dữ liệu:

**admin.html:**
- Dữ liệu lưu trong mock data (JavaScript)
- Cần kết nối backend để lưu thật

**admin-extended.html:**
- Dữ liệu lưu trong localStorage
- Export JSON thường xuyên
- Import khi cần khôi phục

---

## 🔄 CHUYỂN ĐỔI GIỮA 2 ADMIN

### Từ admin.html → admin-extended.html:
```
Thêm link vào topbar:
<a href="admin-extended.html" style="color:var(--teal);">
  📝 Quản lý Nội dung
</a>
```

### Từ admin-extended.html → admin.html:
```
Thêm link vào topbar:
<a href="admin.html" style="color:var(--teal);">
  📊 Quản lý Hệ thống
</a>
```

---

## ⚠️ LƯU Ý QUAN TRỌNG

### 1. Dữ liệu:
- **admin.html:** Mock data trong JavaScript
- **admin-extended.html:** localStorage
- ⚠️ **Không đồng bộ tự động!**

### 2. Khi sửa sản phẩm:
- Sửa ở **admin.html** → Chỉ ảnh hưởng mock data
- Sửa ở **admin-extended.html** → Chỉ ảnh hưởng localStorage
- ⚠️ Cần kết nối backend để đồng bộ!

### 3. Production:
- Cần tạo API backend
- Cả 2 admin đều gọi API
- Dữ liệu lưu trong database
- Tự động đồng bộ

---

## 🎯 KHUYẾN NGHỊ

### Hiện tại (Demo):
✅ Dùng **admin.html** cho quản lý hệ thống  
✅ Dùng **admin-extended.html** cho chỉnh sửa nội dung  
✅ Mở 2 tab riêng biệt

### Tương lai (Production):
1. Kết nối cả 2 admin với backend API
2. Dữ liệu lưu trong PostgreSQL
3. Tự động đồng bộ
4. Hoặc gộp thành 1 admin duy nhất

---

## 📞 HỖ TRỢ

**Câu hỏi thường gặp:**

**Q: Tại sao không gộp thành 1 admin?**  
A: File quá lớn (5000+ dòng), khó bảo trì. Tách ra dễ quản lý hơn.

**Q: Làm sao đồng bộ dữ liệu giữa 2 admin?**  
A: Hiện tại không đồng bộ. Cần kết nối backend API.

**Q: Tôi nên dùng admin nào?**  
A: 
- Xem thống kê, quản lý đơn hàng → **admin.html**
- Sửa nội dung website, giá, combo → **admin-extended.html**

**Q: Có thể chỉ dùng 1 admin không?**  
A: Có, nhưng sẽ thiếu tính năng. Khuyến nghị dùng cả 2.

---

## ✅ CHECKLIST HÀNG NGÀY

### Buổi sáng:
- [ ] Mở **admin.html**
- [ ] Kiểm tra Dashboard
- [ ] Xem đơn hàng mới
- [ ] Xử lý đơn pending
- [ ] Trả lời khách hàng

### Khi cần:
- [ ] Mở **admin-extended.html**
- [ ] Cập nhật giá (nếu có)
- [ ] Sửa FAQ (nếu có câu hỏi mới)
- [ ] Cập nhật combo (nếu có khuyến mãi)

### Cuối ngày:
- [ ] Export dữ liệu từ **admin-extended.html**
- [ ] Backup file JSON
- [ ] Kiểm tra website có hiển thị đúng không

---

**Tạo bởi:** Claude (Kiro AI)  
**Ngày:** 2026-05-01  
**Version:** 2.0
