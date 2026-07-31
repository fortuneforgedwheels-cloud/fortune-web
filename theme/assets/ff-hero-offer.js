(function () {
  /* Hardcoded MP4s. Only ONE visible active-slide video plays (iOS multi-play block). */
  var HARD_SLIDES = [
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/92e8d7c7b0174fcdbeec08d65d2fd2cf/92e8d7c7b0174fcdbeec08d65d2fd2cf.HD-1080p-7.2Mbps-90297590.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/63c8141975ae4110a8861547f20aca76/63c8141975ae4110a8861547f20aca76.HD-1080p-7.2Mbps-90297806.mp4?v=0',
      posterDesktop:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/92e8d7c7b0174fcdbeec08d65d2fd2cf.thumbnail.0000000000.jpg?v=1785391047',
      posterMobile: '',
    },
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/261a3f7c0dd64b71b8f5c3ef6641250a/261a3f7c0dd64b71b8f5c3ef6641250a.HD-1080p-7.2Mbps-90301640.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/261a3f7c0dd64b71b8f5c3ef6641250a/261a3f7c0dd64b71b8f5c3ef6641250a.HD-1080p-7.2Mbps-90301640.mp4?v=0',
      posterDesktop:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/261a3f7c0dd64b71b8f5c3ef6641250a.thumbnail.0000000000.jpg?v=1785394349',
      posterMobile: '',
    },
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/e7fd235dfab64f38bcef7199a5c592e8/e7fd235dfab64f38bcef7199a5c592e8.HD-1080p-7.2Mbps-90304907.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/f3da456d74c54424be0bb9591ac2ed16/f3da456d74c54424be0bb9591ac2ed16.HD-1080p-4.8Mbps-90303270.mp4?v=0',
      posterDesktop:
        'https://fortuneforgedwheels.com/cdn/shop/files/preview_images/e7fd235dfab64f38bcef7199a5c592e8.thumbnail.0000000000.jpg?v=1785396035',
      posterMobile: '',
    },
  ];

  var mqMobile = window.matchMedia('(max-width: 749.98px)');

  function makeVideo(src, poster, className, withAutoplay) {
    var video = document.createElement('video');
    video.className = className;
    video.setAttribute('data-ff-autoplay-v', 'mp4-hardcoded-1');
    if (poster) video.setAttribute('poster', poster);
    video.setAttribute('src', src);
    if (withAutoplay) video.setAttribute('autoplay', '');
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.setAttribute('preload', 'auto');
    video.setAttribute('disablepictureinpicture', '');
    video.removeAttribute('controls');
    video.controls = false;
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.autoplay = !!withAutoplay;
    video.loop = true;
    try {
      video.volume = 0;
    } catch (e) {}
    return video;
  }

  function videoLooksClean(video, src) {
    if (!video) return false;
    var cur = video.getAttribute('src') || '';
    if (cur.indexOf(src.split('?')[0]) === -1) return false;
    if (video.querySelector('img, source')) return false;
    if (video.hasAttribute('controls')) return false;
    return true;
  }

  function ensureLayerVideo(layer, src, poster, className, withAutoplay) {
    if (!layer || !src) return;
    var existing = layer.querySelector('video');
    if (videoLooksClean(existing, src)) {
      // Do not re-prepare a clean video that is already autoplaying — prepare/play
      // storms were freezing the first frame for 1–3s then restarting late.
      if (!(existing && !existing.paused && existing.readyState > 2)) {
        prepare(existing);
      }
      return existing;
    }
    layer.querySelectorAll('img, .ff-hero__placeholder, video').forEach(function (el) {
      el.remove();
    });
    var video = makeVideo(src, poster, className, withAutoplay);
    layer.appendChild(video);
    return video;
  }

  function layerHasUsableMp4(layer) {
    if (!layer) return false;
    var video = layer.querySelector('video');
    if (!video) return false;
    var src = video.getAttribute('src') || video.currentSrc || '';
    if (src.indexOf('.mp4') !== -1 && src.indexOf('.m3u8') === -1) return true;
    var sources = video.querySelectorAll('source');
    for (var i = 0; i < sources.length; i++) {
      var s = sources[i].getAttribute('src') || '';
      var t = (sources[i].getAttribute('type') || '').toLowerCase();
      if (s.indexOf('.mp4') !== -1 || t.indexOf('mp4') !== -1) return true;
    }
    return false;
  }

  function ensureHardcodedVideos(root) {
    /* Hardcoded URLs are FALLBACKS only — never overwrite Theme Editor videos. */
    var slides = root.querySelectorAll('[data-ff-hero-slide]');
    var isMobile = mqMobile.matches;
    slides.forEach(function (slide, i) {
      var hard = HARD_SLIDES[i];
      if (!hard) return;
      var desktop = slide.querySelector('[data-ff-desktop-layer]');
      var mobile = slide.querySelector('[data-ff-mobile-layer]');
      var isActive = slide.classList.contains('is-active') && !slide.hidden;
      if (!layerHasUsableMp4(desktop)) {
        ensureLayerVideo(
          desktop,
          hard.desktop,
          hard.posterDesktop,
          'ff-hero__video ff-hero__video--desktop',
          isActive && !isMobile
        );
      }
      if (!layerHasUsableMp4(mobile)) {
        ensureLayerVideo(
          mobile,
          hard.mobile,
          hard.posterMobile,
          'ff-hero__video ff-hero__video--mobile',
          isActive && isMobile
        );
      }
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
    var p = video.play();
    if (p && typeof p.catch === 'function') {
      p.catch(function () {
        var retry = function () {
          if (isPlaying(video)) return;
          prepare(video);
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

    function refresh() {
      sync(slides, index);
    }

    // One immediate nudge only if the visible video is still paused.
    refresh();
    window.requestAnimationFrame(refresh);

    var onViewport = function () {
      delete root.dataset.ffReady;
      ensureHardcodedVideos(root);
      root.dataset.ffReady = '1';
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
