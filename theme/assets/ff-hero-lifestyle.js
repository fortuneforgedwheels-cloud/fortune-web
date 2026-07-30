(function () {
  /* Hardcoded homepage hero MP4s — clean muted autoplay, no controls, no nested poster img. */
  var HARD_SLIDES = [
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/92e8d7c7b0174fcdbeec08d65d2fd2cf/92e8d7c7b0174fcdbeec08d65d2fd2cf.HD-1080p-7.2Mbps-90297590.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/63c8141975ae4110a8861547f20aca76/63c8141975ae4110a8861547f20aca76.HD-1080p-7.2Mbps-90297806.mp4?v=0',
      posterDesktop:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/92e8d7c7b0174fcdbeec08d65d2fd2cf.thumbnail.0000000000.jpg?v=1785391047',
      posterMobile:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/63c8141975ae4110a8861547f20aca76.thumbnail.0000000000.jpg?v=1785391278',
    },
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/261a3f7c0dd64b71b8f5c3ef6641250a/261a3f7c0dd64b71b8f5c3ef6641250a.HD-1080p-7.2Mbps-90301640.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/261a3f7c0dd64b71b8f5c3ef6641250a/261a3f7c0dd64b71b8f5c3ef6641250a.HD-1080p-7.2Mbps-90301640.mp4?v=0',
      posterDesktop:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/261a3f7c0dd64b71b8f5c3ef6641250a.thumbnail.0000000000.jpg?v=1785394349',
      posterMobile:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/261a3f7c0dd64b71b8f5c3ef6641250a.thumbnail.0000000000.jpg?v=1785394349',
    },
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/e7fd235dfab64f38bcef7199a5c592e8/e7fd235dfab64f38bcef7199a5c592e8.HD-1080p-7.2Mbps-90304907.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/f3da456d74c54424be0bb9591ac2ed16/f3da456d74c54424be0bb9591ac2ed16.HD-1080p-4.8Mbps-90303270.mp4?v=0',
      posterDesktop:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/e7fd235dfab64f38bcef7199a5c592e8.thumbnail.0000000000.jpg?v=1785396035',
      posterMobile:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/f3da456d74c54424be0bb9591ac2ed16.thumbnail.0000000000.jpg?v=1785395101',
    },
  ];

  function makeVideo(src, poster, className) {
    var video = document.createElement('video');
    video.className = className;
    video.setAttribute('data-ff-autoplay-v', 'mp4-hardcoded-1');
    if (poster) video.setAttribute('poster', poster);
    video.setAttribute('src', src);
    video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('disablepictureinpicture', '');
    video.removeAttribute('controls');
    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = true;
    video.loop = true;
    try {
      video.volume = 0;
    } catch (e) {}
    return video;
  }

  function ensureLayerVideo(layer, src, poster, className) {
    if (!layer || !src) return;
    // Always install a clean autoplay tag — sticky HTML often has nested <img>,
    // controls, or source-only markup that blocks iOS autoplay.
    layer.querySelectorAll('img, .ff-hero__placeholder, video').forEach(function (el) {
      el.remove();
    });
    layer.appendChild(makeVideo(src, poster, className));
  }

  function ensureHardcodedVideos(root) {
    var slides = root.querySelectorAll('[data-ff-hero-slide]');
    slides.forEach(function (slide, i) {
      var hard = HARD_SLIDES[i];
      if (!hard) return;
      var desktop = slide.querySelector('[data-ff-desktop-layer]');
      var mobile = slide.querySelector('[data-ff-mobile-layer]');
      ensureLayerVideo(desktop, hard.desktop, hard.posterDesktop, 'ff-hero__video ff-hero__video--desktop');
      ensureLayerVideo(mobile, hard.mobile, hard.posterMobile, 'ff-hero__video ff-hero__video--mobile');
    });
  }

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
    video.autoplay = true;
    video.loop = true;
    video.playsInline = true;
    try {
      video.volume = 0;
    } catch (e) {}
    video.setAttribute('muted', '');
    video.setAttribute('autoplay', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('preload', 'auto');
    video.setAttribute('disablepictureinpicture', '');
    video.querySelectorAll('img').forEach(function (img) {
      img.remove();
    });
  }

  function tryPlay(video) {
    prepare(video);
    // Never call video.load() — it aborts buffering and freezes on the poster.
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        var retry = function () {
          prepare(video);
          var p2 = video.play();
          if (p2 && typeof p2.catch === 'function') p2.catch(function () {});
        };
        video.addEventListener('canplay', retry, { once: true });
        video.addEventListener('loadeddata', retry, { once: true });
        window.setTimeout(retry, 250);
        window.setTimeout(retry, 800);
        window.setTimeout(retry, 1600);
      });
    }
  }

  function videoShouldPlay(slide, video, isActiveSlide) {
    if (!isActiveSlide || slide.hidden) return false;
    var layer =
      video.closest('[data-ff-desktop-layer]') ||
      video.closest('[data-ff-mobile-layer]');
    if (!layer) return true;
    return isCssVisible(layer);
  }

  function sync(slides, activeIndex, resetInactive) {
    slides.forEach(function (slide, i) {
      var active = i === activeIndex;
      slide.querySelectorAll('video').forEach(function (video) {
        prepare(video);
        if (videoShouldPlay(slide, video, active)) {
          tryPlay(video);
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
    ensureHardcodedVideos(root);
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

    refresh(true);
    window.requestAnimationFrame(function () {
      refresh(false);
    });
    [50, 150, 400, 900, 1800, 3500].forEach(function (ms) {
      window.setTimeout(function () {
        refresh(false);
      }, ms);
    });

    var mq = window.matchMedia('(max-width: 749.98px)');
    var onViewport = function () {
      refresh(true);
    };
    if (mq.addEventListener) mq.addEventListener('change', onViewport);
    else if (mq.addListener) mq.addListener(onViewport);

    // Any user gesture unlocks autoplay on locked mobile browsers.
    var unlock = function () {
      refresh(false);
    };
    document.addEventListener('pointerdown', unlock, { passive: true });
    document.addEventListener('touchstart', unlock, { passive: true });
    document.addEventListener('touchend', unlock, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) refresh(false);
    });
    window.addEventListener('pageshow', function () {
      refresh(false);
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
    // Also strip controls / force play on any other FF autoplay videos on the page.
    document.querySelectorAll('.ff-values__feature-video, video[data-ff-autoplay], video[data-ff-autoplay-v]').forEach(function (video) {
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
