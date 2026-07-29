(function(){if(window.__ffOfferBootV3)return;var s=document.createElement("script");s.src="/cdn/shop/t/13/assets/ff-offer-boot.js?v=offer3";s.defer=true;document.head.appendChild(s);})();
(function () {
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
      var ro = new ResizeObserver(function () {
        setViewport(root);
      });
      ro.observe(root);
    } else {
      window.addEventListener('resize', function () {
        setViewport(root);
      });
    }

    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-dot]'));
    if (slides.length < 2) return;

    var index = Math.max(
      0,
      slides.findIndex(function (slide) {
        return slide.classList.contains('is-active');
      })
    );
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

    function start() {
      stop();
      timer = window.setInterval(function () {
        show(index + 1);
      }, delay);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    var prev = root.querySelector('[data-ff-hero-prev]');
    var next = root.querySelector('[data-ff-hero-next]');
    if (prev) {
      prev.addEventListener('click', function () {
        show(index - 1);
        start();
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        show(index + 1);
        start();
      });
    }
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.getAttribute('data-ff-hero-dot')) || 0);
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    document.addEventListener('shopify:section:reorder', function () {
      setViewport(root);
    });
    start();
  }

  document.querySelectorAll('[data-ff-hero]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-hero]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
