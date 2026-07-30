/* BOOT_BUILD 2026-07-30-mobile-autoplay-1 */
/* NEVER redirect homepage to ?view=vehicle — that URL was sticky-cached with broken HLS hero markup. */
(function () {
  try {
    if (window.Shopify && (Shopify.designMode || Shopify.editorAssets)) return;
    var path = (location.pathname || '/').replace(/\/+$/, '') || '/';
    var qs = location.search || '';
    // Escape sticky broken vehicle homepage cache immediately.
    // Escape sticky broken caches onto the fresh mobile-autoplay homepage view.
    if ((path === '/' || path === '') && /[?&]view=vehicle(?:&|$)/.test(qs)) {
      location.replace('/?view=ffnow' + (location.hash || ''));
      return;
    }
    if (
      (path === '/' || path === '' || path === '/index') &&
      !/[?&]view=ffnow(?:&|$)/.test(qs) &&
      !document.querySelector('[data-ff-fingerprint^="HERO-MOBILE-AUTOPLAY"]')
    ) {
      location.replace('/?view=ffnow' + (location.hash || ''));
      return;
    }
  } catch (e) {}
})();

function ffThemeAsset(name, bust) {
  var probe = document.querySelector("script[src*='/cdn/shop/t/'][src*='/assets/'], link[href*='/cdn/shop/t/'][href*='/assets/']");
  var base = "/cdn/shop/t/13/assets/";
  if (probe) {
    var raw = probe.getAttribute("src") || probe.getAttribute("href") || "";
    var m = raw.match(/(\/cdn\/shop\/t\/\d+\/assets\/)/);
    if (m) base = m[1];
  }
  return base + name + (bust ? ("?v=" + bust) : "");
}

/**
 * Fortune Forged page + offer bootloader.
 * - Upgrades sticky-cached About / Beadlock Packages pages to latest FF markup
 * - Injects $100-off offer markup if missing, then opens after delay
 */
