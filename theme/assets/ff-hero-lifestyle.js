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

  function syncVideos(root, slides, activeIndex) {
    var mobile = root.getAttribute('data-ff-viewport') === 'mobile' || root.classList.contains('is-mobile-viewport');
    slides.forEach(function (slide, i) {
      var videos = slide.querySelectorAll('video');
      videos.forEach(function (video) {
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.setAttribute('webkit-playsinline', '');
        var inMobileLayer = !!(video.closest('[data-ff-mobile-layer]'));
        var inDesktopLayer = !!(video.closest('[data-ff-desktop-layer]'));
        var layerVisible = mobile ? inMobileLayer : inDesktopLayer;
        var shouldPlay = i === activeIndex && layerVisible;
        if (shouldPlay) {
          var playPromise = video.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(function () {});
          }
        } else {
          video.pause();
          try {
            video.currentTime = 0;
          } catch (e) {}
        }
      });
    });
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-dot]'));
    var index = Math.max(
      0,
      slides.findIndex(function (slide) {
        return slide.classList.contains('is-active');
      })
    );
    if (index < 0) index = 0;

    function refreshViewport() {
      setViewport(root);
      syncVideos(root, slides, index);
    }

    refreshViewport();
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        refreshViewport();
      });
      ro.observe(root);
    } else {
      window.addEventListener('resize', refreshViewport);
    }

    if (slides.length < 2) return;

    var timer = null;
    var delay = 6000;

    function activeHasVideo() {
      if (!slides[index]) return false;
      var mobile = root.getAttribute('data-ff-viewport') === 'mobile';
      var layer = slides[index].querySelector(mobile ? '[data-ff-mobile-layer]' : '[data-ff-desktop-layer]');
      return !!(layer && layer.querySelector('video'));
    }

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
      refreshViewport();
      start();
    }

    function start() {
      stop();
      var ms = activeHasVideo() ? 14000 : delay;
      timer = window.setInterval(function () {
        show(index + 1);
      }, ms);
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
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        show(index + 1);
      });
    }
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.getAttribute('data-ff-hero-dot')) || 0);
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    document.addEventListener('shopify:section:reorder', refreshViewport);
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
