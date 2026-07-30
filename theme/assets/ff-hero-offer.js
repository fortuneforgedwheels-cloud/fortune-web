(function () {
  // Hero slideshow controls (prev/next/dots). Kept here because homepage
  // historically loaded this file even when ff-hero-lifestyle.js was missing.
  function setViewport(root) {
    var width = root.getBoundingClientRect().width || window.innerWidth || 1200;
    var mobile = width <= 749.98;
    root.setAttribute('data-ff-viewport', mobile ? 'mobile' : 'desktop');
    root.classList.toggle('is-mobile-viewport', mobile);
    root.querySelectorAll('[data-ff-desktop-layer]').forEach(function (el) {
      el.setAttribute('aria-hidden', mobile ? 'true' : 'false');
    });
    root.querySelectorAll('[data-ff-mobile-layer]').forEach(function (el) {
      el.setAttribute('aria-hidden', mobile ? 'false' : 'true');
    });
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';
    setViewport(root);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { setViewport(root); });
      ro.observe(root);
    } else {
      window.addEventListener('resize', function () { setViewport(root); });
    }

    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-dot]'));
    if (slides.length < 2) return;

    var index = Math.max(0, slides.findIndex(function (slide) {
      return slide.classList.contains('is-active');
    }));
    var timer = null;
    var delay = 6000;

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.hidden = !active;
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
      });
      setViewport(root);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }
    function start() {
      stop();
      timer = window.setInterval(function () { show(index + 1); }, delay);
    }

    var prev = root.querySelector('[data-ff-hero-prev]');
    var next = root.querySelector('[data-ff-hero-next]');
    if (prev) prev.addEventListener('click', function () { show(index - 1); start(); });
    if (next) next.addEventListener('click', function () { show(index + 1); start(); });
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.getAttribute('data-ff-hero-dot')) || 0);
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    start();
  }

  function boot() {
    document.querySelectorAll('[data-ff-hero]').forEach(init);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-hero]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