(function () {
  if (window.__ffStickyPageBoot) return;
  window.__ffStickyPageBoot = true;

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function ensureCss(doc, needle, fallback) {
    if (document.querySelector('link[href*="' + needle + '"]')) return;
    var href = fallback;
    if (doc) {
      var link = doc.querySelector('link[href*="' + needle + '"]');
      if (link) href = link.getAttribute('href') || fallback;
    }
    var el = document.createElement('link');
    el.rel = 'stylesheet';
    el.href = href;
    document.head.appendChild(el);
  }

  function ensureScripts(doc, needle) {
    if (!doc) return;
    doc.querySelectorAll('script[src*="' + needle + '"]').forEach(function (srcEl) {
      var src = srcEl.getAttribute('src');
      if (!src || document.querySelector('script[src="' + src + '"]')) return;
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      document.body.appendChild(s);
    });
  }

  function swapMainUrl(url, isFresh, cssNeedle, cssFallback, jsNeedle, flag) {
    var main = document.getElementById('MainContent');
    if (!main) return;

    fetch(url, {
      credentials: 'same-origin',
      headers: { Accept: 'text/html' }
    })
      .then(function (res) {
        if (!res.ok) throw new Error(url + ' fetch failed');
        return res.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var next = doc.getElementById('MainContent');
        if (!next || !isFresh(next)) return;
        ensureCss(doc, cssNeedle, cssFallback);
        if (jsNeedle) ensureScripts(doc, jsNeedle);
        main.replaceWith(next);
        document.documentElement.classList.add(flag);
        try {
          healHeroVideos();
        } catch (e0) {}
        try {
          document.querySelectorAll('[data-ff-hero]').forEach(function (root) {
            try { delete root.dataset.ffReady; } catch (e1) {}
          });
          document.dispatchEvent(new CustomEvent('shopify:section:load', { bubbles: true }));
          document.dispatchEvent(new CustomEvent('ff:main-swapped', { bubbles: true }));
        } catch (e) {}
        [100, 400, 1000].forEach(function (ms) {
          window.setTimeout(healHeroVideos, ms);
        });
      })
      .catch(function () {});
  }

  function swapMain(view, isFresh, cssNeedle, cssFallback, jsNeedle, flag) {
    swapMainUrl(
      location.pathname + '?view=' + encodeURIComponent(view),
      isFresh,
      cssNeedle,
      cssFallback,
      jsNeedle,
      flag
    );
  }

  var HARD_SLIDES = [
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/92e8d7c7b0174fcdbeec08d65d2fd2cf/92e8d7c7b0174fcdbeec08d65d2fd2cf.HD-1080p-7.2Mbps-90297590.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/63c8141975ae4110a8861547f20aca76/63c8141975ae4110a8861547f20aca76.HD-1080p-7.2Mbps-90297806.mp4?v=0',
    },
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/261a3f7c0dd64b71b8f5c3ef6641250a/261a3f7c0dd64b71b8f5c3ef6641250a.HD-1080p-7.2Mbps-90301640.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/261a3f7c0dd64b71b8f5c3ef6641250a/261a3f7c0dd64b71b8f5c3ef6641250a.HD-1080p-7.2Mbps-90301640.mp4?v=0',
    },
    {
      desktop:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/e7fd235dfab64f38bcef7199a5c592e8/e7fd235dfab64f38bcef7199a5c592e8.HD-1080p-7.2Mbps-90304907.mp4?v=0',
      mobile:
        'https://fortuneforgedwheels.com/cdn/shop/videos/c/vp/f3da456d74c54424be0bb9591ac2ed16/f3da456d74c54424be0bb9591ac2ed16.HD-1080p-4.8Mbps-90303270.mp4?v=0',
    },
  ];

  var mqHeroMobile = window.matchMedia('(max-width: 749.98px)');

  function prepHeroVideo(video) {
    if (!video) return;
    var sources = video.querySelectorAll('source');
    var mp4 = null;
    Array.prototype.forEach.call(sources, function (source) {
      var src = source.getAttribute('src') || '';
      if (src.indexOf('.mp4') !== -1) mp4 = src;
      if (src.indexOf('.m3u8') !== -1) source.remove();
    });
    if (!mp4 && (video.getAttribute('src') || '').indexOf('.mp4') !== -1) {
      mp4 = video.getAttribute('src');
    }
    if (mp4) {
      if (!(video.getAttribute('src') || '').length || (video.getAttribute('src') || '').indexOf('.m3u8') !== -1) {
        video.setAttribute('src', mp4);
      }
    }
    video.controls = false;
    video.removeAttribute('controls');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.playsInline = true;
    try {
      video.volume = 0;
    } catch (eVol) {}
    video.setAttribute('muted', '');
    video.setAttribute('loop', '');
    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    video.querySelectorAll('img').forEach(function (img) {
      img.remove();
    });
    // iOS shows a static poster + Play chrome when many videos compete.
    if (video.classList.contains('ff-hero__video--mobile')) {
      video.removeAttribute('poster');
    }
  }

  function layerIsVisible(layer) {
    if (!layer) return false;
    try {
      var style = window.getComputedStyle(layer);
      return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0;
    } catch (e) {
      return true;
    }
  }

  function injectHardcodedHeroVideos() {
    var slides = document.querySelectorAll('[data-ff-hero-slide]');
    if (!slides.length) return;
    var isMobile = mqHeroMobile.matches;
    slides.forEach(function (slide, i) {
      var hard = HARD_SLIDES[i];
      if (!hard) return;
      var isActive = slide.classList.contains('is-active') && !slide.hidden;
      [
        {
          layer: slide.querySelector('[data-ff-desktop-layer]'),
          src: hard.desktop,
          cls: 'ff-hero__video ff-hero__video--desktop',
          wantPlay: isActive && !isMobile,
        },
        {
          layer: slide.querySelector('[data-ff-mobile-layer]'),
          src: hard.mobile,
          cls: 'ff-hero__video ff-hero__video--mobile',
          wantPlay: isActive && isMobile,
        },
      ].forEach(function (item) {
        if (!item.layer || !item.src) return;
        var video = item.layer.querySelector('video');
        if (!video) {
          item.layer.querySelectorAll('img.ff-hero__image, .ff-hero__placeholder').forEach(function (el) {
            el.remove();
          });
          video = document.createElement('video');
          video.className = item.cls;
          video.setAttribute('data-ff-autoplay-v', 'mp4-hardcoded-1');
          item.layer.appendChild(video);
        }
        video.setAttribute('src', item.src);
        video.querySelectorAll('source, img').forEach(function (s) {
          s.remove();
        });
        prepHeroVideo(video);
        if (item.wantPlay) {
          video.autoplay = true;
          video.setAttribute('autoplay', '');
          video.setAttribute('preload', 'auto');
        } else {
          video.autoplay = false;
          video.removeAttribute('autoplay');
          video.setAttribute('preload', 'none');
          try {
            video.pause();
          } catch (ePause) {}
        }
      });
    });
  }

  /* iOS blocks autoplay when several muted videos call play() — only one may play. */
  function healHeroVideos() {
    injectHardcodedHeroVideos();
    var isMobile = mqHeroMobile.matches;
    var heroes = document.querySelectorAll('[data-ff-hero], [data-ff-hero-track]');
    if (!heroes.length) {
      // Still sanitize any stray hero videos; never mass-play.
      document.querySelectorAll('.ff-hero__video, .ff-values__feature-video').forEach(function (video) {
        prepHeroVideo(video);
      });
      return;
    }
    heroes.forEach(function (hero) {
      var slides = hero.querySelectorAll('[data-ff-hero-slide]');
      var active = null;
      slides.forEach(function (slide) {
        if (slide.classList.contains('is-active') && !slide.hidden) active = slide;
      });
      if (!active && slides[0]) active = slides[0];

      slides.forEach(function (slide) {
        slide.querySelectorAll('video').forEach(function (video) {
          prepHeroVideo(video);
          var layer =
            video.closest('[data-ff-desktop-layer]') || video.closest('[data-ff-mobile-layer]');
          var want =
            slide === active &&
            layerIsVisible(layer) &&
            ((isMobile && video.classList.contains('ff-hero__video--mobile')) ||
              (!isMobile && video.classList.contains('ff-hero__video--desktop')));
          if (!want) {
            try {
              video.pause();
            } catch (e1) {}
            video.autoplay = false;
            video.removeAttribute('autoplay');
            video.setAttribute('preload', 'none');
            return;
          }
          video.autoplay = true;
          video.setAttribute('autoplay', '');
          video.setAttribute('preload', 'auto');
          var p = video.play();
          if (p && typeof p.catch === 'function') {
            p.catch(function () {
              window.setTimeout(function () {
                prepHeroVideo(video);
                var p2 = video.play();
                if (p2 && typeof p2.catch === 'function') p2.catch(function () {});
              }, 250);
            });
          }
        });
      });
    });

    document.querySelectorAll('.ff-values__feature-video').forEach(function (video) {
      prepHeroVideo(video);
      video.autoplay = true;
      video.setAttribute('autoplay', '');
      var p = video.play();
      if (p && typeof p.catch === 'function') p.catch(function () {});
    });
  }

  ready(function () {
    var path = location.pathname || '';

    // Homepage: sticky IndexController cache often pins old hero markup.
    // Pull a never-cached alternate view so mobile can autoplay without tap.
    if (path === '/' || path === '' || path === '/index' || path === '/index.html') {
      var homeMain = document.getElementById('MainContent');
      var hasFreshHero = !!(
        homeMain &&
        homeMain.querySelector('[data-ff-fingerprint^="HERO-MOBILE-AUTOPLAY-20260730F"]')
      );
      if (!hasFreshHero) {
        swapMainUrl(
          '/?view=ffnow&ffhome=1',
          function (root) {
            return !!root.querySelector('[data-ff-fingerprint^="HERO-MOBILE-AUTOPLAY"]');
          },
          'ff-hero-lifestyle',
          ffThemeAsset('ff-hero-lifestyle.css', 'mplay1'),
          'ff-hero-lifestyle',
          'ff-home-mobile-autoplay'
        );
      } else {
        healHeroVideos();
        [100, 400, 1200].forEach(function (ms) {
          window.setTimeout(healHeroVideos, ms);
        });
      }
    }

    if (/\/pages\/about(?:-us)?\/?$/.test(path) || /\/pages\/about\/?$/.test(path)) {
      // Immediate visual fix for sticky-cached “Add a video” overlays
      var style = document.createElement('style');
      style.setAttribute('data-ff-about-hint-hide', '1');
      style.textContent =
        '.ff-about__story-video-hint{display:none!important}' +
        '.ff-about__story-video--poster .ff-about__story-video-hint{display:none!important}';
      document.head.appendChild(style);

      var aboutMain = document.getElementById('MainContent');
      var hasHero = !!(aboutMain && aboutMain.querySelector('.ff-about__hero, [data-ff-about], .ff-about'));
      var hasStaleHint = !!(aboutMain && aboutMain.querySelector('.ff-about__story-video-hint'));
      var hasStaleCopy = /Add a video in Theme settings/i.test(aboutMain ? aboutMain.textContent : '');
      if (!hasHero || hasStaleHint || hasStaleCopy) {
        swapMain(
          'about',
          function (root) {
            return !!(root.querySelector('.ff-about__hero, .ff-about') && !/Add a video in Theme settings/i.test(root.textContent || ''));
          },
          'ff-about-page',
          ffThemeAsset('ff-about-page.css','about2'),
          'ff-about',
          'ff-about-upgraded'
        );
      }
    }

    if (/\/pages\/beadlock-tire-package/.test(path)) {
      if (!document.querySelector('[data-ff-btp], .ff-btp, .section-ff-beadlock-packages')) {
        swapMain(
          'beadlock-tire-packages',
          function (root) {
            return !!root.querySelector('[data-ff-btp], .ff-btp');
          },
          'ff-beadlock-packages',
          ffThemeAsset('ff-beadlock-packages.css','btp1'),
          'ff-beadlock-packages',
          'ff-btp-upgraded'
        );
      }
    }
  });
})();

