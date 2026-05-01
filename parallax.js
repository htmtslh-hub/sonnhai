/* parallax.js - Shared animation layer for Thu vien Son Nhai
   Effects:
   1. Fade-in + slide-up on scroll (IntersectionObserver)
   2. Parallax depth movement for hero glow orbs (mousemove)
   3. Parallax scroll for hero background layers
   4. Stagger animation for card grids
   5. Teal glow pulse on section headings
*/

(function () {
  'use strict';

  /* 1. SCROLL REVEAL (fade-in + slide-up) */
  const revealCSS = `
    .sr { opacity: 0; transform: translateY(28px); transition: opacity .6s cubic-bezier(.22,1,.36,1), transform .6s cubic-bezier(.22,1,.36,1); will-change: opacity, transform; }
    .sr.sr-left  { transform: translateX(-32px); }
    .sr.sr-right { transform: translateX(32px); }
    .sr.sr-scale { transform: scale(.94); }
    .sr.visible  { opacity: 1 !important; transform: none !important; }
    .sr-delay-1 { transition-delay: .08s; }
    .sr-delay-2 { transition-delay: .16s; }
    .sr-delay-3 { transition-delay: .24s; }
    .sr-delay-4 { transition-delay: .32s; }
    .sr-delay-5 { transition-delay: .40s; }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = revealCSS;
  document.head.appendChild(styleEl);

  function initScrollReveal() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.sr').forEach(el => io.observe(el));
  }

  /* 2. AUTO-TAG elements for scroll reveal */
  function autoTag() {
    const selectors = [
      '.sec-head', '.page-eyebrow', '.page-hero h1', '.page-hero p',
      '.post-header .post-title', '.post-header .post-meta',
      '.p-card', '.feat-card', '.bs-card', '.combo-card', '.blog-card',
      '.r-card', '.cat-chip',
      '.detail-tabs', '.related-section .sec-head',
      '.post-cover', '.post-author-box',
      '.form-block', '.summary-box', '.success-hero', '.download-card', '.order-card',
      '.nl', '.footer-inner',
    ];

    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach((el, i) => {
        if (el.closest('.sr')) return;
        el.classList.add('sr');
        const delay = Math.min(i % 6, 5);
        if (delay > 0) el.classList.add(`sr-delay-${delay}`);
      });
    });

    document.querySelectorAll('.hero-eyebrow, .hero-h1, .hero-sub, .hero-cta, .hero-stats').forEach(el => {
      el.classList.add('sr');
    });

    document.querySelectorAll('.sb-box, .post-sidebar .sb-box').forEach((el, i) => {
      el.classList.add('sr', 'sr-right');
      if (i > 0) el.classList.add(`sr-delay-${Math.min(i, 5)}`);
    });

    document.querySelectorAll('.toc-ch').forEach((el, i) => {
      el.classList.add('sr', 'sr-scale');
      el.classList.add(`sr-delay-${Math.min(i % 6, 5)}`);
    });
  }

  /* 3. PARALLAX SCROLL - hero glow orbs move at different speeds */
  function initParallaxScroll() {
    const layers = [
      { sel: '.hero-glow-top', speed: 0.35 },
      { sel: '.hero-glow-bl', speed: 0.20 },
      { sel: '.hero-grid', speed: 0.18 },
      { sel: '.hero-glow', speed: 0.28 },
      { sel: '.hero-glow-2', speed: 0.15 },
      { sel: '.page-hero-glow', speed: 0.25 },
      { sel: '.post-cover', speed: 0.12 },
    ];

    const targets = [];
    layers.forEach(({ sel, speed }) => {
      document.querySelectorAll(sel).forEach(el => {
        targets.push({ el, speed, baseY: 0 });
      });
    });

    if (!targets.length) return;

    let ticking = false;
    window.addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const sy = window.scrollY;
        targets.forEach(({ el, speed }) => {
          el.style.transform = `translateY(${sy * speed}px)`;
        });
        ticking = false;
      });
    }, { passive: true });
  }

  /* 4. MOUSEMOVE PARALLAX - glow orbs follow cursor subtly */
  function initMouseParallax() {
    const orbs = document.querySelectorAll(
      '.hero-glow-top, .hero-glow-bl, .hero-glow, .hero-glow-2, .page-hero-glow'
    );
    if (!orbs.length) return;

    if (window.matchMedia('(hover: none)').matches) return;

    let mx = 0, my = 0, cx = 0, cy = 0;
    let rafId;

    document.addEventListener('mousemove', e => {
      mx = (e.clientX / window.innerWidth - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    function lerp(a, b, t) { return a + (b - a) * t; }

    function tick() {
      cx = lerp(cx, mx, 0.06);
      cy = lerp(cy, my, 0.06);
      orbs.forEach((orb, i) => {
        const depth = 0.5 + (i % 3) * 0.3;
        const tx = cx * 18 * depth;
        const ty = cy * 12 * depth;
        const scrollY = parseFloat(orb.style.transform?.match(/translateY\(([^)]+)\)/)?.[1] || 0);
        orb.style.transform = `translateY(${scrollY}px) translate(${tx}px, ${ty}px)`;
      });
      rafId = requestAnimationFrame(tick);
    }
    tick();
  }

  /* 5. SECTION HEADING GLOW PULSE on enter viewport */
  function initHeadingGlow() {
    const css = `
      @keyframes headingGlow {
        0%   { text-shadow: none; }
        50%  { text-shadow: 0 0 32px rgba(0,212,212,.45), 0 0 64px rgba(0,212,212,.18); }
        100% { text-shadow: 0 0 16px rgba(0,212,212,.2); }
      }
      .heading-glow-anim { animation: headingGlow 1.4s ease forwards; }
    `;
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);

    const io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('heading-glow-anim');
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.5 });

    document.querySelectorAll('.sec-title, .page-hero h1, .hero-h1').forEach(el => io.observe(el));
  }

  /* 6. CARD HOVER TILT (subtle 3-D tilt on mouse) */
  function initCardTilt() {
    if (window.matchMedia('(hover: none)').matches) return;

    const tiltCSS = `
      .tilt-card { transition: transform .18s ease, box-shadow .18s ease; transform-style: preserve-3d; }
    `;
    const s = document.createElement('style');
    s.textContent = tiltCSS;
    document.head.appendChild(s);

    const cards = document.querySelectorAll('.p-card, .feat-card, .bs-card, .combo-card, .blog-card, .r-card');
    cards.forEach(card => {
      card.classList.add('tilt-card');

      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        const rx = -y * 6;
        const ry = x * 6;
        card.style.transform = `perspective(600px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px) scale(1.015)`;
        card.style.boxShadow = `0 8px 32px rgba(0,212,212,${0.08 + Math.abs(x + y) * 0.12})`;
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        card.style.boxShadow = '';
      });
    });
  }

  /* 7. FLOATING PARTICLES in hero (lightweight canvas) */
  function initHeroParticles() {
    const hero = document.querySelector('.hero, .page-hero, .success-hero, .post-header');
    if (!hero) return;

    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;opacity:.55;';
    hero.style.position = hero.style.position || 'relative';
    hero.insertBefore(canvas, hero.firstChild);

    const ctx = canvas.getContext('2d');
    let W, H, particles;

    function resize() {
      W = canvas.width = hero.offsetWidth;
      H = canvas.height = hero.offsetHeight;
    }

    function makeParticle() {
      return {
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.3,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.35 - 0.1,
        alpha: Math.random() * 0.5 + 0.15,
      };
    }

    function init() {
      resize();
      const count = Math.min(Math.floor(W * H / 9000), 80);
      particles = Array.from({ length: count }, makeParticle);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,212,${p.alpha})`;
        ctx.fill();

        p.x += p.vx;
        p.y += p.vy;

        if (p.y < -4) { p.y = H + 4; p.x = Math.random() * W; }
        if (p.x < -4) p.x = W + 4;
        if (p.x > W + 4) p.x = -4;
      });
      requestAnimationFrame(draw);
    }

    init();
    draw();
    window.addEventListener('resize', () => { init(); }, { passive: true });
  }

  /* INIT */
  function init() {
    autoTag();
    initScrollReveal();
    initParallaxScroll();
    initMouseParallax();
    initHeadingGlow();
    initCardTilt();
    initHeroParticles();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
