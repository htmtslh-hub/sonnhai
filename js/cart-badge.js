(function () {
  'use strict';

  var CART_ID_KEY = 'sonhai_cart_id';
  var API_BASE = '/api';

  try {
    localStorage.removeItem('sonhai_cart_count');
  } catch (e) {
    // Ignore legacy cache cleanup failures.
  }

  function toCount(value) {
    var count = parseInt(value, 10);
    return Number.isFinite(count) && count > 0 ? count : 0;
  }

  function getCartId() {
    try {
      return localStorage.getItem(CART_ID_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function ensureStyle() {
    if (document.getElementById('sonhai-cart-badge-style')) return;
    var style = document.createElement('style');
    style.id = 'sonhai-cart-badge-style';
    style.textContent =
      '@keyframes sonhaiCartBadgePop{' +
      '0%{transform:scale(.65);box-shadow:0 0 0 rgba(0,212,212,0)}' +
      '45%{transform:scale(1.22);box-shadow:0 0 16px rgba(0,212,212,.55)}' +
      '100%{transform:scale(1);box-shadow:0 0 0 rgba(0,212,212,0)}' +
      '}' +
      '.cart-dot.cart-dot-pulse{animation:sonhaiCartBadgePop .42s ease both;}';
    document.head.appendChild(style);
  }

  function paintBadge(count) {
    count = toCount(count);
    ensureStyle();

    document.querySelectorAll('.cart-dot').forEach(function (badge) {
      if (count > 0) {
        badge.textContent = count > 99 ? '99+' : String(count);
        badge.style.display = 'flex';
        badge.style.width = count > 9 ? 'auto' : '15px';
        badge.style.minWidth = count > 9 ? '18px' : '15px';
        badge.style.padding = count > 9 ? '0 4px' : '';
        badge.setAttribute('aria-label', 'Gio hang co ' + count + ' san pham');
        badge.classList.remove('cart-dot-pulse');
        void badge.offsetWidth;
        badge.classList.add('cart-dot-pulse');
      } else {
        badge.textContent = '';
        badge.style.display = 'none';
        badge.style.width = '';
        badge.style.minWidth = '';
        badge.style.padding = '';
        badge.removeAttribute('aria-label');
        badge.classList.remove('cart-dot-pulse');
      }
    });
  }

  function setCount(count) {
    var nextCount = toCount(count);
    paintBadge(nextCount);
    return nextCount;
  }

  function setCartId(cartId) {
    try {
      if (cartId) localStorage.setItem(CART_ID_KEY, cartId);
      else localStorage.removeItem(CART_ID_KEY);
    } catch (e) {
      // Ignore storage cleanup failures.
    }
  }

  async function refreshBadge() {
    try {
      var cartId = getCartId();
      var res = await fetch(API_BASE + '/cart/count', {
        headers: { 'X-Cart-Id': cartId },
        credentials: 'include'
      });
      var data = await res.json();
      if (data && data.success && data.data && data.data.count !== undefined) {
        setCartId(data.data.cartId || '');
        setCount(data.data.count);
      }
    } catch (e) {
      setCartId('');
      setCount(0);
    }
  }

  async function addProduct(productId, quantity) {
    var cartId = getCartId();
    var res = await fetch(API_BASE + '/cart/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cart-Id': cartId
      },
      body: JSON.stringify({ productId: productId, quantity: quantity || 1 }),
      credentials: 'include'
    });
    var data = await res.json();

    if (!res.ok || !data || !data.success) {
      throw new Error((data && data.error) || 'Khong the them vao gio hang.');
    }

    if (data.data) {
      setCartId(data.data.cartId || '');
      if (data.data.itemCount !== undefined) setCount(data.data.itemCount);
      else await refreshBadge();
    }

    return data;
  }

  window.SonHaiCartBadge = {
    setCount: setCount,
    addProduct: addProduct,
    refresh: refreshBadge
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refreshBadge);
  } else {
    refreshBadge();
  }

  window.addEventListener('storage', refreshBadge);
})();
