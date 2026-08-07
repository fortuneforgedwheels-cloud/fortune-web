/**
 * Chrome face/ring finish surcharge ($250 each).
 * 1) Patches BCPO option prices for display consistency.
 * 2) Adds a real Shopify line item at ATC so checkout charges $250 per Chrome selection.
 */
(function () {
  var CHROME_PRICE = '250';
  var ADDON_HANDLE = 'chrome-finish-surcharge';
  var pendingAddonQty = 0;
  var addingAddon = false;

  function normalizeTitle(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function isChromeValue(value) {
    return String(value || '')
      .replace(/\s*\(\+\$?\d+.*?\)\s*$/i, '')
      .trim()
      .toLowerCase() === 'chrome';
  }

  function patchVirtualOptions(data) {
    if (!data || !Array.isArray(data.virtual_options)) return false;
    var changed = false;
    data.virtual_options.forEach(function (vo) {
      var title = normalizeTitle(vo && vo.title);
      if (title !== 'FACE COLOR' && title !== 'RING COLOR') return;
      (vo.values || []).forEach(function (value) {
        if (!value || typeof value !== 'object') return;
        if (String(value.key || '').toLowerCase() !== 'chrome') return;
        if (String(value.price) === CHROME_PRICE) return;
        value.price = CHROME_PRICE;
        changed = true;
      });
    });
    return changed;
  }

  function patchAll() {
    patchVirtualOptions(window.bcpo_data);
    if (window.bcpo && window.bcpo.data) patchVirtualOptions(window.bcpo.data);
  }

  function installSetter() {
    if (window.__ffChromeSurchargeSetter) return;
    var current = window.bcpo_data;
    try {
      Object.defineProperty(window, 'bcpo_data', {
        configurable: true,
        enumerable: true,
        get: function () {
          return current;
        },
        set: function (value) {
          patchVirtualOptions(value);
          current = value;
        },
      });
      window.__ffChromeSurchargeSetter = true;
      if (current) patchVirtualOptions(current);
    } catch (e) {
      patchAll();
    }
  }

  function config() {
    return window.FF_CHROME_SURCHARGE || {};
  }

  function addonVariantId() {
    var id = config().variantId;
    return id ? String(id) : '';
  }

  function readColorValue(title) {
    var wanted = normalizeTitle(title);
    var root = document.querySelector('[data-ff-826m-path]');
    if (root) {
      var certified = root.querySelector(
        '[data-ff-826m-color-select="' + title + '"], [data-ff-826m-color-select="' + wanted + '"]'
      );
      var mode = root.querySelector('input[type="radio"][name^="ff_826m_path_"]:checked');
      var isCertified = mode && mode.value === 'certified';
      if (isCertified && certified && certified.value) return certified.value;
    }

    var labels = document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label');
    for (var i = 0; i < labels.length; i++) {
      var label = normalizeTitle(labels[i].textContent).split(':')[0].trim();
      if (label !== wanted) continue;
      var wrap =
        labels[i].closest('.selector-wrapper') ||
        labels[i].closest('[class*="bcpo"]') ||
        labels[i].parentElement;
      if (!wrap) continue;
      var field = wrap.querySelector('select, .bcpo-dd, .bcpo-select');
      if (!field) continue;
      if (field.tagName === 'SELECT') return field.value || field.options[field.selectedIndex] && field.options[field.selectedIndex].text;
      return field.value || field.textContent;
    }

    var props = document.querySelectorAll('[name="properties[' + title + ']"], [name="properties[' + wanted + ']"]');
    for (var j = 0; j < props.length; j++) {
      if (props[j].value) return props[j].value;
    }
    return '';
  }

  function chromeSelectionCount() {
    var count = 0;
    if (isChromeValue(readColorValue('FACE COLOR'))) count += 1;
    if (isChromeValue(readColorValue('RING COLOR'))) count += 1;
    return count;
  }

  function cartAddUrl(url) {
    var s = String(url || '');
    return s.indexOf('/cart/add') !== -1;
  }

  function addChromeAddonLines(qty) {
    var variantId = addonVariantId();
    if (!variantId || !qty || qty < 1) return Promise.resolve(null);
    addingAddon = true;
    var body = {
      items: [
        {
          id: Number(variantId),
          quantity: qty,
          properties: {
            '_Surcharge': 'Chrome finish',
            'Chrome selections': String(qty),
            'Note': qty > 1 ? 'Face + Ring Chrome (+$250 each)' : 'Chrome finish (+$250)',
          },
        },
      ],
    };
    return fetch((window.routes && window.routes.cart_add_url) || '/cart/add.js', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().catch(function () {
          return null;
        });
      })
      .catch(function () {
        return null;
      })
      .finally(function () {
        addingAddon = false;
      });
  }

  function rememberChromeCount() {
    pendingAddonQty = chromeSelectionCount();
    return pendingAddonQty;
  }

  function flushPendingAddon() {
    var qty = pendingAddonQty;
    pendingAddonQty = 0;
    if (!qty) return Promise.resolve(null);
    return addChromeAddonLines(qty);
  }

  function installFetchHook() {
    if (window.__ffChromeSurchargeFetch) return;
    if (typeof window.fetch !== 'function') return;
    window.__ffChromeSurchargeFetch = true;
    var originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      var isCartAdd = cartAddUrl(url) && !addingAddon;
      if (isCartAdd) rememberChromeCount();
      return originalFetch(input, init).then(function (response) {
        if (!isCartAdd || !response || !response.ok) return response;
        var qty = pendingAddonQty;
        if (!qty) return response;
        // Clone-safe: flush after successful wheel ATC, then return original response.
        return flushPendingAddon().then(function () {
          try {
            document.dispatchEvent(new CustomEvent('cart:updated'));
            document.dispatchEvent(new CustomEvent('ff:chrome-surcharge-added', { detail: { quantity: qty } }));
          } catch (e) {}
          return response;
        });
      });
    };
  }

  function installFormHook() {
    if (window.__ffChromeSurchargeForm) return;
    window.__ffChromeSurchargeForm = true;
    document.addEventListener(
      'submit',
      function (event) {
        var form = event.target;
        if (!form || !form.getAttribute) return;
        var action = form.getAttribute('action') || '';
        var type = form.getAttribute('data-type') || '';
        if (action.indexOf('/cart/add') === -1 && type !== 'add-to-cart-form') return;
        rememberChromeCount();
      },
      true
    );
  }

  function installJqueryAjaxHook() {
    if (window.__ffChromeSurchargeAjax) return;
    function tryHook() {
      if (!window.jQuery || !window.jQuery.ajax || window.__ffChromeSurchargeAjax) return;
      window.__ffChromeSurchargeAjax = true;
      var originalAjax = window.jQuery.ajax;
      window.jQuery.ajax = function (url, options) {
        var settings = options;
        var requestUrl = url;
        if (typeof url === 'object') {
          settings = url;
          requestUrl = settings.url;
        } else {
          settings = options || {};
        }
        var isCartAdd = cartAddUrl(requestUrl) && !addingAddon;
        if (isCartAdd) rememberChromeCount();
        var jqXHR = originalAjax.apply(this, arguments);
        if (isCartAdd && jqXHR && typeof jqXHR.done === 'function') {
          jqXHR.done(function () {
            flushPendingAddon();
          });
        }
        return jqXHR;
      };
    }
    tryHook();
    var ticks = 0;
    var timer = setInterval(function () {
      tryHook();
      ticks += 1;
      if (window.__ffChromeSurchargeAjax || ticks > 40) clearInterval(timer);
    }, 250);
  }

  installSetter();
  patchAll();
  installFetchHook();
  installFormHook();
  installJqueryAjaxHook();

  var ticks = 0;
  var timer = setInterval(function () {
    patchAll();
    ticks += 1;
    if (ticks > 60) clearInterval(timer);
  }, 250);

  document.addEventListener('DOMContentLoaded', patchAll);
  window.addEventListener('load', patchAll);
})();
