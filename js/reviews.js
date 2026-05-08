// ═══════════════════════════════════════════════════════════════════════════════
// REVIEWS MODULE — Hệ thống đánh giá sản phẩm (Firestore-backed)
// Yêu cầu: firebase.js, auth-ui.js đã load trước
// ═══════════════════════════════════════════════════════════════════════════════

import {
  auth, db, onAuthStateChanged,
  collection, query, where, getDocs, addDoc, updateDoc, doc, orderBy, serverTimestamp,
  arrayUnion, arrayRemove,
} from '../firebase.js';

// ─── State ───
let _allReviews = [];      // All published reviews for current product
let _currentFilter = 'all';
let _selectedRating = 0;
let _currentUser = null;
let _productSlug = '';

// ─── Init ───
export function initReviews(productSlug) {
  _productSlug = productSlug;
  if (!_productSlug) return;

  // Listen for auth state
  onAuthStateChanged(auth, (user) => {
    _currentUser = user;
    updateWriteReviewUI();
  });

  // Star selector
  setupStarSelector();

  // Filter buttons
  setupFilterButtons();

  // Load reviews
  loadReviews();
}

// ─── Load reviews from Firestore ───
async function loadReviews() {
  try {
    const q = query(
      collection(db, 'reviews'),
      where('productId', '==', _productSlug),
      where('status', '==', 'published'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    _allReviews = snapshot.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date(),
      };
    });
  } catch (err) {
    console.warn('[Reviews] Load failed:', err.message);
    _allReviews = [];
  }

  updateSummary();
  updateFilters();
  renderReviews();
}

// ─── Update summary stats ───
function updateSummary() {
  const total = _allReviews.length;
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let sum = 0;

  _allReviews.forEach(r => {
    counts[r.rating] = (counts[r.rating] || 0) + 1;
    sum += r.rating;
  });

  const avg = total > 0 ? (sum / total).toFixed(1) : '—';
  const avgNum = total > 0 ? sum / total : 0;

  // Update DOM
  const scoreEl = document.getElementById('rv-avg-score');
  const starsEl = document.getElementById('rv-avg-stars');
  const totalEl = document.getElementById('rv-total-count');

  if (scoreEl) scoreEl.textContent = avg;
  if (totalEl) totalEl.textContent = total + ' đánh giá';
  if (starsEl) {
    const full = Math.floor(avgNum);
    const half = avgNum - full >= 0.5 ? 1 : 0;
    starsEl.textContent = '★'.repeat(full) + (half ? '★' : '') + '☆'.repeat(5 - full - half);
  }

  // Update bars
  for (let i = 1; i <= 5; i++) {
    const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
    const bar = document.getElementById('rv-bar-' + i);
    const pctEl = document.getElementById('rv-pct-' + i);
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
  }

  // Update tab count
  const tabBtn = document.querySelector('.dtab[onclick*="reviews"]');
  if (tabBtn) {
    const countSpan = tabBtn.querySelector('.dtab-count');
    if (countSpan) countSpan.textContent = total;
  }

  // Also update product rating row
  const ratingNum = document.querySelector('.rating-num');
  if (ratingNum && total > 0) ratingNum.textContent = avg;
  const ratingCount = document.querySelector('.rating-count');
  if (ratingCount) ratingCount.textContent = total + ' đánh giá';
}

// ─── Update filter buttons ───
function updateFilters() {
  const total = _allReviews.length;
  const count5 = _allReviews.filter(r => r.rating === 5).length;
  const count4 = _allReviews.filter(r => r.rating === 4).length;

  const filtersEl = document.getElementById('rv-filters');
  if (!filtersEl) return;
  const btns = filtersEl.querySelectorAll('.rv-filter');
  btns.forEach(btn => {
    const f = btn.dataset.filter;
    if (f === 'all') btn.textContent = 'Tất cả (' + total + ')';
    else if (f === '5') btn.textContent = '5 sao (' + count5 + ')';
    else if (f === '4') btn.textContent = '4 sao (' + count4 + ')';
  });
}

// ─── Setup filter buttons ───
function setupFilterButtons() {
  const filtersEl = document.getElementById('rv-filters');
  if (!filtersEl) return;
  filtersEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.rv-filter');
    if (!btn) return;
    filtersEl.querySelectorAll('.rv-filter').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    _currentFilter = btn.dataset.filter || 'all';
    renderReviews();
  });
}

