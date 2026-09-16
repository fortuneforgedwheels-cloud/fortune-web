(function () {
  function normalize(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase()
      .replace(/:$/, '');
  }

  function isFitmentLabel(text) {
    var t = normalize(text);
    return t === 'fitment' || t.indexOf('fitment') === 0;
  }

  function markHidden(el) {
    if (!el) return;
    el.classList.add('ff-fitment-native-hidden');
    el.setAttribute('data-ff-fitment-native-hidden', 'true');
    el.style.setProperty('display', 'none', 'important');
    el.setAttribute('aria-hidden', 'true');
  }

  function hideFitmentRows(root) {
    var scope =
      document.getElementById('product-option-' + root.dataset.sectionId + '-' + root.dataset.productId) ||
      document.querySelector('.productView-variants') ||
      document;

    // Native Halo option rows
    scope.querySelectorAll('.product-form__input, fieldset.product-form__input, .product-form__input--dropdown').forEach(function (row) {
      var legend = row.querySelector('legend, .form__label, label.form__label');
      var hasFitmentValue = row.querySelector(
        'input[value="20/20"], input[value="19/20"], input[name*="fitment" i], select option[value="20/20"], select option[value="19/20"]'
      );
      if ((legend && isFitmentLabel(legend.textContent)) || hasFitmentValue) {
        markHidden(row);
      }
    });

    // BCPO / app-injected option rows
    document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label, .bcpo-option-title').forEach(function (titleEl) {
      if (!isFitmentLabel(titleEl.textContent)) return;
      var wrapper =
        titleEl.closest('.selector-wrapper') ||
        titleEl.closest('[class*="bcpo-simple"]') ||
        titleEl.closest('[class*="bcpo"]') ||
        titleEl.parentElement;
      markHidden(wrapper);
    });

    // Any remaining selects whose first meaningful option looks like fitment sizes
    document.querySelectorAll('select').forEach(function (select) {
      var values = Array.prototype.map.call(select.options, function (o) {
        return o.value;
      });
      var hasBoth = values.indexOf('20/20') !== -1 && values.indexOf('19/20') !== -1;
      if (!hasBoth) return;
      // Don't hide the main variant id select
      if (select.name === 'id' || select.id.indexOf('Variants-') === 0) return;
      var wrap = select.closest('.product-form__input, .selector-wrapper, [class*="bcpo"], .form__select') || select.parentElement;
      markHidden(wrap);
    });
  }

  function findNativeFitmentInput(root, value) {
    var scope =
      document.getElementById('product-option-' + root.dataset.sectionId + '-' + root.dataset.productId) ||
      document.querySelector('.productView-variants');
    if (!scope) return null;

    var radios = scope.querySelectorAll('.product-form__radio, input[type="radio"]');
    for (var i = 0; i < radios.length; i++) {
      if (radios[i].value === value) return radios[i];
    }

    var selects = scope.querySelectorAll('select');
    for (var s = 0; s < selects.length; s++) {
      var select = selects[s];
      if (select.name === 'id') continue;
      for (var o = 0; o < select.options.length; o++) {
        if (select.options[o].value === value) return select;
      }
    }
    return null;
  }

  function syncBadge(root, value) {
    var badge = root.querySelector('[data-ff-fitment-badge-value]');
    if (badge) badge.textContent = value;
  }

  function applyFitment(root, value) {
    syncBadge(root, value);
    hideFitmentRows(root);
    var native = findNativeFitmentInput(root, value);
    if (!native) return;

    if (native.tagName === 'SELECT') {
      native.value = value;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      native.dispatchEvent(new Event('input', { bubbles: true }));
      return;
    }

    if (!native.checked) {
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      try {
        native.click();
      } catch (e) {}
    }
  }

  function watch(root) {
    if (root._ffFitmentObserver) return;
    var obs = new MutationObserver(function () {
      hideFitmentRows(root);
    });
    obs.observe(document.body, { childList: true, subtree: true });
    root._ffFitmentObserver = obs;
  }

  function init(root) {
    if (!root) return;
    hideFitmentRows(root);
    watch(root);

    if (root.dataset.ffFitmentReady === '1') return;
    root.dataset.ffFitmentReady = '1';

    var checked = root.querySelector('input[data-ff-fitment-value]:checked');
    if (checked) applyFitment(root, checked.value);

    root.querySelectorAll('input[data-ff-fitment-value]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (input.checked) applyFitment(root, input.value);
      });
    });
  }

  function boot() {
    document.querySelectorAll('[data-ff-featured-fitment]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  window.addEventListener('load', boot);
  setTimeout(boot, 500);
  setTimeout(boot, 1500);
  setTimeout(boot, 3000);
})();
