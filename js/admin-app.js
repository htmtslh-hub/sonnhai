// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN APP — Main application logic for admin panel
// ═══════════════════════════════════════════════════════════════════════════════

import { auth } from '../firebase.js';
import { signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  requireAuth,
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImage,
  getAllCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  getAllOrders,
  updateOrderStatus,
  getDashboardStats,
  seedDatabase,
  generateSlug,
  formatCurrency,
  formatDate,
} from './admin-firebase.js';

// ─────────────────────────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────────────────────────

let currentUser = null;
let currentSection = 'dashboard';
let products = [];
let categories = [];
let orders = [];
let editingProductId = null;
let editingCategoryId = null;

// ─────────────────────────────────────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  setupEventListeners();
  requireAuth(onAuthSuccess);
});

function onAuthSuccess(user, userData) {
  currentUser = user;
  document.getElementById('admin-name').textContent = userData.displayName || user.email;
  document.getElementById('admin-avatar').textContent = (userData.displayName || user.email).charAt(0).toUpperCase();
  loadDashboard();
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENT LISTENERS
// ─────────────────────────────────────────────────────────────────────────────

function setupEventListeners() {
  // Login form
  document.getElementById('login-form')?.addEventListener('submit', handleLogin);

  // Logout
  document.getElementById('btn-logout')?.addEventListener('click', handleLogout);

  // Sidebar navigation
  document.querySelectorAll('.sb-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      navigateToSection(section);
    });
  });

  // Sidebar toggle
  document.getElementById('sb-toggle')?.addEventListener('click', toggleSidebar);

  // Product actions
  document.getElementById('btn-add-product')?.addEventListener('click', () => openProductModal());
  document.getElementById('product-form')?.addEventListener('submit', handleProductSubmit);
  document.getElementById('btn-cancel-product')?.addEventListener('click', closeProductModal);
  document.getElementById('product-image-input')?.addEventListener('change', handleImagePreview);

  // Category actions
  document.getElementById('btn-add-category')?.addEventListener('click', () => openCategoryModal());
  document.getElementById('category-form')?.addEventListener('submit', handleCategorySubmit);
  document.getElementById('btn-cancel-category')?.addEventListener('click', closeCategoryModal);

  // Search & filters
  document.getElementById('product-search')?.addEventListener('input', filterProducts);
  document.getElementById('product-status-filter')?.addEventListener('change', filterProducts);
  document.getElementById('order-status-filter')?.addEventListener('change', filterOrders);

  // Seed data button
  document.getElementById('btn-seed-data')?.addEventListener('click', handleSeedData);
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

async function handleLogin(e) {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('login-error');
  const btn = document.getElementById('btn-login');

  btn.disabled = true;
  btn.textContent = 'Đang đăng nhập...';
  errorEl.style.display = 'none';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // requireAuth callback sẽ xử lý sau khi login thành công
  } catch (error) {
    errorEl.textContent = error.message === 'Firebase: Error (auth/invalid-credential).'
      ? 'Email hoặc mật khẩu không đúng'
      : error.message;
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Đăng nhập';
  }
}

