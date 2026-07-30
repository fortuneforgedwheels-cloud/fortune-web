(function () {
  function isCssVisible(el) {
    if (!el) return false;
    try {
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      // Opacity on this node only — ancestors are handled via slide.hidden / is-active.
      return Number(style.opacity) > 0;
    } catch (e) {
      return true;
    }
  }

  function prepare(video) {
    video.muted = true;
    video.defaultMuted = true;
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    if (video.getAttribute('preload') !== 'auto') video.setAttribute('preload', 'auto');
    video.querySelectorAll('img').forEach(function (img) {
      img.style.display = 'none';
      img.setAttribute('hidden', '');
    });
  }

  function tryPlay(video) {
    prepare(video);
    // Never call video.load() — it aborts buffering and freezes on the poster.
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        // Autoplay can fail before enough data; retry when ready.
        var retry = function () {
          prepare(video);
          var p2 = video.play();
          if (p2 && typeof p2.catch === 'function') p2.catch(function () {});
        };
        video.addEventListener('canplay', retry, { once: true });
        video.addEventListener('loadeddata', retry, { once: true });
        window.setTimeout(retry, 400);
      });
    }
  }

  function videoShouldPlay(slide, video, isActiveSlide) {
    if (!isActiveSlide || slide.hidden) return false;
    var layer =
      video.closest('[data-ff-desktop-layer]') ||
      video.closest('[data-ff-mobile-layer]');
    // If no layer wrapper, treat as playable.
    if (!layer) return true;
    return isCssVisible(layer);
  }

  function sync(slides, activeIndex, resetInactive) {
    slides.forEach(function (slide, i) {
      var active = i === activeIndex;
      slide.querySelectorAll('video').forEach(function (video) {
        prepare(video);
        if (videoShouldPlay(slide, video, active)) {
          if (video.paused || video.ended) tryPlay(video);
        } else if (resetInactive) {
          try {
            video.pause();
          } catch (e) {}
          try {
            if (video.currentTime > 0.1) video.currentTime = 0;
          } catch (e2) {}
        } else {
          try {
            video.pause();
          } catch (e3) {}
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
      slides.findIndex(function (s) {
        return s.classList.contains('is-active');
      })
    );
    if (index < 0) index = 0;

    function refresh(resetInactive) {
      sync(slides, index, !!resetInactive);
    }

    // Immediate + delayed kicks (fonts / layout / Shopify apps settle late).
    refresh(true);
    window.requestAnimationFrame(function () {
      refresh(false);
    });
    [100, 300, 800, 1600, 3000].forEach(function (ms) {
      window.setTimeout(function () {
        refresh(false);
      }, ms);
    });

    // MatchMedia is more reliable than measuring the hero box.
    var mq = window.matchMedia('(max-width: 749.98px)');
    var onViewport = function () {
      refresh(true);
    };
    if (mq.addEventListener) mq.addEventListener('change', onViewport);
    else if (mq.addListener) mq.addListener(onViewport);

    var unlock = function () {
      refresh(false);
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refresh(false);
    });

    if (slides.length < 2) return;

    var timer = null;

    function activeHasVideo() {
      if (!slides[index]) return false;
      var found = false;
      slides[index].querySelectorAll('video').forEach(function (video) {
        if (videoShouldPlay(slides[index], video, true)) found = true;
      });
      return found;
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
      refresh(true);
      start();
    }

    function start() {
      stop();
      timer = window.setInterval(function () {
        show(index + 1);
      }, activeHasVideo() ? 14000 : 6000);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    var prev = root.querySelector('[data-ff-hero-prev]');
    var next = root.querySelector('[data-ff-hero-next]');
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (next) next.addEventListener('click', function () { show(index + 1); });
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.getAttribute('data-ff-hero-dot')) || 0);
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
