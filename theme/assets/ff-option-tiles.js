/**
 * Convert product option <select>s into Fortune Certified-style tile cards,
 * wrapped in click-to-expand accordions. Keeps native selects synced for apps.
 */
(function () {
  'use strict';

  if (window.FF_OPTION_TILES_BOOTED) return;
  window.FF_OPTION_TILES_BOOTED = true;

  var SKIP_NAME = /^(id|quantity|country|province|address|utf8|form_type|checkout)$/i;
  var SKIP_ID = /^(Variants-|Address|Country|Province)/i;
  var PLACEHOLDER = /^(choose one|select one|select|please select|--|\s*)$/i;
  var HELPER = /^\^\^/;
  var SELECT_ONE = 'Select one';
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
    if (select.closest('[data-ff-pdp-config]')) return true;
    if (select.getAttribute('data-ff-sbv-year') != null) return true;
    if (select.getAttribute('data-ff-sbv-make') != null) return true;
    if (select.getAttribute('data-ff-sbv-model') != null) return true;
    if (select.getAttribute('data-ff-sbv-chassis') != null) return true;
    var name = select.getAttribute('name') || '';
    var id = select.id || '';
    if (name === 'vopo-id') return true;
    if (SKIP_NAME.test(name)) return true;
    if (SKIP_ID.test(id)) return true;
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

  function findLabelText(select) {
    var wrap =
      select.closest('.selector-wrapper') ||
      select.closest('.ff-826m-path__field') ||
      select.closest('.product-form__input') ||
      select.closest('[class*="bcpo"]') ||
      select.parentElement;
    if (!wrap) return 'Option';

    var labeled = wrap.querySelector(
      '.bcpo-title, .bcpo-front-dd-label, .bcpo-label, legend.form__label, label.form__label, .ff-826m-path__field > span'
    );
    if (labeled) {
      var raw = String(labeled.textContent || '')
        .replace(/\s+/g, ' ')
        .trim()
        .split(':')[0]
        .trim();
      if (raw) return raw;
    }

    var attr = select.getAttribute('data-ff-826m-color-select');
    if (attr) return attr;

    var name = select.getAttribute('name') || '';
    var m = name.match(/properties\[([^\]]+)\]/i);
    if (m) return m[1];
    if (/center\s*cap/i.test(name)) return 'Center Cap';
    return 'Option';
  }

  function selectedLabel(select) {
    var opt = select.options[select.selectedIndex];
    if (!opt) return '';
    var text = String(opt.textContent || '').replace(/\s+/g, ' ').trim();
    if (!opt.value && PLACEHOLDER.test(text)) return '';
    if (HELPER.test(text)) return '';
    return text;
  }

  function closeOthers(except) {
    document.querySelectorAll('.ff-option-acc.is-open').forEach(function (acc) {
      if (acc === except) return;
      acc.classList.remove('is-open');
      var btn = acc.querySelector('.ff-option-acc__trigger');
      var panel = acc.querySelector('.ff-option-acc__panel');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    });
  }

  function setOpen(acc, open) {
    var btn = acc.querySelector('.ff-option-acc__trigger');
    var panel = acc.querySelector('.ff-option-acc__panel');
    if (open) {
      closeOthers(acc);
      acc.classList.add('is-open');
      if (btn) btn.setAttribute('aria-expanded', 'true');
      if (panel) panel.hidden = false;
    } else {
      acc.classList.remove('is-open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
      if (panel) panel.hidden = true;
    }
  }

  function updateTriggerValue(acc, text) {
    var valueEl = acc.querySelector('.ff-option-acc__value');
    if (!valueEl) return;
    if (text) {
      valueEl.textContent = text;
      valueEl.hidden = false;
      acc.classList.add('has-value');
      acc.dataset.ffPicked = '1';
    } else {
      valueEl.textContent = SELECT_ONE;
      valueEl.hidden = false;
      acc.classList.remove('has-value');
      delete acc.dataset.ffPicked;
    }
  }

  function removeTiles(select) {
    var next = select.nextElementSibling;
    if (next && next.classList && next.classList.contains('ff-option-acc')) {
      next.remove();
    } else if (next && next.classList && next.classList.contains('ff-option-tiles')) {
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

  function buildTileGrid(select, options, groupName) {
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
      /* Start unchecked so the accordion shows "Select one" until the shopper picks. */
      input.checked = false;

      var card = document.createElement('span');
      card.className = 'ff-option-tiles__card';
      card.innerHTML = '<span class="ff-option-tiles__title">' + esc(text) + '</span>';

      label.appendChild(input);
      label.appendChild(card);
      root.appendChild(label);

      input.addEventListener('change', function () {
        if (!input.checked) return;
        select.value = opt.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        try {
          var evt = document.createEvent('HTMLEvents');
          evt.initEvent('change', true, false);
          select.dispatchEvent(evt);
        } catch (e) {}

        var acc = root.closest('.ff-option-acc');
        if (acc) {
          updateTriggerValue(acc, text);
          setOpen(acc, false);
        }
      });
    });

    return root;
  }

  function enhanceSelect(select) {
    if (shouldSkip(select)) return;
    var options = usableOptions(select);
    if (!options.length) return;

    removeTiles(select);

    var groupName = 'ff-tiles-' + ++uid;
    var labelText = findLabelText(select);
    var tiles = buildTileGrid(select, options, groupName);

    var acc = document.createElement('div');
    acc.className = 'ff-option-acc';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ff-option-acc__trigger';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<span class="ff-option-acc__label">' +
      esc(labelText) +
      '</span>' +
      '<span class="ff-option-acc__value">' +
      esc(SELECT_ONE) +
      '</span>' +
      '<span class="ff-option-acc__chevron" aria-hidden="true"></span>';

    var panel = document.createElement('div');
    panel.className = 'ff-option-acc__panel';
    panel.hidden = true;
    panel.appendChild(tiles);

    btn.addEventListener('click', function () {
      var open = !acc.classList.contains('is-open');
      setOpen(acc, open);
    });

    acc.appendChild(btn);
    acc.appendChild(panel);

    select.classList.add('ff-option-tiles__native');
    select.dataset.ffTiles = '1';
    select.insertAdjacentElement('afterend', acc);

    if (!select._ffTilesBound) {
      select._ffTilesBound = true;
      select.addEventListener('change', function () {
        var host = select.nextElementSibling;
        if (!host || !host.classList.contains('ff-option-acc')) return;
        /* Only mirror native changes after the shopper has picked via tiles. */
        if (host.dataset.ffPicked !== '1') return;
        var grid = host.querySelector('.ff-option-tiles');
        syncFromSelect(select, grid);
        updateTriggerValue(host, selectedLabel(select));
      });
    }
  }

  function enhanceNativeFieldset(fieldset) {
    if (!fieldset || fieldset.dataset.ffAcc === '1') return;
    if (fieldset.classList.contains('product-form__swatch')) return;
    if (!fieldset.classList.contains('product-form__input')) return;

    var legend = fieldset.querySelector('legend.form__label, .form__label');
    var radios = fieldset.querySelectorAll('.product-form__radio');
    var labels = fieldset.querySelectorAll('.product-form__label');
    if (!radios.length || !labels.length) return;

    fieldset.dataset.ffAcc = '1';
    fieldset.classList.add('ff-option-acc', 'ff-option-acc--native');

    var title = 'Option';
    if (legend) {
      var clone = legend.cloneNode(true);
      var selectedSpan = clone.querySelector('[data-header-option]');
      if (selectedSpan) selectedSpan.remove();
      title = String(clone.textContent || '')
        .replace(/:/g, '')
        .replace(/\s+/g, ' ')
        .trim() || 'Option';
    }

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ff-option-acc__trigger';
    btn.setAttribute('aria-expanded', 'false');
    btn.innerHTML =
      '<span class="ff-option-acc__label">' +
      esc(title) +
      '</span>' +
      '<span class="ff-option-acc__value">' +
      esc(SELECT_ONE) +
      '</span>' +
      '<span class="ff-option-acc__chevron" aria-hidden="true"></span>';

    var panel = document.createElement('div');
    panel.className = 'ff-option-acc__panel ff-option-acc__panel--native';
    panel.hidden = true;

    // Move option labels into panel (keep radios + labels together)
    Array.prototype.forEach.call(fieldset.querySelectorAll('.product-form__radio, .product-form__label'), function (el) {
      panel.appendChild(el);
    });

    /* Clear auto-checked radios so each option starts as "Select one". */
    Array.prototype.forEach.call(radios, function (radio) {
      radio.checked = false;
    });

    if (legend) legend.style.display = 'none';

    btn.addEventListener('click', function () {
      setOpen(fieldset, !fieldset.classList.contains('is-open'));
    });

    fieldset.insertBefore(btn, fieldset.firstChild);
    fieldset.appendChild(panel);

    fieldset.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || t.type !== 'radio') return;
      var lab = fieldset.querySelector('label[for="' + t.id + '"] .text') || fieldset.querySelector('label[for="' + t.id + '"]');
      var text = lab ? String(lab.textContent || '').trim() : t.value;
      updateTriggerValue(fieldset, text);
      setOpen(fieldset, false);
    });
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
      ].join(',')
    );
    nodes.forEach(function (select) {
      if (select.tagName !== 'SELECT') return;
      var sig = Array.prototype.map
        .call(select.options, function (o) {
          return o.value + ':' + o.text;
        })
        .join('|');
      if (select.dataset.ffTiles === '1' && select.dataset.ffTilesSig === sig) return;
      select.dataset.ffTilesSig = sig;
      enhanceSelect(select);
    });

    scope.querySelectorAll('variant-radios fieldset.product-form__input, fieldset.product-form__input').forEach(enhanceNativeFieldset);
  }

  function boot() {
    scan(document);
    var obs = new MutationObserver(function () {
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
