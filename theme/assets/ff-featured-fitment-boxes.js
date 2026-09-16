(function () {
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
    var native = findNativeFitmentInput(root, value);
    if (!native) return;

    if (native.tagName === 'SELECT') {
      native.value = value;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }

    if (!native.checked) {
      native.checked = true;
      native.dispatchEvent(new Event('change', { bubbles: true }));
      native.click();
    }
  }

  function init(root) {
    if (!root || root.dataset.ffFitmentReady === '1') return;
    root.dataset.ffFitmentReady = '1';

    var variants = document.getElementById(
      'product-option-' + root.dataset.sectionId + '-' + root.dataset.productId
    );
    if (variants) variants.setAttribute('data-ff-fitment-boxes', 'true');

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
})();
