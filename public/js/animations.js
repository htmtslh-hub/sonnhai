/* ═══════════════════════════════════════════════════════
   Thư viện Sơn Nhai — Global Animations & Scroll Engine
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── 1. Page Fade-In ── */
  document.body.classList.add('snhai-loading');
  window.addEventListener('DOMContentLoaded', function () {
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        document.body.classList.remove('snhai-loading');
        document.body.classList.add('snhai-ready');
      });
    });
  });

  window.addEventListener('DOMContentLoaded', function () {

    /* ── 2. Scroll Progress Bar ── */
    var progressBar = document.createElement('div');
    progressBar.id = 'snhai-progress';
    document.body.appendChild(progressBar);

    function updateProgress() {
      var scrollTop = window.scrollY || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var pct = docHeight > 0 ? Math.round((scrollTop / docHeight) * 1000) / 10 : 0;
      progressBar.style.width = pct + '%';
    }

    /* ── 3. Back-to-Top Button ── */
    var topBtn = document.createElement('div');
    topBtn.id = 'snhai-top';
    topBtn.title = 'Lên đầu trang';
    topBtn.innerHTML = '<svg viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>';
    document.body.appendChild(topBtn);

    topBtn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    /* ── 4. Navbar Hide/Show ── */
    var navbar = document.querySelector('.nav');
    var lastScrollY = 0;

    function updateNavbar(scrollY) {
      if (!navbar) return;
      if (scrollY > 40) {
        navbar.classList.add('nav-scrolled');
      } else {
        navbar.classList.remove('nav-scrolled');
      }
      if (scrollY > 120) {
        if (scrollY > lastScrollY + 6) {
          navbar.classList.add('nav-hidden');
        } else if (scrollY < lastScrollY - 4) {
          navbar.classList.remove('nav-hidden');
        }
      } else {
        navbar.classList.remove('nav-hidden');
      }
      lastScrollY = scrollY;
    }

    /* ── 5. Throttled Scroll Handler ── */
    var ticking = false;
    var currentScrollY = 0;

    window.addEventListener('scroll', function () {
      currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (!ticking) {
        requestAnimationFrame(function () {
          updateProgress();
          updateNavbar(currentScrollY);
          topBtn.classList.toggle('visible', currentScrollY > 300);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });

    updateProgress();
    updateNavbar(window.scrollY || 0);

    /* ── 6. Intersection Observer Factory ── */
    function makeObserver(callback, options) {
      if (!('IntersectionObserver' in window)) return null;
      return new IntersectionObserver(callback, options || { threshold: 0.08, rootMargin: '0px 0px -32px 0px' });
    }

    /* ── 7. Scroll Reveal — manual classes ── */
    var revealObs = makeObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          revealObs.unobserve(e.target);
        }
      });
    });

    /* ── 8. Auto-Reveal — add .reveal to matching elements ── */
    var autoSelectors = [
      /* index.html */
      '.sec-head', '.sec-head h2', '.sec-head p',
      '.product-card', '.book-card', '.feat-card',
      '.bs-item', '.combo-card',
      '.nl-section', '.footer-col',
      /* categories.html */
      '.p-card', '.cat-banner', '.cat-pill', '.cat-item',
      '.content-grid > *',
      /* product.html */
      '.pd-hero', '.pd-tab-body', '.review-card', '.rel-card', '.review-summary',
      '.btn-add-cart', '.btn-buy-now', '.pd-info > *',
      /* about.html */
      '.stat-item', '.mission-card', '.team-card', '.timeline-item',
      '.value-card', '.vision-card',
      /* blog.html */
      '.blog-card', '.featured-card', '.bstat-num',
      /* support.html */
      '.step-card', '.faq-item', '.contact-card',
      /* cart.html & checkout.html */
      '.cart-item', '.summary-box', '.payment-option',
      /* thank-you.html */
      '.ty-download', '.ty-item', '.next-card',
      /* account.html */
      '.order-row', '.account-card',
      /* universal */
      '.section-title', '.section-sub', '.section-desc',
      '.grid-item', '.card', '.stat-box'
    ];

    var seen = new WeakSet();
    autoSelectors.forEach(function (sel) {
      try {
        document.querySelectorAll(sel).forEach(function (el, i) {
          if (seen.has(el)) return;
          seen.add(el);
          if (el.classList.contains('reveal') || el.classList.contains('reveal-left') ||
              el.classList.contains('reveal-right') || el.classList.contains('reveal-scale')) return;
          el.classList.add('reveal');
          var delay = Math.min(i % 7, 5);
          if (delay > 0) el.classList.add('reveal-d' + delay);
          if (revealObs) revealObs.observe(el);
        });
      } catch (e) { /* ignore invalid selectors */ }
    });

    /* Also observe manually-classed reveals */
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function (el) {
      if (!el.classList.contains('visible') && revealObs) revealObs.observe(el);
    });

    /* Fallback: no IntersectionObserver */
    if (!revealObs) {
      document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale').forEach(function (el) {
        el.classList.add('visible');
      });
    }

    /* ── 9. Hero Entrance Animation ── */
    var heroEl = document.querySelector('.hero, .hero-section, .page-hero');
    if (heroEl) {
      var heroChildren = heroEl.querySelectorAll(
        '.hero-eyebrow, .hero-h1, .hero-sub, .hero-cta, .hero-stats, .hero-scroll,' +
        '.page-hero-inner > *, .page-hero h1, .page-hero p, .page-hero .hero-search,' +
        '.hero-title, .hero-desc, .hero-btn'
      );
      heroChildren.forEach(function (el, i) {
        el.style.opacity = '0';
        el.style.transform = 'translateY(22px)';
        el.style.transition = 'opacity 0.7s cubic-bezier(0.16,1,0.3,1) ' + (0.1 + i * 0.12) + 's, transform 0.7s cubic-bezier(0.16,1,0.3,1) ' + (0.1 + i * 0.12) + 's';
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
          });
        });
      });
    }

    /* ── 10. Counter Animation ── */
    function easeOutExpo(t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); }

    function animateCounter(el) {
      var rawText = el.textContent.replace(/[^0-9.]/g, '');
      if (!rawText) return;
      var target = parseFloat(rawText);
      var isFloat = target % 1 !== 0 || el.dataset.float === '1';
      var suffix = el.dataset.suffix || el.textContent.replace(/[\d.]/g, '').trim();
      var duration = 1600;
      var startTime = null;
      var originalHTML = el.innerHTML;
      var sup = el.querySelector('sup');
      var supText = sup ? sup.outerHTML : '';

      function step(ts) {
        if (!startTime) startTime = ts;
        var elapsed = ts - startTime;
        var progress = Math.min(elapsed / duration, 1);
        var eased = easeOutExpo(progress);
        var current = target * eased;
        var formatted = isFloat ? current.toFixed(1) : Math.floor(current).toLocaleString('vi-VN');
        el.innerHTML = formatted + supText;
        if (progress < 1) requestAnimationFrame(step);
        else el.innerHTML = originalHTML; /* restore exact original */
      }
      requestAnimationFrame(step);
    }

    /* Auto-detect stat numbers */
    var counterSelectors = '.hs-num, .stat-num, .bstat-num, [data-count]';
    var counterObs = makeObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          animateCounter(e.target);
          counterObs.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    if (counterObs) {
      document.querySelectorAll(counterSelectors).forEach(function (el) {
        counterObs.observe(el);
      });
    }

    /* ── 11. Ripple Effect on Buttons ── */
    function addRipple(e) {
      var btn = e.currentTarget;
      var rect = btn.getBoundingClientRect();
      var size = Math.max(rect.width, rect.height) * 2.2;
      var x = e.clientX - rect.left - size / 2;
      var y = e.clientY - rect.top - size / 2;
      var ripple = document.createElement('span');
      ripple.className = 'ripple-wave';
      ripple.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + x + 'px;top:' + y + 'px;';
      btn.appendChild(ripple);
      ripple.addEventListener('animationend', function () { ripple.remove(); });
    }

    document.querySelectorAll(
      '.btn-primary, .btn-teal, .btn, .btn-outline, .cta-btn, .add-btn,' +
      '.btn-add, .btn-add-cart, .btn-buy-now, .checkout-btn, .place-btn,' +
      '.apply-btn, .btn-apply, .nl-btn, .login-btn, .register-btn,' +
      '.hero-cta a, .hero-cta button, .cat-banner, .mvv-card'
    ).forEach(function (btn) {
      if (getComputedStyle(btn).position === 'static') btn.style.position = 'relative';
      btn.style.overflow = 'hidden';
      btn.addEventListener('click', addRipple);
    });

    /* ── 12. Smooth Anchor Scroll ── */
    document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
      anchor.addEventListener('click', function (e) {
        var href = this.getAttribute('href');
        if (href === '#') return;
        var target = document.querySelector(href);
        if (target) {
          e.preventDefault();
          var offset = navbar ? navbar.offsetHeight + 8 : 60;
          var top = target.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: top, behavior: 'smooth' });
        }
      });
    });

    /* ── 13. Subtle Parallax Hero Background ── */
    if (heroEl) {
      var heroBg = heroEl.querySelector('.hero-glow-top, .hero-glow, .hero-grid, .page-hero-glow');
      window.addEventListener('scroll', function () {
        var sy = window.scrollY || 0;
        if (sy < window.innerHeight * 1.2) {
          if (heroBg) heroBg.style.transform = 'translateY(' + (sy * 0.18) + 'px)';
        }
      }, { passive: true });
    }

    /* ── 14. Card Hover 3D Tilt (only cards without their own CSS :hover transform) ── */
    document.querySelectorAll('.product-card, .combo-card, .blog-card, .feat-card, .mvv-card').forEach(function (card) {
      card.addEventListener('mousemove', function (e) {
        var r = card.getBoundingClientRect();
        var dx = ((e.clientX - r.left) / r.width - 0.5) * 2;
        var dy = ((e.clientY - r.top) / r.height - 0.5) * 2;
        card.style.transform = 'perspective(700px) rotateY(' + (dx * 5) + 'deg) rotateX(' + (-dy * 5) + 'deg) translateZ(4px) scale(1.015)';
      });
      card.addEventListener('mouseleave', function () {
        card.style.transform = '';
        card.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
        setTimeout(function () { card.style.transition = ''; }, 400);
      });
    });

    /* ── 15. Horizontal Drag Scroll ── */
    document.querySelectorAll('.h-scroll, .feat-row, .books-scroll, .combo-grid').forEach(function (el) {
      var isDown = false, startX, scrollLeft;
      el.addEventListener('mousedown', function (e) { isDown = true; el.style.cursor = 'grabbing'; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
      el.addEventListener('mouseleave', function () { isDown = false; el.style.cursor = ''; });
      el.addEventListener('mouseup', function () { isDown = false; el.style.cursor = ''; });
      el.addEventListener('mousemove', function (e) {
        if (!isDown) return;
        e.preventDefault();
        el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX) * 1.3;
      });
    });

    /* ── 16. Active Nav Link ── */
    var currentFile = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-links a').forEach(function (a) {
      var href = (a.getAttribute('href') || '').split('/').pop();
      if (href === currentFile || (currentFile === '' && href === 'index.html')) {
        a.classList.add('on');
      }
    });

    /* ── 17. Image Lazy Load with Fade-In ── */
    if ('IntersectionObserver' in window) {
      var imgObs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting && e.target.dataset.src) {
            var img = e.target;
            img.src = img.dataset.src;
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.4s ease';
            img.onload = function () { img.style.opacity = '1'; };
            imgObs.unobserve(img);
          }
        });
      }, { rootMargin: '200px' });
      document.querySelectorAll('img[data-src]').forEach(function (img) { imgObs.observe(img); });
    }

    /* ── 18. Fade-Up Class Support (for about.html legacy classes) ── */
    var fadeUpObs = makeObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          fadeUpObs.unobserve(e.target);
        }
      });
    });
    if (fadeUpObs) {
      document.querySelectorAll('.fade-up').forEach(function (el) {
        fadeUpObs.observe(el);
      });
    } else {
      document.querySelectorAll('.fade-up').forEach(function (el) { el.classList.add('visible'); });
    }

    /* ── 19. Toast Helper (global) ── */
    var toastEl = document.createElement('div');
    toastEl.id = 'snhai-toast';
    document.body.appendChild(toastEl);

    window.snhaiToast = function (msg, icon, duration) {
      toastEl.innerHTML = '<span class="toast-icon">' + (icon || 'ℹ') + '</span><span>' + msg + '</span>';
      toastEl.classList.add('show');
      clearTimeout(window._snhaiToastTimer);
      window._snhaiToastTimer = setTimeout(function () {
        toastEl.classList.remove('show');
      }, duration || 3200);
    };

    /* ── 20. Smooth Tab Switch Enhancement ── */
    document.querySelectorAll('.tab, .tab-btn, .pd-tab-btn').forEach(function (tab) {
      tab.addEventListener('click', function () {
        /* Find sibling tabs and remove active */
        var parent = tab.closest('.tabs-bar, .tabs-nav, .tab-bar, .pd-tabs');
        if (parent) {
          parent.querySelectorAll('.tab, .tab-btn, .pd-tab-btn').forEach(function (t) {
            t.classList.remove('on', 'active');
          });
          tab.classList.add('on', 'active');
        }
      });
    });

    /* ── 21. FAQ Accordion Smooth Expand ── */
    document.querySelectorAll('.faq-item, .faq-q').forEach(function (item) {
      var q = item.classList.contains('faq-q') ? item : item.querySelector('.faq-q, .faq-question, summary');
      var a = item.querySelector('.faq-a, .faq-answer, .faq-body');
      if (!q || !a) return;
      a.style.overflow = 'hidden';
      a.style.transition = 'max-height 0.38s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease';
      a.style.maxHeight = a.offsetHeight > 0 ? a.scrollHeight + 'px' : '0px';
      a.style.opacity = a.offsetHeight > 0 ? '1' : '0';
    });

    /* ── 22. Glow Pulse on Featured Product ── */
    document.querySelectorAll('.feat-cover, .feat-card .cover, .featured-card').forEach(function (el) {
      el.classList.add('glow-pulse');
    });

  }); /* end DOMContentLoaded */

})();
