/* ═══════════════════════════════════════════════════════
   Thư viện Sơn Nhai — Morph Effects Engine
   Auto-applies morph effects to matching elements
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Respect reduced-motion preference ── */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  window.addEventListener('DOMContentLoaded', function () {

    /* ────────────────────────────────────────
       1. MORPH BLOB INJECTION
       Inject animated blob backgrounds into
       hero and featured sections
    ──────────────────────────────────────── */
    function injectBlobs() {
      var blobTargets = document.querySelectorAll(
        '.hero, .hero-section, .page-hero, .feat, .nl'
      );

      blobTargets.forEach(function (section) {
        /* Skip if blobs already injected */
        if (section.querySelector('.morph-blob')) return;

        /* Make sure section has relative position */
        var pos = getComputedStyle(section).position;
        if (pos === 'static') section.style.position = 'relative';

        /* Blob 1 — top right */
        var blob1 = document.createElement('div');
        blob1.className = 'morph-blob';
        blob1.style.cssText = 'width:320px;height:320px;top:-80px;right:-60px;';

        /* Blob 2 — bottom left */
        var blob2 = document.createElement('div');
        blob2.className = 'morph-blob morph-blob-2';
        blob2.style.cssText = 'width:250px;height:250px;bottom:-50px;left:-40px;';

        section.insertBefore(blob2, section.firstChild);
        section.insertBefore(blob1, section.firstChild);
      });
    }

    if (!prefersReduced) injectBlobs();


    /* ────────────────────────────────────────
       2. MORPH REVEAL — Scroll Observer
       Apply morph-reveal to cards and sections
    ──────────────────────────────────────── */
    function setupMorphReveal() {
      if (!('IntersectionObserver' in window)) return;

      var morphSelectors = [
        '.cat-card',           /* Category cards on homepage */
        '.cat-banner',         /* Category banner cards */
        '.cat-chip',           /* Category chips */
        '.combo-card',         /* Combo cards */
        '.blog-card',          /* Blog cards */
        '.bs-item',            /* Bestseller items */
        '.sidebar-box',        /* Sidebar filter boxes */
        '.nl',                 /* Newsletter section */
        '.feat-cover',         /* Featured cover image */
      ];

      var morphObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            morphObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.06, rootMargin: '0px 0px -20px 0px' });

      var seen = new WeakSet();
      morphSelectors.forEach(function (sel) {
        document.querySelectorAll(sel).forEach(function (el, index) {
          if (seen.has(el)) return;
          seen.add(el);
          /* Don't override if already has reveal class */
          if (el.classList.contains('morph-reveal')) {
            morphObserver.observe(el);
            return;
          }
          /* Add morph-reveal */
          el.classList.add('morph-reveal');
          morphObserver.observe(el);
        });
      });
    }

    setupMorphReveal();


    /* ────────────────────────────────────────
       3. MORPH COVER — Add to featured cover
    ──────────────────────────────────────── */
    function setupMorphCovers() {
      document.querySelectorAll('.feat-cover').forEach(function (cover) {
        if (!cover.classList.contains('morph-cover')) {
          cover.classList.add('morph-cover');
        }
      });
    }

    setupMorphCovers();


    /* ────────────────────────────────────────
       4. MORPH TEXT — Apply to hero gradient text
    ──────────────────────────────────────── */
    function setupMorphText() {
      document.querySelectorAll('.hero-h1 .l2, .page-h1 span').forEach(function (el) {
        if (!el.classList.contains('morph-text')) {
          el.classList.add('morph-text');
        }
      });
    }

    if (!prefersReduced) setupMorphText();


    /* ────────────────────────────────────────
       5. MORPH BUTTONS — Apply to CTA buttons
    ──────────────────────────────────────── */
    function setupMorphButtons() {
      document.querySelectorAll(
        '.hero-cta .btn, .feat-btns .btn, .combo-cta'
      ).forEach(function (btn) {
        if (!btn.classList.contains('morph-btn')) {
          btn.classList.add('morph-btn');
        }
      });
    }

    setupMorphButtons();


    /* ────────────────────────────────────────
       6. MORPH ICON — Category icon shapes
    ──────────────────────────────────────── */
    function setupMorphIcons() {
      document.querySelectorAll('.cat-ico, .cb-emoji, .combo-book').forEach(function (ico) {
        if (!ico.classList.contains('morph-icon')) {
          ico.classList.add('morph-icon');
          /* Add subtle bg for the morph shape */
          if (ico.classList.contains('cat-ico') || ico.classList.contains('cb-emoji')) {
            ico.style.cssText += ';width:56px;height:56px;background:rgba(0,212,212,0.06);margin:0 auto;';
          }
        }
      });
    }

    if (!prefersReduced) setupMorphIcons();


    /* ────────────────────────────────────────
       7. MORPH DIVIDER — Insert wavy dividers
    ──────────────────────────────────────── */
    function insertMorphDividers() {
      var dividerTargets = [
        { after: '.hero', fill: 'var(--bg, #08090E)' },
        { after: '.feat', fill: 'var(--bg, #08090E)' },
      ];

      dividerTargets.forEach(function (cfg) {
        var target = document.querySelector(cfg.after);
        if (!target) return;
        /* Skip if already has a divider */
        if (target.nextElementSibling && target.nextElementSibling.classList.contains('morph-divider')) return;

        var divider = document.createElement('div');
        divider.className = 'morph-divider';
        divider.innerHTML =
          '<svg viewBox="0 0 1440 80" preserveAspectRatio="none">' +
            '<path class="wave-1" fill="' + cfg.fill + '" d="M0,40 C120,10 240,55 360,35 C480,15 600,50 720,40 C840,30 960,55 1080,35 C1200,15 1320,45 1440,40 L1440,80 L0,80 Z"/>' +
            '<path class="wave-2" fill="' + cfg.fill + '" d="M0,50 C180,25 360,60 540,40 C720,20 900,55 1080,45 C1200,35 1350,55 1440,50 L1440,80 L0,80 Z"/>' +
          '</svg>';

        target.parentNode.insertBefore(divider, target.nextSibling);
      });
    }

    if (!prefersReduced) insertMorphDividers();


    /* ────────────────────────────────────────
       8. MORPH STAGGER — Auto-apply to grids
    ──────────────────────────────────────── */
    function setupMorphStagger() {
      document.querySelectorAll(
        '.cats-grid, .cat-banner-grid, .combo-grid, .blog-grid, .bs-grid'
      ).forEach(function (grid) {
        if (!grid.classList.contains('morph-stagger')) {
          grid.classList.add('morph-stagger');
        }
      });
    }

    setupMorphStagger();


    /* ────────────────────────────────────────
       9. CARD MORPH HOVER — Enhanced hover with
          organic shape shift
    ──────────────────────────────────────── */
    function setupCardMorphHover() {
      var cards = document.querySelectorAll('.card, .p-card');

      cards.forEach(function (card) {
        if (card.dataset.morphHover) return;
        card.dataset.morphHover = '1';

        card.addEventListener('mouseenter', function () {
          card.style.borderRadius = '18px';
          card.style.transition = 'border-radius 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.3s ease';
        });

        card.addEventListener('mouseleave', function () {
          card.style.borderRadius = '';
          card.style.transition = 'border-radius 0.4s ease, transform 0.4s cubic-bezier(0.16,1,0.3,1), box-shadow 0.4s ease, border-color 0.3s ease';
        });
      });
    }

    setupCardMorphHover();


    /* ────────────────────────────────────────
       10. RE-APPLY ON DYNAMIC CONTENT
       Watch for dynamically injected product cards
    ──────────────────────────────────────── */
    if ('MutationObserver' in window) {
      var dynamicTargets = document.querySelectorAll(
        '#home-featured-grid, #home-bestseller-grid, #home-combo-grid, #home-blog-grid, #prod-grid'
      );

      dynamicTargets.forEach(function (container) {
        if (!container) return;

        var dynObserver = new MutationObserver(function () {
          /* Re-apply morph effects after DOM changes */
          setupMorphReveal();
          setupMorphCovers();
          setupCardMorphHover();
          setupMorphStagger();
          if (!prefersReduced) {
            setupMorphIcons();
            setupMorphButtons();
          }
        });

        dynObserver.observe(container, { childList: true, subtree: false });
      });
    }


    /* ────────────────────────────────────────
       11. HERO STAT NUMBER MORPH
       Add subtle scale morph when counters
       are animating
    ──────────────────────────────────────── */
    document.querySelectorAll('.hs-num, .pstat-num, .fn-val').forEach(function (el) {
      el.style.transition = 'transform 0.4s cubic-bezier(0.16,1,0.3,1)';
      el.addEventListener('mouseenter', function () {
        el.style.transform = 'scale(1.15)';
      });
      el.addEventListener('mouseleave', function () {
        el.style.transform = 'scale(1)';
      });
    });

  }); /* end DOMContentLoaded */

})();
