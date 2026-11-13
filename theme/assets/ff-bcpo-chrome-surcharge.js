/**
 * Chrome finish surcharges.
 * - Beadlock FACE/RING COLOR "Chrome": $250 per selection (existing addon).
 * - Monoblock COLOR / FINISH chrome names (Triple Chrome, etc.): $220 per wheel
 *   via chrome-finish-surcharge-mono (set of 4 = $880).
 *
 * BCPO option prices are display-only; real money is the hidden addon line items.
 */
(function () {
  var BEADLOCK_PRICE = '250';
  var MONO_PRICE = '220';
  var BEADLOCK_HANDLE = 'chrome-finish-surcharge';
  var MONO_HANDLE = 'chrome-finish-surcharge-mono';
  var pending = { beadlock: 0, mono: 0 };
  var addingAddon = false;

  function normalizeTitle(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function isChromeValue(value) {
    var cleaned = String(value || '')
      .replace(/\s*\(\+\$?\d+.*?\)\s*$/i, '')
      .trim()
      .toLowerCase();
    // Match Chrome, Triple Chrome, Black Chrome, 24K Gold Chrome, etc.
    return /\bchrome\b/.test(cleaned);
  }

  function config() {
    return window.FF_CHROME_SURCHARGE || {};
  }

  function beadlockVariantId() {
    var id = config().variantId;
    return id ? String(id) : '';
  }

  function monoVariantId() {
    var id = config().monoVariantId;
    return id ? String(id) : '';
  }

  function patchVirtualOptions(data) {
    if (!data || !Array.isArray(data.virtual_options)) return false;
    var changed = false;
    data.virtual_options.forEach(function (vo) {
      var title = normalizeTitle(vo && vo.title);
      var isBeadlock = title === 'FACE COLOR' || title === 'RING COLOR';
      var isMono = title === 'COLOR' || title === 'FINISH';
      if (!isBeadlock && !isMono) return;
      (vo.values || []).forEach(function (value) {
        if (!value || typeof value !== 'object') return;
        if (!isChromeValue(value.key)) return;
        // Monoblock: BCPO price must stay 0 — Bold would otherwise add $220 once
        // on the wheel line while we also add $220×wheels via the mono addon.
        var next = isMono ? '0' : BEADLOCK_PRICE;
        if (String(value.price) === next) return;
        value.price = next;
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
      if (field.tagName === 'SELECT') {
        return field.value || (field.options[field.selectedIndex] && field.options[field.selectedIndex].text);
      }
      return field.value || field.textContent;
    }

    var props = document.querySelectorAll(
      '[name="properties[' + title + ']"], [name="properties[' + wanted + ']"]'
    );
    for (var j = 0; j < props.length; j++) {
      if (props[j].value) return props[j].value;
    }

    // Shop-by-vehicle finish selects
    if (wanted === 'FINISH' || wanted === 'COLOR') {
      var sbv = document.querySelector(
        '[data-ff-sbv-finish-select], [data-ff-finish], [data-ff-sbv-face-finish-select]'
      );
      if (sbv && sbv.value) return sbv.value;
    }
    return '';
  }

  function beadlockSelectionCount() {
    var count = 0;
    if (isChromeValue(readColorValue('FACE COLOR'))) count += 1;
    if (isChromeValue(readColorValue('RING COLOR'))) count += 1;
    return count;
  }

  function hasMonoChromeFinish() {
    return (
      isChromeValue(readColorValue('COLOR')) ||
      isChromeValue(readColorValue('FINISH')) ||
      isChromeValue(readColorValue('FACE FINISH')) ||
      isChromeValue(readColorValue('BARREL FINISH'))
    );
  }

  function readDomQuantity() {
    var input =
      document.querySelector('form[action*="/cart/add"] [name="quantity"]') ||
      document.querySelector('[data-type="add-to-cart-form"] [name="quantity"]') ||
      document.querySelector('quantity-input [name="quantity"]') ||
      document.querySelector('input.quantity__input[name="quantity"]');
    var n = input ? parseInt(input.value, 10) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 1;
  }

  function parseQuantityFromAddBody(init) {
    try {
      if (!init || init.body == null) return null;
      if (typeof FormData !== 'undefined' && init.body instanceof FormData) {
        var q = parseInt(String(init.body.get('quantity') || ''), 10);
        return Number.isFinite(q) && q > 0 ? q : null;
      }
      if (typeof init.body === 'string') {
        var trimmed = init.body.trim();
        if (trimmed.charAt(0) === '{') {
          var json = JSON.parse(trimmed);
          if (json && Array.isArray(json.items) && json.items.length) {
            var sum = 0;
            for (var i = 0; i < json.items.length; i++) {
              var itemQty = parseInt(String((json.items[i] && json.items[i].quantity) || ''), 10);
              if (Number.isFinite(itemQty) && itemQty > 0) sum += itemQty;
            }
            if (sum > 0) return sum;
          }
          var topQty = parseInt(String(json.quantity || ''), 10);
          if (Number.isFinite(topQty) && topQty > 0) return topQty;
        }
        var match = /(?:^|&)quantity=(\d+)/i.exec(trimmed);
        if (match) {
          var formQty = parseInt(match[1], 10);
          if (Number.isFinite(formQty) && formQty > 0) return formQty;
        }
      }
    } catch (e) {}
    return null;
  }

  /**
   * Monoblock chrome is $220/wheel. A normal set is 4 wheels ($880).
   * Multi-wheel ATCs (Shop by Vehicle qty 4, staggered 2+2, etc.) use the
   * real ATC quantity. Default PDP qty 1 is treated as a full set of 4.
   */
  function monoWheelCount(atcQty) {
    var q = Number(atcQty);
    if (!Number.isFinite(q) || q < 1) q = readDomQuantity();
    if (q === 1) return 4;
    return q;
  }

  function cartAddUrl(url) {
    return String(url || '').indexOf('/cart/add') !== -1;
  }

  function addAddonLines(variantId, qty, props) {
    if (!variantId || !qty || qty < 1) return Promise.resolve(null);
    addingAddon = true;
    var body = {
      items: [
        {
          id: Number(variantId),
          quantity: qty,
          properties: props,
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

  function addBeadlockAddon(qty) {
    return addAddonLines(beadlockVariantId(), qty, {
      _Surcharge: 'Chrome finish',
      'Chrome selections': String(qty),
      Note: qty > 1 ? 'Face + Ring Chrome (+$250 each)' : 'Chrome finish (+$250)',
    });
  }

  function addMonoAddon(qty) {
    return addAddonLines(monoVariantId(), qty, {
      _Surcharge: 'Monoblock chrome finish',
      Wheels: String(qty),
      Note:
        qty === 4
          ? 'Monoblock chrome (+$220/wheel × 4 = $880)'
          : 'Monoblock chrome (+$220/wheel × ' + qty + ')',
    });
  }

  function rememberChromeCharge(atcQty) {
    pending.beadlock = beadlockSelectionCount();
    pending.mono = hasMonoChromeFinish() ? monoWheelCount(atcQty) : 0;
    // Avoid double-counting: beadlock face/ring path should not also fire mono.
    if (pending.beadlock > 0) pending.mono = 0;
    return pending;
  }

  function flushPendingAddon() {
    var beadlockQty = pending.beadlock;
    var monoQty = pending.mono;
    pending = { beadlock: 0, mono: 0 };
    if (!beadlockQty && !monoQty) return Promise.resolve(null);
    return fetch('/cart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        return r.json().catch(function () {
          return null;
        });
      })
      .catch(function () {
        return null;
      })
      .then(function (cart) {
        var items = (cart && cart.items) || [];
        var existingBeadlock = existingAddonQty(items, BEADLOCK_HANDLE, beadlockVariantId());
        var existingMono = existingAddonQty(
          items,
          config().monoHandle || MONO_HANDLE,
          monoVariantId()
        );
        var missingBeadlock = Math.max(0, beadlockQty - existingBeadlock);
        var missingMono = Math.max(0, monoQty - existingMono);
        var chain = Promise.resolve(null);
        if (missingBeadlock) {
          chain = chain.then(function () {
            return addBeadlockAddon(missingBeadlock);
          });
        }
        if (missingMono) {
          chain = chain.then(function () {
            return addMonoAddon(missingMono);
          });
        }
        return chain;
      });
  }

  function installFetchHook() {
    if (window.__ffChromeSurchargeFetch) return;
    if (typeof window.fetch !== 'function') return;
    window.__ffChromeSurchargeFetch = true;
    var originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      var url = typeof input === 'string' ? input : input && input.url;
      var isCartAdd = cartAddUrl(url) && !addingAddon;
      if (isCartAdd) {
        var parsedQty = parseQuantityFromAddBody(init);
        rememberChromeCharge(parsedQty != null ? parsedQty : readDomQuantity());
      }
      return originalFetch(input, init).then(function (response) {
        if (!isCartAdd || !response || !response.ok) return response;
        if (!pending.beadlock && !pending.mono) return response;
        var snapshot = { beadlock: pending.beadlock, mono: pending.mono };
        return flushPendingAddon().then(function () {
          try {
            document.dispatchEvent(new CustomEvent('cart:updated'));
            document.dispatchEvent(
              new CustomEvent('ff:chrome-surcharge-added', { detail: snapshot })
            );
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
        var qtyInput = form.querySelector('[name="quantity"]');
        var q = qtyInput ? parseInt(qtyInput.value, 10) : NaN;
        rememberChromeCharge(Number.isFinite(q) && q > 0 ? q : readDomQuantity());
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
        var settings = typeof url === 'object' ? url : options || {};
        var requestUrl = typeof url === 'object' ? settings.url : url;
        var isCartAdd = cartAddUrl(requestUrl) && !addingAddon;
        if (isCartAdd) {
          var q = null;
          if (settings.data && typeof settings.data === 'object' && !(settings.data instanceof FormData)) {
            q = parseInt(String(settings.data.quantity || ''), 10);
          }
          rememberChromeCharge(Number.isFinite(q) && q > 0 ? q : readDomQuantity());
        }
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
  // Layout inline ffChromeChargeV2 owns ATC line-item charging when present.
  if (!window.__ffChromeChargeV2) {
    installFetchHook();
    installFormHook();
    installJqueryAjaxHook();
  }

  var ticks = 0;
  var timer = setInterval(function () {
    patchAll();
    ticks += 1;
    if (ticks > 60) clearInterval(timer);
  }, 250);

  function propertyMap(item) {
    var props = item && item.properties ? item.properties : {};
    var out = {};
    Object.keys(props).forEach(function (key) {
      out[String(key).replace(/\s+/g, ' ').trim().toUpperCase()] = props[key];
    });
    return out;
  }

  function isAddonItem(item) {
    var handle = String(item && item.handle || '');
    if (handle === BEADLOCK_HANDLE || handle === MONO_HANDLE) return true;
    if (config().handle && handle === String(config().handle)) return true;
    if (config().monoHandle && handle === String(config().monoHandle)) return true;
    var id = String(item && item.id || '');
    if (id && (id === beadlockVariantId() || id === monoVariantId())) return true;
    return false;
  }

  function expectedFromCart(items) {
    var beadlock = 0;
    var mono = 0;
    (items || []).forEach(function (item) {
      if (!item || isAddonItem(item)) return;
      var props = propertyMap(item);
      var face = isChromeValue(props['FACE COLOR']);
      var ring = isChromeValue(props['RING COLOR']);
      if (face) beadlock += 1;
      if (ring) beadlock += 1;
      if (face || ring) return;
      var monoChrome =
        isChromeValue(props.COLOR) ||
        isChromeValue(props.FINISH) ||
        isChromeValue(props['FACE FINISH']) ||
        isChromeValue(props['BARREL FINISH']);
      if (!monoChrome) return;
      var q = item.quantity || 1;
      mono += q === 1 ? 4 : q;
    });
    return { beadlock: beadlock, mono: mono };
  }

  function existingAddonQty(items, handle, variantId) {
    var qty = 0;
    (items || []).forEach(function (item) {
      if (!item) return;
      if (String(item.handle || '') === handle) qty += item.quantity || 0;
      else if (variantId && String(item.id || '') === String(variantId)) qty += item.quantity || 0;
    });
    return qty;
  }

  function reconcileCartChromeSurcharge() {
    return fetch('/cart.js', { credentials: 'same-origin', headers: { Accept: 'application/json' } })
      .then(function (r) {
        return r.json();
      })
      .then(function (cart) {
        var items = (cart && cart.items) || [];
        var expected = expectedFromCart(items);
        var existingBeadlock = existingAddonQty(items, BEADLOCK_HANDLE, beadlockVariantId());
        var existingMono = existingAddonQty(
          items,
          config().monoHandle || MONO_HANDLE,
          monoVariantId()
        );
        var missingBeadlock = expected.beadlock - existingBeadlock;
        var missingMono = expected.mono - existingMono;
        var chain = Promise.resolve(null);
        if (missingBeadlock > 0 && beadlockVariantId()) {
          chain = chain.then(function () {
            return addBeadlockAddon(missingBeadlock);
          });
        }
        if (missingMono > 0 && monoVariantId()) {
          chain = chain.then(function () {
            return addMonoAddon(missingMono);
          });
        }
        return chain;
      })
      .catch(function () {
        return null;
      });
  }

  function maybeReconcileOnCartPage() {
    if (!/\/cart\/?$/.test(location.pathname || '')) return;
    reconcileCartChromeSurcharge().then(function (result) {
      if (!result) return;
      try {
        document.dispatchEvent(new CustomEvent('cart:updated'));
        if (window.jQuery) window.jQuery(document).trigger('cart.requestComplete', [result]);
        location.reload();
      } catch (e) {}
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    patchAll();
    maybeReconcileOnCartPage();
  });
  window.addEventListener('load', patchAll);

  // Expose helpers for layout V2 + tests.
  window.__ffChromeSurchargeApi = {
    isChromeValue: isChromeValue,
    beadlockSelectionCount: beadlockSelectionCount,
    hasMonoChromeFinish: hasMonoChromeFinish,
    monoWheelCount: monoWheelCount,
    rememberChromeCharge: rememberChromeCharge,
    flushPendingAddon: flushPendingAddon,
  };
})();
