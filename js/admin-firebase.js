// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN FIREBASE MANAGER — Quản lý toàn bộ CRUD cho admin panel
// ═══════════════════════════════════════════════════════════════════════════════

import { auth, db, storage } from '../firebase.js';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE COLLECTIONS
// ─────────────────────────────────────────────────────────────────────────────

const COLLECTIONS = {
  PRODUCTS: 'products',
  CATEGORIES: 'categories',
  ORDERS: 'orders',
  USERS: 'users',
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH GUARD — Kiểm tra admin đã login chưa
// ─────────────────────────────────────────────────────────────────────────────

export function requireAuth(callback) {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      // Chưa login → redirect về login screen
      showLoginScreen();
      return;
    }

    // Kiểm tra role admin trong Firestore
    const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, user.uid));
    const userData = userDoc.data();

    if (!userData || userData.role !== 'admin') {
      alert('Bạn không có quyền truy cập trang admin!');
      await auth.signOut();
      showLoginScreen();
      return;
    }

    // User là admin → callback
    hideLoginScreen();
    if (callback) callback(user, userData);
  });
}

function showLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.classList.remove('hidden');
}

function hideLoginScreen() {
  const loginScreen = document.getElementById('login-screen');
  if (loginScreen) loginScreen.classList.add('hidden');
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllProducts(filters = {}) {
  let q = collection(db, COLLECTIONS.PRODUCTS);

  // Filter by category
  if (filters.category) {
    q = query(q, where('category', '==', filters.category));
  }

  // Filter by status
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }

  // Order by
  if (filters.orderBy) {
    q = query(q, orderBy(filters.orderBy, filters.order || 'desc'));
  }

  // Limit
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getProductById(id) {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('Product not found');
  return { id: docSnap.id, ...docSnap.data() };
}

export async function getProductBySlug(slug) {
  const q = query(collection(db, COLLECTIONS.PRODUCTS), where('slug', '==', slug), limit(1));
  const snapshot = await getDocs(q);
  if (snapshot.empty) throw new Error('Product not found');
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function createProduct(productData) {
  const docRef = await addDoc(collection(db, COLLECTIONS.PRODUCTS), {
    ...productData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateProduct(id, productData) {
  const docRef = doc(db, COLLECTIONS.PRODUCTS, id);
  await updateDoc(docRef, {
    ...productData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProduct(id) {
  // Delete product image from storage if exists
  const product = await getProductById(id);
  if (product.imageUrl && product.imageUrl.includes('firebase')) {
    try {
      const imageRef = ref(storage, product.imagePath || `products/${id}`);
      await deleteObject(imageRef);
    } catch (err) {
      console.warn('Failed to delete image:', err);
    }
  }

  // Delete product document
  await deleteDoc(doc(db, COLLECTIONS.PRODUCTS, id));
}

// ─────────────────────────────────────────────────────────────────────────────
// IMAGE UPLOAD
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadProductImage(file, productId) {
  if (!file) throw new Error('No file provided');

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Chỉ chấp nhận file ảnh (JPG, PNG, WEBP)');
  }

  // Validate file size (max 5MB)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Kích thước ảnh tối đa 5MB');
  }

  // Create unique filename
  const timestamp = Date.now();
  const filename = `${productId || timestamp}_${file.name}`;
  const storageRef = ref(storage, `products/${filename}`);

  // Upload
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);

  return {
    url: downloadURL,
    path: snapshot.ref.fullPath,
    filename,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORIES CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllCategories() {
  const q = query(collection(db, COLLECTIONS.CATEGORIES), orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getCategoryById(id) {
  const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('Category not found');
  return { id: docSnap.id, ...docSnap.data() };
}

export async function createCategory(categoryData) {
  const docRef = await addDoc(collection(db, COLLECTIONS.CATEGORIES), {
    ...categoryData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function updateCategory(id, categoryData) {
  const docRef = doc(db, COLLECTIONS.CATEGORIES, id);
  await updateDoc(docRef, {
    ...categoryData,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategory(id) {
  // Check if any products use this category
  const q = query(collection(db, COLLECTIONS.PRODUCTS), where('category', '==', id));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    throw new Error(`Không thể xóa danh mục này vì có ${snapshot.size} sản phẩm đang sử dụng`);
  }

  await deleteDoc(doc(db, COLLECTIONS.CATEGORIES, id));
}

// ─────────────────────────────────────────────────────────────────────────────
// ORDERS CRUD
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllOrders(filters = {}) {
  let q = collection(db, COLLECTIONS.ORDERS);

  // Filter by status
  if (filters.status) {
    q = query(q, where('status', '==', filters.status));
  }

  // Order by date
  q = query(q, orderBy('createdAt', 'desc'));

  // Limit
  if (filters.limit) {
    q = query(q, limit(filters.limit));
  }

  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

export async function getOrderById(id) {
  const docRef = doc(db, COLLECTIONS.ORDERS, id);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('Order not found');
  return { id: docSnap.id, ...docSnap.data() };
}

export async function updateOrderStatus(id, status) {
  const docRef = doc(db, COLLECTIONS.ORDERS, id);
  await updateDoc(docRef, {
    status,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteOrder(id) {
  await deleteDoc(doc(db, COLLECTIONS.ORDERS, id));
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const [products, orders, categories] = await Promise.all([
    getDocs(collection(db, COLLECTIONS.PRODUCTS)),
    getDocs(collection(db, COLLECTIONS.ORDERS)),
    getDocs(collection(db, COLLECTIONS.CATEGORIES)),
  ]);

  const publishedProducts = products.docs.filter(doc => doc.data().status === 'published').length;
  const paidOrders = orders.docs.filter(doc => doc.data().status === 'paid');
  const totalRevenue = paidOrders.reduce((sum, doc) => sum + (doc.data().total || 0), 0);

  return {
    totalProducts: products.size,
    publishedProducts,
    draftProducts: products.size - publishedProducts,
    totalOrders: orders.size,
    paidOrders: paidOrders.length,
    pendingOrders: orders.docs.filter(doc => doc.data().status === 'pending').length,
    totalRevenue,
    totalCategories: categories.size,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SEED DATA — Import mock data vào Firestore
// ─────────────────────────────────────────────────────────────────────────────

export async function seedDatabase() {
  const batch = writeBatch(db);

  // Categories
  const categories = [
    { id: 'nhan-tinh', name: 'Thấu hiểu nhân tính', slug: 'thau-hieu-nhan-tinh', icon: '🧠', order: 1 },
    { id: 'tu-duy', name: 'Thay đổi tư duy', slug: 'thay-doi-tu-duy', icon: '💡', order: 2 },
    { id: 'tai-chinh', name: 'Làm chủ tài chính', slug: 'lam-chu-tai-chinh', icon: '💰', order: 3 },
  ];

  for (const cat of categories) {
    const docRef = doc(db, COLLECTIONS.CATEGORIES, cat.id);
    batch.set(docRef, {
      ...cat,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  // Products (from mock data)
  const products = [
    { name: 'JavaScript từ A-Z', slug: 'javascript-tu-a-z', icon: '📚', category: 'ebook', price: 299000, originalPrice: 399000, sold: 45, stock: 100, status: 'published', description: 'Sách JavaScript toàn tập cho người mới bắt đầu đến nâng cao', format: 'PDF', pages: 320, imageUrl: '', tags: ['javascript', 'programming', 'web'] },
    { name: 'React Master Course', slug: 'react-master-course', icon: '⚛️', category: 'course', price: 499000, originalPrice: 699000, sold: 38, stock: 50, status: 'published', description: 'Khóa học React từ cơ bản đến nâng cao, bao gồm hooks, context, redux', format: 'PDF + Video', pages: 450, imageUrl: '', tags: ['react', 'frontend', 'javascript'] },
    { name: 'Node.js Backend', slug: 'nodejs-backend', icon: '🟢', category: 'course', price: 399000, originalPrice: 499000, sold: 32, stock: 75, status: 'published', description: 'Backend với Node.js và Express, MongoDB, REST API', format: 'PDF + Code', pages: 380, imageUrl: '', tags: ['nodejs', 'backend', 'api'] },
    { name: 'Python cho AI', slug: 'python-cho-ai', icon: '🐍', category: 'course', price: 599000, originalPrice: 799000, sold: 28, stock: 60, status: 'published', description: 'Python cho Machine Learning và AI, NumPy, Pandas, TensorFlow', format: 'PDF + Notebook', pages: 520, imageUrl: '', tags: ['python', 'ai', 'machine-learning'] },
    { name: 'UI/UX Design', slug: 'ui-ux-design', icon: '🎨', category: 'ebook', price: 349000, originalPrice: 449000, sold: 24, stock: 80, status: 'published', description: 'Thiết kế UI/UX chuyên nghiệp với Figma, design system, user research', format: 'PDF', pages: 280, imageUrl: '', tags: ['design', 'ui', 'ux'] },
    { name: 'TypeScript Guide', slug: 'typescript-guide', icon: '📘', category: 'ebook', price: 249000, originalPrice: 349000, sold: 18, stock: 100, status: 'draft', description: 'Hướng dẫn TypeScript toàn tập, types, interfaces, generics', format: 'PDF', pages: 300, imageUrl: '', tags: ['typescript', 'javascript', 'programming'] },
  ];

  for (const product of products) {
    const docRef = doc(collection(db, COLLECTIONS.PRODUCTS));
    batch.set(docRef, {
      ...product,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  }

  await batch.commit();
  console.log('✅ Seed data imported successfully!');
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

export function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacritics
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function formatCurrency(amount) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

export function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return new Intl.DateTimeFormat('vi-VN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
