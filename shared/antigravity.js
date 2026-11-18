/* 호박 (Hobak) - Antigravity Design Expert Motion & Spatial Depth Engine (GSAP + 3D CSS) */
(function (global) {
  function initAntigravity() {
    const prefersReduced =
      global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) return;

    const gsap = global.gsap;
    if (!gsap) return;

    if (global.ScrollTrigger) {
      gsap.registerPlugin(global.ScrollTrigger);
    }

    // 1. Subtle zero-gravity floating drift on promo card, logo, and floating badges
    gsap.to('.sidebar-promo', {
      y: -7,
      duration: 2.8,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });

    gsap.to('.hobak-logo svg', {
      y: -3,
      rotation: 3,
      duration: 2.4,
      ease: 'sine.inOut',
      yoyo: true,
      repeat: -1
    });

    // 2. Smooth entrance for detail card, write cards, and sidebar
    gsap.from('.detail-card, .write-form-card, .write-preview-column, .sidebar-card', {
      y: 22,
      opacity: 0,
      duration: 0.6,
      stagger: 0.08,
      ease: 'power3.out',
      clearProps: 'transform,opacity'
    });

    // 3. Scroll-linked / staggered card entrance + 3D spatial tilt
    bindCardEffects();

    // Re-bind when product grid re-renders (filtering/pagination)
    const grid = document.getElementById('product-grid');
    if (grid && global.MutationObserver) {
      const observer = new MutationObserver(() => {
        bindCardEffects();
      });
      observer.observe(grid, { childList: true });
    }
  }

  function bindCardEffects() {
    const gsap = global.gsap;
    const cards = document.querySelectorAll('.product-card');
    if (!cards.length) return;

    if (gsap) {
      gsap.fromTo(
        cards,
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.5,
          stagger: 0.045,
          ease: 'power3.out',
          clearProps: 'transform,opacity'
        }
      );
    }

    // Spatial 3D perspective tilt on hover
    const tiltTargets = document.querySelectorAll(
      '.product-card, .detail-preview-card, .sidebar-card'
    );
    tiltTargets.forEach((el) => {
      if (el.dataset.antigravityBound === '1') return;
      el.dataset.antigravityBound = '1';

      el.addEventListener('mousemove', (e) => {
        const rect = el.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        const rotateY = x * 7;
        const rotateX = -y * 7;
        el.style.transform = `perspective(900px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-6px)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAntigravity);
  } else {
    initAntigravity();
  }

  global.HobakAntigravity = {
    refresh: bindCardEffects
  };
})(window);
