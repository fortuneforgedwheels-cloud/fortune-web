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

  function initRoot(root) {
    if (!root || root.getAttribute('data-ff-e36-ready') === '1') return;
    root.setAttribute('data-ff-e36-ready', '1');

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
