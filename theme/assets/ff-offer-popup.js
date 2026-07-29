(function () {
  function ready(fn) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', fn);
    } else {
      fn();
    }
  }

  function hideShopifyFormsCorner() {
    var selectors = [
      '#shopify-block-forms',
      '[id*="shopify-forms"]',
      '[id*="13768625480086291342"]',
      '[class*="shopify-forms"]',
      'iframe[src*="forms.shopify"]',
      'iframe[src*="shopify-forms"]',
      'div[data-forms-id]',
      'shopify-forms'
    ];
    selectors.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('visibility', 'hidden', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.setAttribute('aria-hidden', 'true');
      });
    });
  }
  hideShopifyFormsCorner();
  window.setInterval(hideShopifyFormsCorner, 1000);

  ready(function () {
    var roots = document.querySelectorAll('[data-ff-offer]');
    if (!roots.length) return;

    for (var i = 1; i < roots.length; i++) {
      if (roots[i].parentNode) roots[i].parentNode.removeChild(roots[i]);
    }

    var root = roots[0];
    if (root.getAttribute('data-ff-offer-ready') === '1') return;
    root.setAttribute('data-ff-offer-ready', '1');

    var storageKey = 'ff-offer-popup-dismissed';
    var delay = parseInt(root.getAttribute('data-ff-offer-delay') || '5000', 10);
    var expireDays = parseInt(root.getAttribute('data-ff-offer-expire') || '14', 10);
    var form = root.querySelector('.ff-offer__form');
    var content = root.querySelector('[data-ff-offer-content]');
    var success = root.querySelector('[data-ff-offer-success]');
    var submitBtn = form ? form.querySelector('.ff-offer__submit') : null;
    var timer = null;
    var lastFocus = null;

    function wasDismissed() {
      try {
        var raw = localStorage.getItem(storageKey);
        if (!raw) return false;
        var data = JSON.parse(raw);
        if (!data || !data.at) return false;
        var ageMs = Date.now() - Number(data.at);
        return ageMs < expireDays * 24 * 60 * 60 * 1000;
      } catch (e) {
        return false;
      }
    }

    function markDismissed() {
      try {
        localStorage.setItem(storageKey, JSON.stringify({ at: Date.now() }));
      } catch (e) {}
    }

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
      if (lastFocus && typeof lastFocus.focus === 'function') {
        lastFocus.focus();
      }
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
      if (e.key === 'Escape' && !root.hidden) {
        closePopup();
      }
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
        var formData = new FormData(form);

        fetch(action, {
          method: 'POST',
          body: formData,
          credentials: 'same-origin',
          headers: {
            Accept: 'text/html,application/xhtml+xml'
          }
        })
          .catch(function () {
            /* Still show thanks if network is flaky; contact capture may have succeeded. */
          })
          .finally(function () {
            showThanks();
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = 'Claim Offer';
            }
          });
      });
    }

    hideShopifyFormsCorner();

    if (!wasDismissed()) {
      timer = window.setTimeout(openPopup, isNaN(delay) ? 5000 : delay);
    }

    window.addEventListener('beforeunload', function () {
      if (timer) window.clearTimeout(timer);
    });
  });
})();
