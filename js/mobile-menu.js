// mobile-menu.js — Tự động inject hamburger menu cho mobile
// Include vào tất cả pages qua <script src="js/mobile-menu.js"></script>

(function () {
  'use strict';
  if (window.__mobileMenuInit) return;
  window.__mobileMenuInit = true;

  // Chỉ chạy khi DOM ready
  function init() {
    const nav = document.querySelector('.nav');
    const navRight = document.querySelector('.nav-right');
    if (!nav || !navRight) return;

    // Đã inject rồi thì bỏ qua
    if (document.querySelector('.nav-hamburger')) return;

    // 1. Tạo hamburger button
    const hamburger = document.createElement('button');
    hamburger.className = 'nav-hamburger';
    hamburger.setAttribute('aria-label', 'Menu');
    hamburger.innerHTML = '<span></span><span></span><span></span>';

    // 2. Tạo mobile menu overlay
    const overlay = document.createElement('div');
    overlay.className = 'mobile-menu-overlay';

    // 3. Tạo mobile slide menu
    const menu = document.createElement('div');
    menu.className = 'mobile-menu';

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'mobile-menu-close';
    closeBtn.innerHTML = '✕';
    menu.appendChild(closeBtn);

    // Copy links from nav-links
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
      const links = navLinks.querySelectorAll('a');
      links.forEach(function (link) {
        const a = document.createElement('a');
        a.href = link.href;
        a.textContent = link.textContent;
        if (link.classList.contains('on')) a.classList.add('on');
        menu.appendChild(a);
      });
    }

    // Thêm extra links
    const extraLinks = [
      { href: 'cart.html', text: ' Giỏ hàng' },
      { href: 'account.html', text: ' Tài khoản' },
    ];
    const divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:#1C2232;margin:8px 0;';
    menu.appendChild(divider);
    extraLinks.forEach(function (item) {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.text;
      menu.appendChild(a);
    });

    // 4. Insert vào DOM
    navRight.insertBefore(hamburger, navRight.firstChild);
    document.body.appendChild(overlay);
    document.body.appendChild(menu);

    // 5. Toggle logic
    function openMenu() {
      hamburger.classList.add('open');
      menu.classList.add('open');
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      hamburger.classList.remove('open');
      menu.classList.remove('open');
      overlay.classList.remove('open');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
      if (menu.classList.contains('open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    overlay.addEventListener('click', closeMenu);
    closeBtn.addEventListener('click', closeMenu);

    // Close on ESC
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('open')) {
        closeMenu();
      }
    });

    // Close on resize to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768 && menu.classList.contains('open')) {
        closeMenu();
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
