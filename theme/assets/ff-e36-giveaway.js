/**
 * E36 M3 giveaway landing — terms gate + acceptance logging.
 * Logs to cart attributes (order metafields) and line item properties.
 */
(function () {
  'use strict';

  var ATTR_ACCEPTED = 'Sweepstakes Terms Accepted';
  var ATTR_AT = 'Sweepstakes Terms Accepted At';
  var ATTR_VERSION = 'Sweepstakes Terms Version';
  var ATTR_PAGE = 'Sweepstakes Entry Page';

  function qs(root, sel) {
    return root.querySelector(sel);
  }

  function qsa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function isoNow() {
    try {
      return new Date().toISOString();
    } catch (e) {
      return String(Date.now());
    }
  }

  function setCtaEnabled(root, enabled) {
    qsa(root, '[data-ff-e36-cta]').forEach(function (btn) {
      btn.disabled = !enabled;
      btn.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      btn.classList.toggle('is-disabled', !enabled);
    });
    var form = qs(root, '[data-ff-e36-form]');
    if (form) {
      form.setAttribute('data-terms-ok', enabled ? 'true' : 'false');
    }
  }

  function syncHiddenFields(root, checked) {
    var at = qs(root, '[data-ff-e36-accepted-at]');
    var flag = qs(root, '[data-ff-e36-accepted-flag]');
    var now = isoNow();
    if (at) at.value = checked ? now : '';
    if (flag) flag.value = checked ? 'Yes' : '';
  }

  function updateCartAttributes(root, checked) {
    var versionEl = qs(root, '[data-ff-e36-terms-version]');
    var version = versionEl ? versionEl.value : '1';
    var pagePath = window.location.pathname + window.location.search;
    var attributes = {};
    attributes[ATTR_ACCEPTED] = checked ? 'Yes' : '';
    attributes[ATTR_AT] = checked ? isoNow() : '';
    attributes[ATTR_VERSION] = checked ? version : '';
    attributes[ATTR_PAGE] = checked ? pagePath : '';

    return fetch('/cart/update.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ attributes: attributes })
    }).catch(function () {
      /* non-blocking — line item props still capture on submit */
    });
  }

  function scrollToEntry(root) {
    var target = qs(root, '[data-ff-e36-entry]') || document.getElementById('ff-e36-entry');
    if (!target) return;
    var reduce = false;
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {}
    target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    var cb = qs(root, '[data-ff-e36-terms]');
    if (cb && !cb.checked) {
      setTimeout(function () {
        try {
          cb.focus({ preventScroll: true });
        } catch (err) {
          cb.focus();
        }
      }, 400);
    }
  }

  function nudgeHeroVideo(root) {
    if (window.__ffInAppBrowser || document.documentElement.classList.contains('ff-inapp')) return;
    var video = qs(root, '.ff-e36__video-wrap video, video.ff-e36__video');
    if (!video) return;
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', 'true');
      video.autoplay = true;
      video.setAttribute('autoplay', '');
      if (video.paused) {
        var p = video.play();
        if (p && typeof p.catch === 'function') p.catch(function () {});
      }
    } catch (e) {}
  }

  function formatMoney(cents, format) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      try {
        return Shopify.formatMoney(cents, format || window.theme || undefined);
      } catch (eFmt) {}
    }
    var value = (Number(cents) / 100).toFixed(2);
    var fmt = format || '${{amount}}';
    if (fmt.indexOf('{{amount_no_decimals}}') !== -1) {
      return fmt.replace(/\{\{\s*amount_no_decimals\s*\}\}/g, String(Math.round(Number(cents) / 100)));
    }
    return fmt.replace(/\{\{\s*amount\s*\}\}/g, value).replace(/\{\{\s*amount_with_comma_separator\s*\}\}/g, value);
  }

  function initQty(root) {
    var wrap = qs(root, '[data-ff-e36-qty]');
    if (!wrap) return;
    var input = qs(wrap, '[data-ff-e36-qty-input]');
    var minus = qs(wrap, '[data-ff-e36-qty-minus]');
    var plus = qs(wrap, '[data-ff-e36-qty-plus]');
    var countEl = qs(wrap, '[data-ff-e36-qty-count]');
    var totalEl = qs(wrap, '[data-ff-e36-qty-total]');
    var unit = parseInt(wrap.getAttribute('data-unit-cents') || '0', 10) || 0;
    var moneyFormat = wrap.getAttribute('data-money-format') || '${{amount}}';
    var min = parseInt((input && input.min) || '1', 10) || 1;
    var max = parseInt((input && input.max) || '20', 10) || 20;

    function clamp(n) {
      n = parseInt(n, 10);
      if (isNaN(n)) n = min;
      if (n < min) n = min;
      if (n > max) n = max;
      return n;
    }

    function refresh() {
      if (!input) return;
      var qty = clamp(input.value);
      input.value = String(qty);
      if (minus) minus.disabled = qty <= min;
      if (plus) plus.disabled = qty >= max;
      if (countEl) {
        countEl.textContent = qty === 1 ? '1 entry' : qty + ' entries';
      }
      if (totalEl) {
        totalEl.textContent = formatMoney(unit * qty, moneyFormat);
      }
    }

    if (minus) {
      minus.addEventListener('click', function () {
        input.value = String(clamp(parseInt(input.value, 10) - 1));
        refresh();
      });
    }
    if (plus) {
      plus.addEventListener('click', function () {
        input.value = String(clamp(parseInt(input.value, 10) + 1));
        refresh();
      });
    }
    if (input) {
      input.addEventListener('change', refresh);
      input.addEventListener('input', refresh);
    }
    refresh();
  }

  function initRoot(root) {
    if (!root || root.getAttribute('data-ff-e36-ready') === '1') return;
    root.setAttribute('data-ff-e36-ready', '1');

    nudgeHeroVideo(root);
    [120, 400, 1000].forEach(function (ms) {
      window.setTimeout(function () {
        nudgeHeroVideo(root);
      }, ms);
    });

    initQty(root);

    var checkbox = qs(root, '[data-ff-e36-terms]');
    var form = qs(root, '[data-ff-e36-form]');
    var err = qs(root, '[data-ff-e36-terms-error]');

    function refresh() {
      var ok = !!(checkbox && checkbox.checked);
      setCtaEnabled(root, ok);
      syncHiddenFields(root, ok);
      if (err) {
        err.hidden = true;
        err.textContent = '';
      }
      if (checkbox) {
        checkbox.setAttribute('aria-invalid', ok ? 'false' : 'true');
      }
    }

    if (checkbox) {
      checkbox.addEventListener('change', function () {
        refresh();
        updateCartAttributes(root, checkbox.checked);
      });
      refresh();
    } else {
      setCtaEnabled(root, true);
    }

    qsa(root, '[data-ff-e36-scroll-entry]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.preventDefault();
        scrollToEntry(root);
      });
    });

    var termsPanel = qs(root, '[data-ff-e36-terms-panel]');
    var termsScroll = qs(root, '[data-ff-e36-terms-scroll]');
    var termsBody = qs(root, '[data-ff-e36-terms-body]');
    var loadMoreBtn = qs(root, '[data-ff-e36-load-more]');

    function syncTermsOverflow() {
      if (!termsPanel || !termsScroll || !termsBody) return;
      if (termsPanel.classList.contains('is-expanded')) return;
      /* If rules fit in the preview, hide Load more */
      var needsMore = termsBody.scrollHeight > termsScroll.clientHeight + 8;
      termsPanel.classList.toggle('is-short', !needsMore);
      if (loadMoreBtn) {
        loadMoreBtn.hidden = !needsMore;
      }
    }

    if (loadMoreBtn && termsPanel) {
      loadMoreBtn.addEventListener('click', function () {
        termsPanel.classList.add('is-expanded');
        termsPanel.classList.remove('is-short');
        loadMoreBtn.setAttribute('aria-expanded', 'true');
        loadMoreBtn.hidden = true;
        if (termsScroll) {
          try {
            termsScroll.focus({ preventScroll: true });
          } catch (errFocus) {
            termsScroll.focus();
          }
        }
      });
    }

    syncTermsOverflow();
    window.setTimeout(syncTermsOverflow, 120);
    if (typeof ResizeObserver !== 'undefined' && termsBody) {
      try {
        new ResizeObserver(syncTermsOverflow).observe(termsBody);
      } catch (errRo) {}
    }

    var storyPanel = qs(root, '[data-ff-e36-story-panel]');
    var storyClip = qs(root, '[data-ff-e36-story-clip]');
    var storyBody = qs(root, '[data-ff-e36-story-body]');
    var storyMoreBtn = qs(root, '[data-ff-e36-story-more-btn]');

    function syncStoryOverflow() {
      if (!storyPanel || !storyClip || !storyBody) return;
      if (storyPanel.classList.contains('is-expanded')) return;
      var needsMore = storyBody.scrollHeight > storyClip.clientHeight + 8;
      storyPanel.classList.toggle('is-short', !needsMore);
      if (storyMoreBtn) {
        storyMoreBtn.hidden = !needsMore;
      }
    }

    if (storyMoreBtn && storyPanel) {
      storyMoreBtn.addEventListener('click', function () {
        storyPanel.classList.add('is-expanded');
        storyPanel.classList.remove('is-short');
        storyMoreBtn.setAttribute('aria-expanded', 'true');
        storyMoreBtn.hidden = true;
      });
    }

    syncStoryOverflow();
    window.setTimeout(syncStoryOverflow, 120);
    if (typeof ResizeObserver !== 'undefined' && storyBody) {
      try {
        new ResizeObserver(syncStoryOverflow).observe(storyBody);
      } catch (errStoryRo) {}
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        if (checkbox && !checkbox.checked) {
          e.preventDefault();
          if (err) {
            err.hidden = false;
            err.textContent = err.getAttribute('data-message') || 'Please accept the Official Rules to continue.';
          }
          try {
            checkbox.focus({ preventScroll: true });
          } catch (err2) {
            checkbox.focus();
          }
          return false;
        }

        if (form.getAttribute('data-ff-e36-submitting') === '1') {
          return true;
        }

        e.preventDefault();
        syncHiddenFields(root, true);
        form.setAttribute('data-ff-e36-submitting', '1');
        setCtaEnabled(root, false);

        var proceed = function () {
          /* Native submit() bypasses the listener — avoids a disable/requestSubmit deadlock */
          HTMLFormElement.prototype.submit.call(form);
        };

        var timed = window.setTimeout(proceed, 1200);
        Promise.resolve(updateCartAttributes(root, true)).then(
          function () {
            window.clearTimeout(timed);
            proceed();
          },
          function () {
            window.clearTimeout(timed);
            proceed();
          }
        );
        return false;
      });
    }

    /* Sticky bar mirrors primary CTA enable state */
    var sticky = qs(root, '[data-ff-e36-sticky]');
    if (sticky && 'IntersectionObserver' in window) {
      var heroCta = qs(root, '[data-ff-e36-hero-cta]');
      if (heroCta) {
        var io = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (entry) {
              sticky.classList.toggle('is-visible', !entry.isIntersecting);
            });
          },
          { threshold: 0.15 }
        );
        io.observe(heroCta);
      }
    }
  }

  function boot() {
    qsa(document, '[data-ff-e36-giveaway]').forEach(initRoot);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (e) {
    var root = e.target && e.target.querySelector
      ? e.target.querySelector('[data-ff-e36-giveaway]')
      : null;
    if (root) {
      root.removeAttribute('data-ff-e36-ready');
      initRoot(root);
    } else if (e.target && e.target.hasAttribute && e.target.hasAttribute('data-ff-e36-giveaway')) {
      e.target.removeAttribute('data-ff-e36-ready');
      initRoot(e.target);
    }
  });
})();
