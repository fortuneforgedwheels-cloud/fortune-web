(function () {
  function layerIsVisible(el) {
    if (!el) return false;
    try {
      var style = window.getComputedStyle(el);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    } catch (e) {
      return true;
    }
  }

  function prepareVideo(video) {
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.setAttribute('muted', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    video.preload = 'auto';
    // Shopify video_tag nests a poster <img> fallback that can look like a still.
    video.querySelectorAll('img').forEach(function (img) {
      img.setAttribute('aria-hidden', 'true');
      img.style.display = 'none';
    });
  }

  function playVideo(video) {
    prepareVideo(video);
    if (video.readyState < 2) {
      try {
        video.load();
      } catch (e) {}
    }
    var attempt = function () {
      var playPromise = video.play();
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(function () {
          // Retry once media can play — common after first paint / low-power mode.
          var onReady = function () {
            video.removeEventListener('canplay', onReady);
            video.removeEventListener('loadeddata', onReady);
            prepareVideo(video);
            var retry = video.play();
            if (retry && typeof retry.catch === 'function') retry.catch(function () {});
          };
          video.addEventListener('canplay', onReady, { once: true });
          video.addEventListener('loadeddata', onReady, { once: true });
        });
      }
    };
    attempt();
  }

  function pauseVideo(video, reset) {
    if (!video) return;
    try {
      video.pause();
    } catch (e) {}
    if (reset) {
      try {
        video.currentTime = 0;
      } catch (e2) {}
    }
  }

  function syncVideos(slides, activeIndex) {
    slides.forEach(function (slide, i) {
      var videos = slide.querySelectorAll('video');
      videos.forEach(function (video) {
        prepareVideo(video);
        var layer =
          video.closest('[data-ff-desktop-layer]') ||
          video.closest('[data-ff-mobile-layer]');
        var layerVisible = layerIsVisible(layer);
        var shouldPlay = i === activeIndex && layerVisible && !slide.hidden;
        if (shouldPlay) {
          if (video.paused || video.ended) playVideo(video);
        } else {
          pauseVideo(video, true);
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

    function refresh() {
      syncVideos(slides, index);
    }

    // Kick playback as soon as possible, then again after layout settles.
    refresh();
    window.requestAnimationFrame(refresh);
    window.setTimeout(refresh, 250);
    window.setTimeout(refresh, 1000);

    var resizeTimer = null;
    function onResize() {
      if (resizeTimer) window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refresh, 120);
    }
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(onResize);
      ro.observe(root);
    } else {
      window.addEventListener('resize', onResize);
    }

    // First user gesture unlocks autoplay on strict browsers.
    var unlock = function () {
      refresh();
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('keydown', unlock);
    };
    document.addEventListener('pointerdown', unlock, { once: true, passive: true });
    document.addEventListener('touchstart', unlock, { once: true, passive: true });
    document.addEventListener('keydown', unlock, { once: true });

    if (slides.length < 2) return;

    var timer = null;
    var delay = 6000;

    function activeHasVideo() {
      if (!slides[index]) return false;
      var videos = slides[index].querySelectorAll('video');
      for (var i = 0; i < videos.length; i++) {
        var layer =
          videos[i].closest('[data-ff-desktop-layer]') ||
          videos[i].closest('[data-ff-mobile-layer]');
        if (layerIsVisible(layer)) return true;
      }
      return false;
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
      refresh();
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
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refresh();
    });
    document.addEventListener('shopify:section:reorder', refresh);
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
