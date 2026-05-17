(function() {
  'use strict';

  const STYLE = `
    .search-overlay {
      position: fixed; inset: 0; z-index: 9999;
      background: rgba(0,0,0,.7); backdrop-filter: blur(4px);
      display: flex; align-items: flex-start; justify-content: center;
      padding-top: 12vh; opacity: 0; visibility: hidden;
      transition: opacity .2s, visibility .2s;
    }
    .search-overlay.open { opacity: 1; visibility: visible; }
    .search-box {
      width: 90%; max-width: 520px;
      background: #0D1018; border: 1px solid #1C2232; border-radius: 14px;
      box-shadow: 0 24px 80px rgba(0,0,0,.6), 0 0 40px rgba(0,212,212,.06);
      overflow: hidden; transform: translateY(-10px); transition: transform .2s;
    }
    .search-overlay.open .search-box { transform: translateY(0); }
    .search-input-wrap {
      display: flex; align-items: center; gap: 10px;
      padding: 16px 20px; border-bottom: 1px solid #1C2232;
    }
    .search-input-wrap svg { flex-shrink: 0; color: #00D4D4; }
    .search-input {
      flex: 1; background: none; border: none; outline: none;
      font-family: 'Be Vietnam Pro', sans-serif; font-size: 15px;
      color: #DDE1EC;
    }
    .search-input::placeholder { color: #555F75; }
    .search-results {
      max-height: 360px; overflow-y: auto; padding: 8px;
      scrollbar-width: thin; scrollbar-color: #1C2232 transparent;
    }
    .search-results:empty::after {
      content: 'Gõ tên sách để tìm kiếm...';
      display: block; padding: 24px; text-align: center;
      font-size: 13px; color: #555F75;
    }
    .search-results.has-query:empty::after {
      content: 'Không tìm thấy sản phẩm nào';
    }
    .search-item {
      display: flex; align-items: center; gap: 12px;
      padding: 10px 12px; border-radius: 8px; cursor: pointer;
      text-decoration: none; transition: background .15s;
    }
    .search-item:hover { background: rgba(0,212,212,.06); }
    .search-item-img {
      width: 36px; height: 48px; border-radius: 5px; overflow: hidden;
      flex-shrink: 0; background: #12161F;
    }
    .search-item-img img { width: 100%; height: 100%; object-fit: cover; }
    .search-item-info { flex: 1; min-width: 0; }
    .search-item-name {
      font-size: 13.5px; font-weight: 600; color: #DDE1EC;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .search-item-cat { font-size: 11px; color: #555F75; margin-top: 2px; }
    .search-item-price {
      font-family: 'Exo 2', sans-serif; font-size: 13px;
      font-weight: 700; color: #00D4D4; flex-shrink: 0;
    }
    .search-hint {
      padding: 10px 16px; border-top: 1px solid #1C2232;
      font-size: 11px; color: #555F75; display: flex; align-items: center; gap: 12px;
    }
    .search-hint kbd {
      background: #12161F; border: 1px solid #1C2232; border-radius: 4px;
      padding: 1px 6px; font-size: 10px; color: #8B93A8;
    }
  `;

  function createModal() {
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const overlay = document.createElement('div');
    overlay.className = 'search-overlay';
    overlay.innerHTML = `
      <div class="search-box">
        <div class="search-input-wrap">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input class="search-input" type="text" placeholder="Tìm kiếm sản phẩm..." autocomplete="off">
        </div>
        <div class="search-results"></div>
        <div class="search-hint">
          <span><kbd>ESC</kbd> để đóng</span>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    const input = overlay.querySelector('.search-input');
    const results = overlay.querySelector('.search-results');

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('open')) close();
      if ((e.key === 'k' || e.key === 'K') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        open();
      }
    });

    input.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      if (!q) {
        results.innerHTML = '';
        results.classList.remove('has-query');
        return;
      }
      results.classList.add('has-query');
      search(q);
    });

    function open() {
      overlay.classList.add('open');
      input.value = '';
      results.innerHTML = '';
      results.classList.remove('has-query');
      setTimeout(() => input.focus(), 50);
    }

    function close() {
      overlay.classList.remove('open');
    }

    function getProducts() {
      if (window.SonHaiCartBadge && window.SonHaiCartBadge.getProducts) {
        return window.SonHaiCartBadge.getProducts() || [];
      }
      try {
        const raw = localStorage.getItem('sonhai_products');
        if (raw) return JSON.parse(raw);
      } catch(e) {}
      return [];
    }

    function search(q) {
      const products = getProducts();
      const matched = products.filter(p => {
        const name = (p.name || '').toLowerCase();
        const cat = (p.category || '').toLowerCase();
        return name.includes(q) || cat.includes(q);
      }).slice(0, 8);

      const fmt = n => Number(n).toLocaleString('vi-VN') + 'đ';

      results.innerHTML = matched.map(p => {
        const img = p.imageUrl || p.image || '';
        return `
          <a class="search-item" href="product.html?slug=${p.slug}">
            <div class="search-item-img">${img ? `<img src="${img}" alt="" onerror="this.style.display='none'">` : ''}</div>
            <div class="search-item-info">
              <div class="search-item-name">${p.name}</div>
              <div class="search-item-cat">${p.category || ''}</div>
            </div>
            <div class="search-item-price">${fmt(p.price)}</div>
          </a>`;
      }).join('');
    }

    return { open, close };
  }

  let modal = null;

  function init() {
    const triggers = document.querySelectorAll('.nav-search, .nav-search-box');
    if (triggers.length === 0) return;

    triggers.forEach(el => {
      el.addEventListener('click', () => {
        if (!modal) modal = createModal();
        modal.open();
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
