/* ═══════════════════════════════════════════════════════
   Thư viện Sơn Nhai — Parallax Engine v2.0
   Unified animation system with canvas particles & parallax
   ═══════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ═══════════════════════════════════════════════════════
     1. CANVAS PARTICLES BACKGROUND
     ═══════════════════════════════════════════════════════ */

  function initAtmosphereShell() {
    if (document.getElementById('snhai-atmosphere-style')) return;

    const style = document.createElement('style');
    style.id = 'snhai-atmosphere-style';
    style.textContent = `
      html { background: #08090E; }
      body { isolation: isolate; background-color: #08090E; }
      #snhai-grid-overlay {
        position: fixed;
        inset: 0;
        z-index: 0;
        pointer-events: none;
        opacity: .72;
        background-image:
          linear-gradient(rgba(0, 212, 212, .075) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 212, 212, .075) 1px, transparent 1px),
          radial-gradient(circle at 50% 18%, rgba(0, 212, 212, .12), transparent 34%),
          radial-gradient(circle at 12% 72%, rgba(0, 120, 190, .10), transparent 28%);
        background-size: 48px 48px, 48px 48px, 100% 100%, 100% 100%;
        background-position:
          var(--snhai-grid-x, 0px) var(--snhai-grid-y, 0px),
          var(--snhai-grid-x, 0px) var(--snhai-grid-y, 0px),
          center,
          center;
        mask-image: radial-gradient(ellipse 88% 78% at 50% 28%, black 0%, rgba(0,0,0,.78) 46%, transparent 100%);
      }
      #parallax-canvas {
        position: fixed !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 1 !important;
        pointer-events: none !important;
        opacity: .78;
        mix-blend-mode: screen;
      }
      :where(body > :not(script):not(style):not(#snhai-grid-overlay):not(#parallax-canvas):not(#scroll-progress):not(#back-to-top)) {
        position: relative;
        z-index: 2;
      }
      body.reduced-motion #parallax-canvas { display: none; }
      body.reduced-motion #snhai-grid-overlay { opacity: .38; }
      @media (max-width: 700px) {
        #snhai-grid-overlay {
          opacity: .52;
          background-size: 36px 36px, 36px 36px, 100% 100%, 100% 100%;
        }
        #parallax-canvas { opacity: .52; }
      }
    `;
    document.head.appendChild(style);

    if (!document.getElementById('snhai-grid-overlay')) {
      const grid = document.createElement('div');
      grid.id = 'snhai-grid-overlay';
      grid.setAttribute('aria-hidden', 'true');
      document.body.prepend(grid);
    }

    let gridTicking = false;
    function updateGrid() {
      const y = -((window.scrollY || 0) * 0.08) % 48;
      const x = -((window.scrollX || 0) * 0.08) % 48;
      document.documentElement.style.setProperty('--snhai-grid-x', x.toFixed(2) + 'px');
      document.documentElement.style.setProperty('--snhai-grid-y', y.toFixed(2) + 'px');
      gridTicking = false;
    }

    window.addEventListener('scroll', () => {
      if (gridTicking) return;
      gridTicking = true;
      requestAnimationFrame(updateGrid);
    }, { passive: true });
    updateGrid();
  }

  function initParticlesCanvas() {
    let canvas = document.getElementById('parallax-canvas');
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'parallax-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      document.body.prepend(canvas);
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return;

    let particles = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let mouseX = 0.5;
    let mouseY = 0.5;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = width + 'px';
      canvas.style.height = height + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function createParticle(index) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 0.32 + 0.08;
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.12,
        r: Math.random() * 1.45 + 0.75,
        alpha: Math.random() * 0.34 + 0.28,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed: Math.random() * 0.018 + 0.008,
        group: index % 3
      };
    }

    function resetParticles() {
      resize();
      const density = width < 720 ? 13000 : 10500;
      const count = Math.max(42, Math.min(118, Math.floor((width * height) / density)));
      particles = Array.from({ length: count }, (_, index) => createParticle(index));
    }

    function wrapParticle(p) {
      if (p.x < -24) p.x = width + 24;
      if (p.x > width + 24) p.x = -24;
      if (p.y < -24) p.y = height + 24;
      if (p.y > height + 24) p.y = -24;
    }

    function drawConnections() {
      const limit = width < 720 ? 86 : 118;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i];
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > limit) continue;

          const alpha = (1 - dist / limit) * 0.16;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(0, 212, 212, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    function draw() {
      ctx.clearRect(0, 0, width, height);
      drawConnections();

      const driftX = (mouseX - 0.5) * 0.14;
      const driftY = (mouseY - 0.5) * 0.14;

      particles.forEach((p) => {
        p.phase += p.phaseSpeed;
        const pulse = Math.sin(p.phase) * 0.18;
        const alpha = Math.max(0.12, Math.min(0.72, p.alpha + pulse));

        p.x += p.vx + driftX * (p.group + 1);
        p.y += p.vy + driftY * (p.group + 1);
        wrapParticle(p);

        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 7);
        glow.addColorStop(0, `rgba(0, 212, 212, ${alpha * 0.38})`);
        glow.addColorStop(1, 'rgba(0, 212, 212, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = `rgba(196, 255, 255, ${alpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }

    document.addEventListener('mousemove', (event) => {
      mouseX = event.clientX / Math.max(width, 1);
      mouseY = event.clientY / Math.max(height, 1);
    }, { passive: true });

    resetParticles();
    draw();

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resetParticles, 160);
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════
     2. PARALLAX SCROLL (Multi-layer depth)
     ═══════════════════════════════════════════════════════ */

  function initParallaxScroll() {
    const layers = document.querySelectorAll('.parallax-layer[data-depth]');
    if (!layers.length) return;

    const layerData = Array.from(layers).map(el => ({
      el,
      depth: parseFloat(el.dataset.depth) || 0.2
    }));

    let ticking = false;

    function update() {
      const scrollY = window.pageYOffset;

      layerData.forEach(({ el, depth }) => {
        const rect = el.getBoundingClientRect();
        const elementTop = rect.top + scrollY;
        const offset = (scrollY - elementTop) * depth;
        el.style.transform = `translate3d(0, ${offset}px, 0)`;
      });

      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ═══════════════════════════════════════════════════════
     3. MOUSEMOVE PARALLAX DEPTH (3D effect)
     ═══════════════════════════════════════════════════════ */

  function initMouseParallax() {
    const layers = document.querySelectorAll('.parallax-layer[data-mouse-depth]');
    if (!layers.length) return;

    const layerData = Array.from(layers).map(el => ({
      el,
      depth: parseFloat(el.dataset.mouseDepth) || 0.1,
      currentX: 0,
      currentY: 0,
      targetX: 0,
      targetY: 0
    }));

    let mouseX = 0;
    let mouseY = 0;
    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;

    document.addEventListener('mousemove', (e) => {
      mouseX = (e.clientX - centerX) / centerX;
      mouseY = (e.clientY - centerY) / centerY;
    }, { passive: true });

    function animate() {
      layerData.forEach(layer => {
        layer.targetX = mouseX * layer.depth * 30;
        layer.targetY = mouseY * layer.depth * 30;

        // Smooth lerp
        layer.currentX += (layer.targetX - layer.currentX) * 0.1;
        layer.currentY += (layer.targetY - layer.currentY) * 0.1;

        layer.el.style.transform = `translate3d(${layer.currentX}px, ${layer.currentY}px, 0)`;
      });

      requestAnimationFrame(animate);
    }

    animate();
  }

  /* ═══════════════════════════════════════════════════════
     4. SCROLL REVEAL (Fade-in with parallax transform)
     ═══════════════════════════════════════════════════════ */

  function initScrollReveal() {
    const elements = document.querySelectorAll('.parallax-reveal');
    if (!elements.length) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach(el => observer.observe(el));
  }

  /* ═══════════════════════════════════════════════════════
     5. SCROLL PROGRESS BAR
     ═══════════════════════════════════════════════════════ */

  function initScrollProgress() {
    let progressBar = document.getElementById('scroll-progress');
    if (!progressBar) {
      progressBar = document.createElement('div');
      progressBar.id = 'scroll-progress';
      document.body.appendChild(progressBar);
    }

    let ticking = false;

    function update() {
      const scrollTop = window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
      progressBar.style.width = `${progress}%`;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ═══════════════════════════════════════════════════════
     6. BACK TO TOP BUTTON
     ═══════════════════════════════════════════════════════ */

  function initBackToTop() {
    let btn = document.getElementById('back-to-top');
    if (!btn) {
      btn = document.createElement('div');
      btn.id = 'back-to-top';
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>';
      btn.title = 'Lên đầu trang';
      document.body.appendChild(btn);
    }

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    let ticking = false;

    function update() {
      const scrollY = window.pageYOffset;
      btn.classList.toggle('visible', scrollY > 400);
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ═══════════════════════════════════════════════════════
     7. NAVBAR SCROLL EFFECT
     ═══════════════════════════════════════════════════════ */

  function initNavbarScroll() {
    const navbar = document.querySelector('.nav');
    if (!navbar) return;

    let lastScrollY = 0;
    let ticking = false;

    function update() {
      const scrollY = window.pageYOffset;

      if (scrollY > 50) {
        navbar.classList.add('scrolled');
      } else {
        navbar.classList.remove('scrolled');
      }

      if (scrollY > 150) {
        if (scrollY > lastScrollY + 8) {
          navbar.classList.add('hidden');
        } else if (scrollY < lastScrollY - 5) {
          navbar.classList.remove('hidden');
        }
      } else {
        navbar.classList.remove('hidden');
      }

      lastScrollY = scrollY;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  }

  /* ═══════════════════════════════════════════════════════
     8. AUTO-TAG ELEMENTS FOR REVEAL
     ═══════════════════════════════════════════════════════ */

  function autoTagElements() {
    const selectors = [
      '.sec-head', '.product-card', '.book-card', '.feat-card',
      '.bs-item', '.combo-card', '.p-card', '.cat-chip',
      '.blog-card', '.review-card', '.stat-item', '.mission-card',
      '.team-card', '.timeline-item', '.value-card', '.faq-item',
      '.order-card', '.download-card', '.summary-box'
    ];

    selectors.forEach(selector => {
      document.querySelectorAll(selector).forEach((el, index) => {
        if (!el.classList.contains('parallax-reveal') && !el.closest('.parallax-reveal')) {
          el.classList.add('parallax-reveal');
          if (index > 0 && index < 6) {
            el.style.transitionDelay = `${index * 0.08}s`;
          }
        }
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     9. GRADIENT WAVE ANIMATION (Auto-apply to headings)
     ═══════════════════════════════════════════════════════ */

  function initGradientWave() {
    const headings = document.querySelectorAll('.hero-h1 .l2, .page-h1 span, .gradient-text');
    headings.forEach(el => {
      if (!el.classList.contains('gradient-wave')) {
        el.classList.add('gradient-wave');
      }
    });
  }

  /* ═══════════════════════════════════════════════════════
     10. PREFERS REDUCED MOTION
     ═══════════════════════════════════════════════════════ */

  function checkReducedMotion() {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      document.body.classList.add('reduced-motion');
    }
  }

  /* ═══════════════════════════════════════════════════════
     INITIALIZATION
     ═══════════════════════════════════════════════════════ */

  function init() {
    checkReducedMotion();
    initAtmosphereShell();
    initParticlesCanvas();
    autoTagElements();
    initGradientWave();
    initScrollReveal();
    initParallaxScroll();
    initMouseParallax();
    initScrollProgress();
    initNavbarScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