/**
 * Fortune Forged $100-off offer popup bootloader.
 * Injects markup if missing, then opens after delay.
 * Uses a fresh storage key so prior test dismissals don't block it.
 */
(function () {
  if (window.__ffOfferBootV3) return;
  window.__ffOfferBootV3 = true;

  var STORAGE_KEY = 'ff-offer-dismissed-v3';
  var DELAY_MS = 5000;
  var EXPIRE_DAYS = 14;
  var CSS_HREF = ffThemeAsset('ff-offer-popup.css','sbv1');

  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function hideForms() {
    [
      '#shopify-block-forms',
      '[id*="shopify-forms"]',
      '[id*="13768625480086291342"]',
      '[class*="shopify-forms"]',
      'iframe[src*="forms.shopify"]',
      'iframe[src*="shopify-forms"]',
      'div[data-forms-id]',
      'shopify-forms'
    ].forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
      });
    });
  }

  function wasDismissed() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      var data = JSON.parse(raw);
      if (!data || !data.at) return false;
      return Date.now() - Number(data.at) < EXPIRE_DAYS * 24 * 60 * 60 * 1000;
    } catch (e) {
      return false;
    }
  }

  function markDismissed() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now() }));
    } catch (e) {}
  }

  function ensureCss() {
    if (document.querySelector('link[data-ff-offer-css]')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS_HREF;
    link.setAttribute('data-ff-offer-css', '1');
    document.head.appendChild(link);
  }

  function ensureMarkup() {
    var existing = document.querySelector('[data-ff-offer]');
    if (existing) return existing;

    var wrap = document.createElement('div');
    wrap.innerHTML =
      '<div class="ff-offer" id="ff-offer-popup" data-ff-offer data-ff-offer-delay="' +
      DELAY_MS +
      '" data-ff-offer-expire="' +
      EXPIRE_DAYS +
      '" hidden aria-hidden="true">' +
      '<div class="ff-offer__backdrop" data-ff-offer-close tabindex="-1"></div>' +
      '<div class="ff-offer__dialog" role="dialog" aria-modal="true" aria-labelledby="ff-offer-title">' +
      '<button type="button" class="ff-offer__close" data-ff-offer-close aria-label="Close offer">' +
      '<span class="ff-offer__close-icon" aria-hidden="true">&times;</span></button>' +
      '<div class="ff-offer__media" aria-hidden="true">' +
      '<img class="ff-offer__fallback-img" src="/cdn/shop/files/BMW_F80_25MP_HighQuality.jpg?v=1785232100&amp;width=1200" alt="" loading="lazy" width="800" height="1000">' +
      '</div>' +
      '<div class="ff-offer__panel">' +
      '<div class="ff-offer__content" data-ff-offer-content>' +
      '<h2 class="ff-offer__title" id="ff-offer-title">Get $100 Off Your Entire Order</h2>' +
      '<p class="ff-offer__sub">Limited time offer for first-time customers. Premium mods, fast support and zero regrets. Built for real enthusiasts.</p>' +
      '<form method="post" action="/contact#contact_form" id="ff-offer-contact" accept-charset="UTF-8" class="ff-offer__form">' +
      '<input type="hidden" name="form_type" value="customer" />' +
      '<input type="hidden" name="utf8" value="✓" />' +
      '<input type="hidden" name="contact[tags]" value="newsletter, first-time-100-off">' +
      '<input class="ff-offer__input" type="text" name="contact[first_name]" placeholder="First name" autocomplete="given-name">' +
      '<input class="ff-offer__input" type="email" name="contact[email]" placeholder="Email" autocomplete="email" required>' +
      '<button type="submit" class="ff-offer__submit">Claim Offer</button>' +
      '</form>' +
      '<p class="ff-offer__disclaimer">By signing up, you agree to receive marketing emails. View our privacy policy and terms of service for more info.</p>' +
      '</div>' +
      '<div class="ff-offer__thanks" data-ff-offer-success hidden>' +
      '<h2 class="ff-offer__title">Thank you!</h2>' +
      '<p class="ff-offer__sub">You\'re in — check your email for your $100 off code.</p>' +
      '<p class="ff-offer__thanks-hint">Tap the X or outside the box to close.</p>' +
      '</div></div></div></div>';

    var node = wrap.firstElementChild;
    document.body.appendChild(node);
    return node;
  }

  function bind(root) {
    if (!root || root.getAttribute('data-ff-offer-ready') === '1') return;
    root.setAttribute('data-ff-offer-ready', '1');

    var form = root.querySelector('.ff-offer__form');
    var content = root.querySelector('[data-ff-offer-content]');
    var success = root.querySelector('[data-ff-offer-success]');
    var submitBtn = form ? form.querySelector('.ff-offer__submit') : null;
    var lastFocus = null;
    var delay = parseInt(root.getAttribute('data-ff-offer-delay') || String(DELAY_MS), 10);

    function openPopup() {
      if (wasDismissed()) return;
      lastFocus = document.activeElement;
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      document.documentElement.classList.add('ff-offer-open');
      var closeBtn = root.querySelector('.ff-offer__close');
      if (closeBtn) closeBtn.focus();
    }

    function closePopup() {
      root.hidden = true;
      root.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('ff-offer-open');
      markDismissed();
      if (lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
    }

    function showThanks() {
      if (content) content.classList.add('is-hidden');
      if (success) success.hidden = false;
      markDismissed();
      var closeBtn = root.querySelector('.ff-offer__close');
      if (closeBtn) closeBtn.focus();
    }

    root.querySelectorAll('[data-ff-offer-close]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        closePopup();
      });
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !root.hidden) closePopup();
    });

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Submitting...';
        }
        var action = form.getAttribute('action') || '/contact';
        fetch(action, {
          method: 'POST',
          body: new FormData(form),
          credentials: 'same-origin',
          headers: { Accept: 'text/html,application/xhtml+xml' }
        })
          .catch(function () {})
          .finally(function () {
            showThanks();
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Claim Offer';
            }
          });
      });
    }

    // Force-show with ?ff_offer=1
    var force = /(?:\?|&)ff_offer=1(?:&|$)/.test(location.search);
    if (force) {
      try {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem('ff-offer-popup-dismissed');
      } catch (e) {}
      openPopup();
      return;
    }

    if (!wasDismissed()) {
      window.setTimeout(openPopup, isNaN(delay) ? DELAY_MS : delay);
    }
  }

  hideForms();
  window.setInterval(hideForms, 1000);

  ready(function () {
    ensureCss();
    // Clear legacy dismiss key from earlier testing
    try {
      localStorage.removeItem('ff-offer-popup-dismissed');
    } catch (e) {}

    var roots = document.querySelectorAll('[data-ff-offer]');
    var root = roots.length ? roots[0] : ensureMarkup();
    for (var i = 1; i < roots.length; i++) {
      if (roots[i].parentNode) roots[i].parentNode.removeChild(roots[i]);
    }
    bind(root);
  });
})();
