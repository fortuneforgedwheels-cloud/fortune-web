/**
 * Convert product option <select>s (BCPO, VO, theme, certified color) into
 * Fortune Certified-style tile cards. Keeps the native select in sync for apps.
 */
(function () {
  'use strict';

  if (window.FF_OPTION_TILES_BOOTED) return;
  window.FF_OPTION_TILES_BOOTED = true;

  var SKIP_NAME = /^(id|quantity|country|province|address|utf8|form_type|checkout)$/i;
  var SKIP_ID = /^(Variants-|Address|Country|Province)/i;
  var PLACEHOLDER = /^(choose one|select|please select|--|\s*)$/i;
  var HELPER = /^\^\^/;
  var uid = 0;

  function esc(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function shouldSkip(select) {
    if (!select || select.tagName !== 'SELECT') return true;
    if (select.closest('noscript')) return true;
    if (select.dataset.ffTilesSkip === '1') return true;
    if (select.getAttribute('data-ff-sbv-year') != null) return true;
    if (select.getAttribute('data-ff-sbv-make') != null) return true;
    if (select.getAttribute('data-ff-sbv-model') != null) return true;
    if (select.getAttribute('data-ff-sbv-chassis') != null) return true;
    var name = select.getAttribute('name') || '';
    var id = select.id || '';
    if (name === 'vopo-id') return true;
    if (SKIP_NAME.test(name)) return true;
    if (SKIP_ID.test(id)) return true;
    // Cart / localization only
    if (select.closest('.localization-form, .country-selector, .disclosure')) return true;
    return false;
  }

  function usableOptions(select) {
    return Array.prototype.filter.call(select.options, function (opt) {
      var text = String(opt.textContent || '').replace(/\s+/g, ' ').trim();
      if (HELPER.test(text)) return false;
      if (!opt.value && PLACEHOLDER.test(text)) return false;
      if (!text) return false;
      return true;
    });
  }

  function removeTiles(select) {
    var next = select.nextElementSibling;
    if (next && next.classList && next.classList.contains('ff-option-tiles')) {
      next.remove();
    }
    select.classList.remove('ff-option-tiles__native');
    delete select.dataset.ffTiles;
  }

  function syncFromSelect(select, root) {
    if (!root) return;
    var val = select.value;
    root.querySelectorAll('input[type="radio"]').forEach(function (radio) {
      radio.checked = radio.value === val;
    });
  }

  function enhanceSelect(select) {
    if (shouldSkip(select)) return;
    var options = usableOptions(select);
    if (!options.length) return;

    removeTiles(select);

    var groupName = 'ff-tiles-' + ++uid;
    var root = document.createElement('div');
    root.className = 'ff-option-tiles';
    root.setAttribute('role', 'radiogroup');
    root.dataset.count = String(options.length);
    if (options.length >= 8) root.dataset.dense = 'true';

    options.forEach(function (opt, index) {
      var text = String(opt.textContent || '').replace(/\s+/g, ' ').trim();
      var label = document.createElement('label');
      label.className = 'ff-option-tiles__choice';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.value = opt.value;
      input.disabled = !!opt.disabled;
      if (opt.selected || select.value === opt.value) input.checked = true;
      // If nothing selected yet and first real option exists, don't auto-check
      // unless the select already has this value.
      if (!select.value && index === 0 && !opt.selected) {
        // leave unchecked so user must pick (matches Choose one)
        input.checked = false;
      }

      var card = document.createElement('span');
      card.className = 'ff-option-tiles__card';
      card.innerHTML = '<span class="ff-option-tiles__title">' + esc(text) + '</span>';

      label.appendChild(input);
      label.appendChild(card);
      root.appendChild(label);

      input.addEventListener('change', function () {
        if (!input.checked) return;
        select.value = opt.value;
        // BCPO listens for change/input
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          var evt = document.createEvent('HTMLEvents');
          evt.initEvent('change', true, false);
          select.dispatchEvent(evt);
        } catch (e) {}
      });
    });

    // If select already has a value, ensure a tile is checked
    if (select.value) syncFromSelect(select, root);

    select.classList.add('ff-option-tiles__native');
    select.dataset.ffTiles = '1';
    select.insertAdjacentElement('afterend', root);

    if (!select._ffTilesBound) {
      select._ffTilesBound = true;
      select.addEventListener('change', function () {
        var tiles = select.nextElementSibling;
        if (tiles && tiles.classList.contains('ff-option-tiles')) syncFromSelect(select, tiles);
      });
    }
  }

  function scan(root) {
    var scope = root || document;
    var nodes = scope.querySelectorAll(
      [
        '.selector-wrapper select',
        'select.single-option-selector',
        'select.ff-826m-path__select',
        '[data-ff-826m-color-select]',
        '.product-form__input--dropdown select',
        'variant-selects select',
        '.ff-sbv__select',
        '[data-ff-sbv-finish-select]',
        '[data-ff-sbv-face-finish-select]',
        '[data-ff-sbv-barrel-finish-select]',
        '[data-ff-sbv-hardware-select]',
        '.productView select',
        'form[action*="/cart/add"] select',
        '.ff-build__input[name*="contact"]',
      ].join(',')
    );
    nodes.forEach(function (select) {
      if (select.tagName !== 'SELECT') return;
      // Rebuild when option list changed (certified color refresh)
      if (select.dataset.ffTiles === '1') {
        var sig = Array.prototype.map
          .call(select.options, function (o) {
            return o.value + ':' + o.text;
          })
          .join('|');
        if (select.dataset.ffTilesSig === sig) return;
        select.dataset.ffTilesSig = sig;
        enhanceSelect(select);
        return;
      }
      var sig2 = Array.prototype.map
        .call(select.options, function (o) {
          return o.value + ':' + o.text;
        })
        .join('|');
      select.dataset.ffTilesSig = sig2;
      enhanceSelect(select);
    });
  }

  function boot() {
    scan(document);
    var obs = new MutationObserver(function (mutations) {
      var needs = false;
      for (var i = 0; i < mutations.length; i++) {
        var m = mutations[i];
        if (m.type === 'childList' && (m.addedNodes.length || m.removedNodes.length)) {
          needs = true;
          break;
        }
        if (m.type === 'attributes' && m.target && m.target.tagName === 'SELECT') {
          needs = true;
          break;
        }
      }
      if (!needs) return;
      clearTimeout(boot._t);
      boot._t = setTimeout(function () {
        scan(document);
      }, 80);
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'disabled'],
    });

    // Certified path repopulates color <select> options
    document.addEventListener(
      'change',
      function (e) {
        var t = e.target;
        if (!t) return;
        if (t.matches && t.matches('input[name^="ff_826m_path_"]')) {
          setTimeout(function () {
            scan(document);
          }, 120);
        }
      },
      true
    );
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
