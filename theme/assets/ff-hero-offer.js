(function () {
  /* Theme Editor media only — never inject hardcoded CDN MP4s over uploads. */
  var mqMobile = window.matchMedia('(max-width: 749.98px)');

  function isCssVisible(el) {
    if (!el) return false;
    try {
      var style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;
      return Number(style.opacity) > 0;
    } catch (e) {
      return true;
    }
  }

  function preferMp4(video) {
    var current = video.currentSrc || video.src || '';
    if (current && current.indexOf('.m3u8') === -1 && current.indexOf('.mp4') !== -1) return;
    var sources = video.querySelectorAll('source');
    var mp4 = null;
    Array.prototype.forEach.call(sources, function (source) {
      var src = source.getAttribute('src') || '';
      var type = (source.getAttribute('type') || '').toLowerCase();
      if (src.indexOf('.mp4') !== -1 || type.indexOf('mp4') !== -1) mp4 = src;
    });
    if (!mp4 && video.getAttribute('src') && video.getAttribute('src').indexOf('.mp4') !== -1) {
      mp4 = video.getAttribute('src');
    }
    if (!mp4) return;
    Array.prototype.forEach.call(sources, function (source) {
      source.remove();
    });
    video.setAttribute('src', mp4);
  }

  function prepare(video) {
    preferMp4(video);
    video.controls = false;
    video.removeAttribute('controls');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    try {
      video.volume = 0;
    } catch (e) {}
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('disablepictureinpicture', '');
    video.querySelectorAll('img').forEach(function (img) {
      img.remove();
    });
    if (video.classList.contains('ff-hero__video--mobile')) {
      video.removeAttribute('poster');
    }
  }

  function isPlaying(video) {
    return !!(video && !video.paused && !video.ended && video.readyState > 2);
  }

  function tryPlay(video) {
    if (isPlaying(video)) return;
    prepare(video);
    video.autoplay = true;
    video.setAttribute('autoplay', '');
    video.setAttribute('preload', 'auto');
    try {
      video.preload = 'auto';
    } catch (ePre) {}
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        var retry = function () {
          if (isPlaying(video)) return;
          prepare(video);
          video.setAttribute('preload', 'auto');
          try {
            video.preload = 'auto';
          } catch (ePre2) {}
          var p2 = video.play();
          if (p2 && typeof p2.catch === 'function') p2.catch(function () {});
        };
        video.addEventListener('canplay', retry, { once: true });
        video.addEventListener('loadeddata', retry, { once: true });
        window.setTimeout(retry, 80);
        window.setTimeout(retry, 250);
      });
    }
  }

  function videoShouldPlay(slide, video, isActiveSlide) {
    if (!isActiveSlide || slide.hidden) return false;
    var layer =
      video.closest('[data-ff-desktop-layer]') ||
      video.closest('[data-ff-mobile-layer]');
    if (!layer || !isCssVisible(layer)) return false;
    var isMobile = mqMobile.matches;
    if (isMobile) return video.classList.contains('ff-hero__video--mobile');
    return video.classList.contains('ff-hero__video--desktop');
  }

  function sync(slides, activeIndex) {
    slides.forEach(function (slide, i) {
      var active = i === activeIndex;
      slide.querySelectorAll('video').forEach(function (video) {
        if (videoShouldPlay(slide, video, active)) {
          // Leave a healthy native-autoplay video alone — re-calling play/prepare
          // after src thrash is what made playback start late.
          if (!isPlaying(video)) tryPlay(video);
        } else {
          try {
            video.pause();
          } catch (e) {}
          video.removeAttribute('autoplay');
          video.autoplay = false;
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

    function refresh() {
      sync(slides, index);
    }

    // One immediate nudge only if the visible video is still paused.
    refresh();
    window.requestAnimationFrame(refresh);

    var onViewport = function () {
      refresh();
    };
    if (mqMobile.addEventListener) mqMobile.addEventListener('change', onViewport);
    else if (mqMobile.addListener) mqMobile.addListener(onViewport);

    var unlock = function () {
      refresh();
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refresh();
    });
    window.addEventListener('pageshow', refresh);

    if (slides.length < 2) return;

    var timer = null;

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
      timer = window.setInterval(function () {
        show(index + 1);
      }, 14000);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    var prev = root.querySelector('[data-ff-hero-prev]');
    var nextBtn = root.querySelector('[data-ff-hero-next]');
    if (prev) prev.addEventListener('click', function () { show(index - 1); });
    if (nextBtn) nextBtn.addEventListener('click', function () { show(index + 1); });
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
    document.querySelectorAll('.ff-values__feature-video').forEach(function (video) {
      prepare(video);
      tryPlay(video);
    });
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