async function handleLogout() {
  if (confirm('Bạn có chắc muốn đăng xuất?')) {
    await signOut(auth);
    location.reload();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────

function navigateToSection(section) {
  currentSection = section;

  // Update sidebar active state
  document.querySelectorAll('.sb-item').forEach(item => {
    item.classList.toggle('active', item.dataset.section === section);
  });

  // Update breadcrumb
  const breadcrumbMap = {
    dashboard: 'Dashboard',
    products: 'Sản phẩm',
    categories: 'Danh mục',
    orders: 'Đơn hàng',
  };
  document.getElementById('breadcrumb-current').textContent = breadcrumbMap[section] || section;

  // Show/hide sections
  document.querySelectorAll('.page-section').forEach(sec => {
    sec.classList.toggle('active', sec.id === `section-${section}`);
  });

  // Load data for section
  switch (section) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'products':
      loadProducts();
      break;
    case 'categories':
      loadCategories();
      break;
    case 'orders':
      loadOrders();
      break;
  }
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('collapsed');
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────

async function loadDashboard() {
  try {
    const stats = await getDashboardStats();

    document.getElementById('stat-products').textContent = stats.totalProducts;
    document.getElementById('stat-orders').textContent = stats.totalOrders;
    document.getElementById('stat-revenue').textContent = formatCurrency(stats.totalRevenue);
    document.getElementById('stat-categories').textContent = stats.totalCategories;

    // Load recent orders
    const recentOrders = await getAllOrders({ limit: 5 });
    renderRecentOrders(recentOrders);
  } catch (error) {
    console.error('Load dashboard error:', error);
    showToast('Lỗi tải dashboard: ' + error.message, 'error');
  }
}

function renderRecentOrders(orders) {
  const tbody = document.getElementById('recent-orders-tbody');
  if (!tbody) return;

  if (orders.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);">Chưa có đơn hàng nào</td></tr>';
    return;
  }

  tbody.innerHTML = orders.map(order => `
    <tr>
      <td><strong>#${order.id.slice(0, 8)}</strong></td>
      <td>${order.customerEmail || 'N/A'}</td>
      <td>${formatCurrency(order.total || 0)}</td>
      <td><span class="badge badge-${order.status}">${getStatusText(order.status)}</span></td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `).join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS
// ─────────────────────────────────────────────────────────────────────────────

async function loadProducts() {
  try {
    products = await getAllProducts();
    categories = await getAllCategories();
    renderProducts(products);
  } catch (error) {
    console.error('Load products error:', error);
    showToast('Lỗi tải sản phẩm: ' + error.message, 'error');
  }
}

function renderProducts(productsToRender) {
  const tbody = document.getElementById('products-tbody');
  if (!tbody) return;

  if (productsToRender.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-3);">Không có sản phẩm nào</td></tr>';
    return;
  }

  tbody.innerHTML = productsToRender.map(product => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="prod-icon">${product.icon || '📦'}</div>
          <div>
            <div style="font-weight:600;">${product.name}</div>
            <div style="font-size:11px;color:var(--text-3);">${product.slug}</div>
          </div>
        </div>
      </td>
      <td>${getCategoryName(product.category)}</td>
      <td><strong>${formatCurrency(product.price)}</strong></td>
      <td>${product.stock || 0}</td>
      <td>${product.sold || 0}</td>
      <td><span class="badge badge-${product.status}">${product.status === 'published' ? 'Published' : 'Draft'}</span></td>
      <td>
        <button class="btn-ghost-sm" onclick="window.adminApp.editProduct('${product.id}')">✏️ Sửa</button>
        <button class="btn-danger-sm" onclick="window.adminApp.deleteProductConfirm('${product.id}')">🗑️ Xóa</button>
      </td>
    </tr>
  `).join('');
}

function filterProducts() {
  const search = document.getElementById('product-search')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('product-status-filter')?.value || 'all';

  let filtered = products;

  if (search) {
    filtered = filtered.filter(p =>
      p.name.toLowerCase().includes(search) ||
      p.slug.toLowerCase().includes(search)
    );
  }

  if (statusFilter !== 'all') {
    filtered = filtered.filter(p => p.status === statusFilter);
  }

  renderProducts(filtered);
}

function getCategoryName(categoryId) {
  const cat = categories.find(c => c.id === categoryId);
  return cat ? cat.name : categoryId;
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function openProductModal(productId = null) {
  editingProductId = productId;
  const modal = document.getElementById('product-modal');
  const form = document.getElementById('product-form');
  const title = document.getElementById('product-modal-title');

  if (productId) {
    title.textContent = 'Chỉnh sửa sản phẩm';
    const product = products.find(p => p.id === productId);
    if (product) {
      document.getElementById('product-name').value = product.name;
      document.getElementById('product-slug').value = product.slug;
      document.getElementById('product-icon').value = product.icon || '';
      document.getElementById('product-category').value = product.category;
      document.getElementById('product-price').value = product.price;
      document.getElementById('product-original-price').value = product.originalPrice || '';
      document.getElementById('product-stock').value = product.stock || 0;
      document.getElementById('product-description').value = product.description || '';
      document.getElementById('product-format').value = product.format || '';
      document.getElementById('product-pages').value = product.pages || '';
      document.getElementById('product-status').value = product.status;

      if (product.imageUrl) {
        document.getElementById('image-preview').src = product.imageUrl;
        document.getElementById('image-preview').style.display = 'block';
      }
    }
  } else {
    title.textContent = 'Thêm sản phẩm mới';
    form.reset();
    document.getElementById('image-preview').style.display = 'none';
  }

  // Populate category select
  const categorySelect = document.getElementById('product-category');
  categorySelect.innerHTML = categories.map(cat =>
    `<option value="${cat.id}">${cat.name}</option>`
  ).join('');

  modal.classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('product-modal').classList.add('hidden');
  editingProductId = null;
}

async function handleProductSubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-product');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  try {
    const productData = {
      name: document.getElementById('product-name').value,
      slug: document.getElementById('product-slug').value,
      icon: document.getElementById('product-icon').value,
      category: document.getElementById('product-category').value,
      price: parseInt(document.getElementById('product-price').value),
      originalPrice: parseInt(document.getElementById('product-original-price').value) || null,
      stock: parseInt(document.getElementById('product-stock').value) || 0,
      description: document.getElementById('product-description').value,
      format: document.getElementById('product-format').value,
      pages: parseInt(document.getElementById('product-pages').value) || 0,
      status: document.getElementById('product-status').value,
      sold: 0,
    };

    // Handle image upload
    const imageFile = document.getElementById('product-image-input').files[0];
    if (imageFile) {
      const imageData = await uploadProductImage(imageFile, editingProductId);
      productData.imageUrl = imageData.url;
      productData.imagePath = imageData.path;
    }

    if (editingProductId) {
      await updateProduct(editingProductId, productData);
      showToast('Cập nhật sản phẩm thành công!', 'success');
    } else {
      await createProduct(productData);
      showToast('Thêm sản phẩm thành công!', 'success');
    }

    closeProductModal();
    loadProducts();
  } catch (error) {
    console.error('Save product error:', error);
    showToast('Lỗi: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lưu sản phẩm';
  }
}

async function deleteProductConfirm(productId) {
  const product = products.find(p => p.id === productId);
  if (!product) return;

  if (confirm(`Bạn có chắc muốn xóa sản phẩm "${product.name}"?`)) {
    try {
      await deleteProduct(productId);
      showToast('Xóa sản phẩm thành công!', 'success');
      loadProducts();
    } catch (error) {
      console.error('Delete product error:', error);
      showToast('Lỗi: ' + error.message, 'error');
    }
  }
}

function handleImagePreview(e) {
  const file = e.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const preview = document.getElementById('image-preview');
      preview.src = e.target.result;
      preview.style.display = 'block';
    };
    reader.readAsDataURL(file);
  }
}

// Auto-generate slug from name
document.getElementById('product-name')?.addEventListener('input', (e) => {
  if (!editingProductId) {
    document.getElementById('product-slug').value = generateSlug(e.target.value);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES
// ─────────────────────────────────────────────────────────────────────────────

async function loadCategories() {
  try {
    categories = await getAllCategories();
    renderCategories(categories);
  } catch (error) {
    console.error('Load categories error:', error);
    showToast('Lỗi tải danh mục: ' + error.message, 'error');
  }
}

function renderCategories(categoriesToRender) {
  const tbody = document.getElementById('categories-tbody');
  if (!tbody) return;

  if (categoriesToRender.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--text-3);">Chưa có danh mục nào</td></tr>';
    return;
  }

  tbody.innerHTML = categoriesToRender.map(cat => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="prod-icon">${cat.icon || '📁'}</div>
          <div>
            <div style="font-weight:600;">${cat.name}</div>
            <div style="font-size:11px;color:var(--text-3);">${cat.slug}</div>
          </div>
        </div>
      </td>
      <td>${cat.order || 0}</td>
      <td>${getProductCountByCategory(cat.id)}</td>
      <td>
        <button class="btn-ghost-sm" onclick="window.adminApp.editCategory('${cat.id}')">✏️ Sửa</button>
        <button class="btn-danger-sm" onclick="window.adminApp.deleteCategoryConfirm('${cat.id}')">🗑️ Xóa</button>
      </td>
    </tr>
  `).join('');
}

function getProductCountByCategory(categoryId) {
  return products.filter(p => p.category === categoryId).length;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY MODAL
// ─────────────────────────────────────────────────────────────────────────────

function openCategoryModal(categoryId = null) {
  editingCategoryId = categoryId;
  const modal = document.getElementById('category-modal');
  const form = document.getElementById('category-form');
  const title = document.getElementById('category-modal-title');

  if (categoryId) {
    title.textContent = 'Chỉnh sửa danh mục';
    const category = categories.find(c => c.id === categoryId);
    if (category) {
      document.getElementById('category-name').value = category.name;
      document.getElementById('category-slug').value = category.slug;
      document.getElementById('category-icon').value = category.icon || '';
      document.getElementById('category-order').value = category.order || 0;
    }
  } else {
    title.textContent = 'Thêm danh mục mới';
    form.reset();
  }

  modal.classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('category-modal').classList.add('hidden');
  editingCategoryId = null;
}

async function handleCategorySubmit(e) {
  e.preventDefault();
  const btn = document.getElementById('btn-save-category');
  btn.disabled = true;
  btn.textContent = 'Đang lưu...';

  try {
    const categoryData = {
      name: document.getElementById('category-name').value,
      slug: document.getElementById('category-slug').value,
      icon: document.getElementById('category-icon').value,
      order: parseInt(document.getElementById('category-order').value) || 0,
    };

    if (editingCategoryId) {
      await updateCategory(editingCategoryId, categoryData);
      showToast('Cập nhật danh mục thành công!', 'success');
    } else {
      await createCategory(categoryData);
      showToast('Thêm danh mục thành công!', 'success');
    }

    closeCategoryModal();
    loadCategories();
  } catch (error) {
    console.error('Save category error:', error);
    showToast('Lỗi: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Lưu danh mục';
  }
}

async function deleteCategoryConfirm(categoryId) {
  const category = categories.find(c => c.id === categoryId);
  if (!category) return;

  if (confirm(`Bạn có chắc muốn xóa danh mục "${category.name}"?`)) {
    try {
      await deleteCategory(categoryId);
      showToast('Xóa danh mục thành công!', 'success');
      loadCategories();
    } catch (error) {
      console.error('Delete category error:', error);
      showToast('Lỗi: ' + error.message, 'error');
    }
  }
}

// Auto-generate slug from name
document.getElementById('category-name')?.addEventListener('input', (e) => {
  if (!editingCategoryId) {
    document.getElementById('category-slug').value = generateSlug(e.target.value);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────────────────────────────────────────

async function loadOrders() {
  try {
    orders = await getAllOrders();
    renderOrders(orders);
  } catch (error) {
    console.error('Load orders error:', error);
    showToast('Lỗi tải đơn hàng: ' + error.message, 'error');
  }
}

function renderOrders(ordersToRender) {
  const tbody = document.getElementById('orders-tbody');
  if (!tbody) return;

  if (ordersToRender.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-3);">Chưa có đơn hàng nào</td></tr>';
    return;
  }

  tbody.innerHTML = ordersToRender.map(order => `
    <tr>
      <td><strong>#${order.id.slice(0, 8)}</strong></td>
      <td>${order.customerEmail || 'N/A'}</td>
      <td>${order.items?.length || 0} sản phẩm</td>
      <td><strong>${formatCurrency(order.total || 0)}</strong></td>
      <td>
        <select class="filter-select" onchange="window.adminApp.updateOrderStatusHandler('${order.id}', this.value)" style="padding:4px 8px;font-size:12px;">
          <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
          <option value="paid" ${order.status === 'paid' ? 'selected' : ''}>Paid</option>
          <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
          <option value="refunded" ${order.status === 'refunded' ? 'selected' : ''}>Refunded</option>
        </select>
      </td>
      <td>${formatDate(order.createdAt)}</td>
    </tr>
  `).join('');
}

function filterOrders() {
  const statusFilter = document.getElementById('order-status-filter')?.value || 'all';

  let filtered = orders;

  if (statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }

  renderOrders(filtered);
}

async function updateOrderStatusHandler(orderId, newStatus) {
  try {
    await updateOrderStatus(orderId, newStatus);
    showToast('Cập nhật trạng thái đơn hàng thành công!', 'success');
    loadOrders();
  } catch (error) {
    console.error('Update order status error:', error);
    showToast('Lỗi: ' + error.message, 'error');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA
// ─────────────────────────────────────────────────────────────────────────────

async function handleSeedData() {
  if (!confirm('Bạn có chắc muốn import dữ liệu mẫu vào Firestore? Thao tác này sẽ thêm categories và products mẫu.')) {
    return;
  }

  const btn = document.getElementById('btn-seed-data');
  btn.disabled = true;
  btn.textContent = 'Đang import...';

  try {
    await seedDatabase();
    showToast('Import dữ liệu mẫu thành công!', 'success');
    loadDashboard();
  } catch (error) {
    console.error('Seed data error:', error);
    showToast('Lỗi: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = '📦 Import dữ liệu mẫu';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

function getStatusText(status) {
  const map = {
    pending: 'Chờ xử lý',
    paid: 'Đã thanh toán',
    cancelled: 'Đã hủy',
    refunded: 'Đã hoàn tiền',
    published: 'Published',
    draft: 'Draft',
  };
  return map[status] || status;
}

function showToast(message, type = 'info') {
  // Simple toast notification
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 9999;
    background: ${type === 'success' ? 'var(--green)' : type === 'error' ? 'var(--red)' : 'var(--teal)'};
    color: white;
    padding: 14px 20px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    animation: slideIn 0.3s ease;
  `;
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT TO WINDOW (for onclick handlers)
// ─────────────────────────────────────────────────────────────────────────────

window.adminApp = {
  editProduct: openProductModal,
  deleteProductConfirm,
  editCategory: openCategoryModal,
  deleteCategoryConfirm,
  updateOrderStatusHandler,
};