// ─── Render reviews ───
function renderReviews() {
  const container = document.getElementById('review-list-dynamic');
  if (!container) return;

  let filtered = _allReviews;
  if (_currentFilter === '5') filtered = _allReviews.filter(r => r.rating === 5);
  else if (_currentFilter === '4') filtered = _allReviews.filter(r => r.rating === 4);
  else if (_currentFilter === 'verified') filtered = _allReviews.filter(r => r.verified);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="review-empty">
        <div class="review-empty-icon">💬</div>
        <div class="review-empty-title">Chưa có đánh giá nào</div>
        <div class="review-empty-text">Hãy là người đầu tiên đánh giá sản phẩm này!</div>
      </div>`;
    return;
  }

  container.innerHTML = filtered.map(r => renderCard(r)).join('');
}

// ─── Render single review card ───
function renderCard(r) {
  const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
  const dateStr = r.createdAt instanceof Date
    ? r.createdAt.toLocaleDateString('vi-VN')
    : new Date(r.createdAt).toLocaleDateString('vi-VN');

  const avatar = r.userPhoto
    ? `<img src="${r.userPhoto}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;" referrerpolicy="no-referrer">`
    : (r.userName || '?').charAt(0).toUpperCase();

  const verifiedHTML = r.verified
    ? '<span class="rv-verified">✓ Đã xác minh mua hàng</span>'
    : '';

  const helpfulCount = r.helpful || 0;
  const hasVoted = _currentUser && r.helpfulBy && r.helpfulBy.includes(_currentUser.uid);
  const voteStyle = hasVoted ? 'color:var(--teal);border-color:var(--teal);' : '';

  return `
    <div class="review-card">
      <div class="rv-head">
        <div class="rv-user">
          <div class="rv-avatar">${avatar}</div>
          <div>
            <div class="rv-name">${escHtml(r.userName || 'Ẩn danh')}</div>
            <div class="rv-date">${dateStr}</div>
            ${verifiedHTML}
          </div>
        </div>
        <div class="rv-stars">${stars}</div>
      </div>
      <div class="rv-body">${escHtml(r.comment)}</div>
      <div class="rv-helpful">Đánh giá này có hữu ích không?
        <button onclick="window._voteHelpful('${r.id}')" style="${voteStyle}">👍 Có (${helpfulCount})</button>
      </div>
    </div>`;
}

// ─── Vote helpful ───
async function voteHelpful(reviewId) {
  if (!_currentUser) {
    if (window.openAuthModal) window.openAuthModal();
    else showToast('Vui lòng đăng nhập để bình chọn.');
    return;
  }

  const review = _allReviews.find(r => r.id === reviewId);
  if (!review) return;

  const hasVoted = review.helpfulBy && review.helpfulBy.includes(_currentUser.uid);

  try {
    const ref = doc(db, 'reviews', reviewId);
    if (hasVoted) {
      await updateDoc(ref, {
        helpful: (review.helpful || 1) - 1,
        helpfulBy: arrayRemove(_currentUser.uid),
      });
      review.helpful = (review.helpful || 1) - 1;
      review.helpfulBy = (review.helpfulBy || []).filter(id => id !== _currentUser.uid);
    } else {
      await updateDoc(ref, {
        helpful: (review.helpful || 0) + 1,
        helpfulBy: arrayUnion(_currentUser.uid),
      });
      review.helpful = (review.helpful || 0) + 1;
      if (!review.helpfulBy) review.helpfulBy = [];
      review.helpfulBy.push(_currentUser.uid);
    }
    renderReviews();
  } catch (err) {
    console.warn('[Reviews] Vote failed:', err.message);
  }
}
window._voteHelpful = voteHelpful;

// ─── Star selector ───
function setupStarSelector() {
  const selector = document.getElementById('star-selector');
  if (!selector) return;

  const labels = ['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'];

  selector.querySelectorAll('.star-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      _selectedRating = parseInt(btn.dataset.star);
      selector.querySelectorAll('.star-btn').forEach((b, i) => {
        b.classList.toggle('active', i < _selectedRating);
      });
      const label = document.getElementById('wr-rating-label');
      if (label) label.textContent = _selectedRating + ' sao — ' + labels[_selectedRating];
    });

    btn.addEventListener('mouseenter', () => {
      const star = parseInt(btn.dataset.star);
      selector.querySelectorAll('.star-btn').forEach((b, i) => {
        b.style.color = i < star ? 'var(--warn)' : '';
      });
    });

    btn.addEventListener('mouseleave', () => {
      selector.querySelectorAll('.star-btn').forEach((b, i) => {
        b.style.color = '';
      });
    });
  });
}

// ─── Toggle write review form ───
window.toggleWriteReview = function() {
  if (!_currentUser) {
    if (window.openAuthModal) window.openAuthModal();
    else showToast('Vui lòng đăng nhập để viết đánh giá.');
    return;
  }

  const form = document.getElementById('write-review-form');
  const btn = document.getElementById('write-review-toggle');
  if (!form) return;

  if (form.classList.contains('show')) {
    form.classList.remove('show');
    if (btn) btn.style.display = '';
  } else {
    form.classList.add('show');
    if (btn) btn.style.display = 'none';
  }
};

// ─── Update write review UI based on auth ───
function updateWriteReviewUI() {
  const btn = document.getElementById('write-review-toggle');
  const loginPrompt = document.getElementById('wr-login-prompt');

  if (_currentUser) {
    if (btn) btn.style.display = '';
    if (loginPrompt) loginPrompt.style.display = 'none';
  } else {
    if (btn) btn.style.display = 'none';
    if (loginPrompt) loginPrompt.style.display = '';
  }
}

// ─── Submit review ───
window.submitReview = async function() {
  if (!_currentUser) {
    if (window.openAuthModal) window.openAuthModal();
    return;
  }

  const errEl = document.getElementById('wr-error');
  const comment = (document.getElementById('wr-comment')?.value || '').trim();

  if (_selectedRating === 0) {
    if (errEl) { errEl.textContent = '✗ Vui lòng chọn số sao.'; errEl.classList.add('show'); }
    return;
  }
  if (comment.length < 10) {
    if (errEl) { errEl.textContent = '✗ Nội dung đánh giá cần ít nhất 10 ký tự.'; errEl.classList.add('show'); }
    return;
  }

  if (errEl) errEl.classList.remove('show');

  // Check if user has purchased this product (via orders collection)
  let hasPurchased = false;
  let existingReviewCount = 0;
  let purchaseCount = 0;

  try {
    // Count purchases
    const ordersQ = query(
      collection(db, 'orders'),
      where('customerEmail', '==', _currentUser.email),
      where('paymentStatus', '==', 'paid')
    );
    const ordersSnap = await getDocs(ordersQ);
    ordersSnap.docs.forEach(d => {
      const items = d.data().items || [];
      items.forEach(item => {
        if (item.productId === _productSlug || item.slug === _productSlug) {
          purchaseCount++;
        }
      });
    });
    hasPurchased = purchaseCount > 0;

    // Count existing reviews by this user for this product
    const rvQ = query(
      collection(db, 'reviews'),
      where('productId', '==', _productSlug),
      where('userId', '==', _currentUser.uid)
    );
    const rvSnap = await getDocs(rvQ);
    existingReviewCount = rvSnap.size;
  } catch (err) {
    console.warn('[Reviews] Check purchase failed:', err.message);
  }

  if (!hasPurchased) {
    if (errEl) { errEl.textContent = '✗ Bạn cần mua sản phẩm này trước khi đánh giá.'; errEl.classList.add('show'); }
    return;
  }

  if (existingReviewCount >= purchaseCount) {
    if (errEl) { errEl.textContent = '✗ Bạn đã sử dụng hết lượt đánh giá cho sản phẩm này. (Mỗi lần mua = 1 lượt đánh giá)'; errEl.classList.add('show'); }
    return;
  }

  // Submit
  const submitBtn = document.getElementById('wr-submit-btn');
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Đang gửi...'; }

  try {
    await addDoc(collection(db, 'reviews'), {
      productId: _productSlug,
      userId: _currentUser.uid,
      userName: _currentUser.displayName || _currentUser.email.split('@')[0],
      userPhoto: _currentUser.photoURL || null,
      rating: _selectedRating,
      comment: comment,
      helpful: 0,
      helpfulBy: [],
      verified: true,
      status: 'pending', // Cần admin duyệt
      createdAt: serverTimestamp(),
    });

    showToast('✓ Đánh giá đã được gửi! Đang chờ admin duyệt.');

    // Reset form
    _selectedRating = 0;
    document.getElementById('wr-comment').value = '';
    document.querySelectorAll('#star-selector .star-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('wr-rating-label').textContent = 'Chưa chọn đánh giá';
    document.getElementById('write-review-form').classList.remove('show');
    document.getElementById('write-review-toggle').style.display = '';

  } catch (err) {
    if (errEl) { errEl.textContent = '✗ Lỗi: ' + err.message; errEl.classList.add('show'); }
  } finally {
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Gửi đánh giá'; }
  }
};

// ─── Helpers ───
function escHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function showToast(msg) {
  if (window.showToast) { window.showToast(msg); return; }
  const t = document.getElementById('toast');
  if (!t) return;
  document.getElementById('toast-msg').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── Auto-init when product slug is ready ───
function waitForProductAndInit() {
  const slug = new URLSearchParams(location.search).get('slug');
  if (slug) {
    initReviews(slug);
  } else {
    // Fallback: wait for window._currentProduct
    const check = setInterval(() => {
      if (window._currentProduct?.slug) {
        clearInterval(check);
        initReviews(window._currentProduct.slug);
      }
    }, 300);
    setTimeout(() => clearInterval(check), 10000);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForProductAndInit);
} else {
  waitForProductAndInit();
}
