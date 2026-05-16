// ═══════════════════════════════════════════════════════════════════════════════
// FIRESTORE SYNC — Data layer dùng chung cho tất cả trang public
// Đọc từ Firestore, cache vào localStorage, cung cấp API cho các trang
// ═══════════════════════════════════════════════════════════════════════════════

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ─── Firebase Config ───
const firebaseConfig = {
  apiKey: "AIzaSyCctQ_86VvAlZPTQDQPyGeYjV9zMHLv_Sc",
  authDomain: "sonnhai-2600f.firebaseapp.com",
  projectId: "sonnhai-2600f",
  storageBucket: "sonnhai-2600f.firebasestorage.app",
  messagingSenderId: "907935883175",
  appId: "1:907935883175:web:0f356a63e28a45a196a082",
  measurementId: "G-JXP5V9W6GN",
};

let app, db;
try {
  // Reuse existing app if already initialized (e.g. by firebase.js)
  const { getApps } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
  const apps = getApps();
  app = apps.length > 0 ? apps[0] : initializeApp(firebaseConfig);
} catch (e) {
  app = initializeApp(firebaseConfig);
}
db = getFirestore(app);

// ─── Cache Config ───
const CACHE_PREFIX = 'sndata_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch (e) { return null; }
}

function cacheSet(key, data) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, ts: Date.now() }));
  } catch (e) { /* quota exceeded, ignore */ }
}

// ─── Normalize product for compatibility with existing frontend ───
function normalizeProduct(p) {
  // Auto-generate imageUrl from slug if not provided
  const imgUrl = p.imageUrl || p.image || (p.slug ? 'product/anh-chuan/' + p.slug + '.webp' : '');
  return {
    id: p.id,
    slug: p.slug || '',
    name: p.name || '',
    category: p.category || '',
    price: p.price || 0,
    original_price: p.originalPrice || p.original_price || 0,
    originalPrice: p.originalPrice || p.original_price || 0,
    emoji: p.emoji || p.icon || '',
    icon: p.emoji || p.icon || '',
    coverGradient: p.coverGradient || 'linear-gradient(145deg, #0A1A2E, #0D2845)',
    description: p.description || '',
    fullDescription: p.fullDescription || p.full_description || '',
    rating: p.rating || 4.5,
    sold_count: p.soldCount || p.sold_count || p.sold || 0,
    soldCount: p.soldCount || p.sold_count || p.sold || 0,
    status: p.status || 'published',
    pages: p.pages || 250,
    format: p.format || 'PDF',
    imageUrl: imgUrl,
    image: imgUrl,
    category_name: p.category || '',
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ═══════════════════════════════════════════════════════════════════════════════

const SonHaiData = {

  // ─── Products ───
  async getProducts(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = cacheGet('products');
      if (cached) return cached.map(normalizeProduct);
    }
    try {
      const snapshot = await getDocs(collection(db, 'products'));
      const products = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cacheSet('products', products);
      // Also update cart-badge compatible localStorage
      const normalized = products.map(normalizeProduct);
      localStorage.setItem('sonhai_products', JSON.stringify(normalized));
      return normalized;
    } catch (err) {
      console.warn('Firestore products fetch failed, using cache:', err.message);
      // Fallback to cart-badge localStorage
      try {
        const stored = localStorage.getItem('sonhai_products');
        if (stored) return JSON.parse(stored).map(normalizeProduct);
      } catch (e) {}
      return [];
    }
  },

  async getProductBySlug(slug) {
    // Try cache first
    const cached = cacheGet('products');
    if (cached) {
      const found = cached.find(p => p.slug === slug);
      if (found) return normalizeProduct(found);
    }
    // Fetch from Firestore
    try {
      const q = query(collection(db, 'products'), where('slug', '==', slug), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      return normalizeProduct({ id: d.id, ...d.data() });
    } catch (err) {
      console.warn('getProductBySlug failed:', err.message);
      return null;
    }
  },

  // ─── Combos ───
  async getCombos(forceRefresh = false) {
    if (!forceRefresh) {
      const cached = cacheGet('combos');
      if (cached) return cached;
    }
    try {
      const q = query(collection(db, 'combos'), orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      const combos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      cacheSet('combos', combos);
      return combos;
    } catch (err) {
      console.warn('getCombos failed:', err.message);
      return cacheGet('combos') || [];
    }
  },

  // ─── Blog Posts ───
  async getBlogPosts(forceRefresh = false, maxPosts = 50) {
    if (!forceRefresh) {
      const cached = cacheGet('blog_posts');
      if (cached) return cached;
    }
    try {
      const q = query(
        collection(db, 'blog_posts'),
        where('status', '==', 'published'),
        orderBy('createdAt', 'desc'),
        limit(maxPosts)
      );
      const snapshot = await getDocs(q);
      const posts = snapshot.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          ...data,
          // Convert Firestore Timestamp to ISO string for serialization
          createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        };
      });
      cacheSet('blog_posts', posts);
      return posts;
    } catch (err) {
      console.warn('getBlogPosts failed:', err.message);
      return cacheGet('blog_posts') || [];
    }
  },

  async getBlogPostBySlug(slug) {
    const cached = cacheGet('blog_posts');
    if (cached) {
      const found = cached.find(p => p.slug === slug);
      if (found) return found;
    }
    try {
      const q = query(collection(db, 'blog_posts'), where('slug', '==', slug), limit(1));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return null;
      const d = snapshot.docs[0];
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() ? data.createdAt.toDate().toISOString() : data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() ? data.updatedAt.toDate().toISOString() : data.updatedAt,
      };
    } catch (err) {
      console.warn('getBlogPostBySlug failed:', err.message);
      return null;
    }
  },

  // ─── Site Content (Banner, About, Support) ───
  async getSiteContent(docName, forceRefresh = false) {
    if (!forceRefresh) {
      const cached = cacheGet('site_' + docName);
      if (cached) return cached;
    }
    try {
      const docRef = doc(db, 'site_content', docName);
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      cacheSet('site_' + docName, data);
      return data;
    } catch (err) {
      console.warn(`getSiteContent(${docName}) failed:`, err.message);
      return cacheGet('site_' + docName) || null;
    }
  },

  async getBanner(forceRefresh = false) {
    return this.getSiteContent('banner', forceRefresh);
  },

  async getAbout(forceRefresh = false) {
    return this.getSiteContent('about', forceRefresh);
  },

  async getSupport(forceRefresh = false) {
    return this.getSiteContent('support', forceRefresh);
  },

  // ─── Categories (derived from products) ───
  async getCategories() {
    const products = await this.getProducts();
    const catMap = {};
    products.filter(p => p.status === 'published').forEach(p => {
      if (p.category) {
        catMap[p.category] = (catMap[p.category] || 0) + 1;
      }
    });
    return Object.entries(catMap).map(([name, count]) => ({ name, count }));
  },

  // ─── Clear cache ───
  clearCache() {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  },

  // ─── Render Banner on any page ───
  async renderBanner() {
    const banner = await this.getBanner();
    const annBar = document.querySelector('.ann-bar');
    if (!annBar) return;

    if (banner && banner.enabled && banner.text) {
      annBar.textContent = banner.text;
      annBar.style.display = '';
    } else if (banner && banner.enabled === false) {
      annBar.style.display = 'none';
    }
    // else: keep default HTML content
  },

  // ─── Firestore DB reference (for admin) ───
  getDb() { return db; },
};

// Export globally
window.SonHaiData = SonHaiData;

// Auto-render banner on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SonHaiData.renderBanner());
} else {
  SonHaiData.renderBanner();
}

export default SonHaiData;
