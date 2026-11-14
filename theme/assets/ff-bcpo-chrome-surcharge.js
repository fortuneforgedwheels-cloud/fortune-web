/**
 * Chrome face/ring finish surcharge ($250 each).
 *
 * Patches BCPO option prices so Face/Ring Chrome are charged on the wheel
 * line item itself ($1999 + $250 + $250 = $2499). Does NOT add a separate
 * chrome-finish-surcharge product — that double-charged checkout.
 *
 * Cart reconcile removes any leftover surcharge line items from older ATC.
 */
(function () {
  var CHROME_PRICE = '250';
  var ADDON_HANDLE = 'chrome-finish-surcharge';

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

  function isChromeAddonItem(item) {
    if (!item) return false;
    if (String(item.handle || '') === ADDON_HANDLE) return true;
    if (addonVariantId() && String(item.id || '') === addonVariantId()) return true;
    if (addonVariantId() && String(item.variant_id || '') === addonVariantId()) return true;
    var props = item.properties || {};
    var surcharge = props._Surcharge || props['_Surcharge'];
    return String(surcharge || '').toLowerCase() === 'chrome finish';
  }

  function removeChromeAddonLines(items) {
    var targets = (items || []).filter(isChromeAddonItem);
    if (!targets.length) return Promise.resolve(false);

    // Prefer key-based updates so merged lines clear reliably.
    var updates = {};
    targets.forEach(function (item) {
      var key = item.key || item.id;
      if (key != null) updates[String(key)] = 0;
    });

    if (!Object.keys(updates).length) return Promise.resolve(false);

    return fetch('/cart/update.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ updates: updates }),
    })
      .then(function (res) {
        return res.ok;
      })
      .catch(function () {
        return false;
      });
  }

  function stripLegacyChromeSurchargeFromCart() {
    return fetch('/cart.js', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    })
      .then(function (r) {
        return r.json();
      })
      .then(function (cart) {
        return removeChromeAddonLines((cart && cart.items) || []);
      })
      .catch(function () {
        return false;
      });
  }

  function maybeStripLegacyChromeSurcharge() {
    if (window.__ffChromeSurchargeStripRunning) return;
    window.__ffChromeSurchargeStripRunning = true;
    stripLegacyChromeSurchargeFromCart()
      .then(function (removed) {
        if (!removed) return;
        try {
          document.dispatchEvent(new CustomEvent('cart:updated'));
          if (window.jQuery) window.jQuery(document).trigger('cart.requestComplete');
        } catch (e) {}
        if (/\/cart\/?$/.test(location.pathname || '')) {
          location.reload();
        }
      })
      .finally(function () {
        window.__ffChromeSurchargeStripRunning = false;
      });
  }

  installSetter();
  patchAll();

  // Mark charge-v2 present so any stale inline ATC adder stays idle if cached HTML still ships it.
  window.__ffChromeChargeV2 = true;
  window.__ffChromeSurchargeFetch = true;
  window.__ffChromeSurchargeForm = true;
  window.__ffChromeSurchargeAjax = true;

  var ticks = 0;
  var timer = setInterval(function () {
    patchAll();
    ticks += 1;
    if (ticks > 60) clearInterval(timer);
  }, 250);

  document.addEventListener('DOMContentLoaded', function () {
    patchAll();
    maybeStripLegacyChromeSurcharge();
  });
  window.addEventListener('load', patchAll);
  document.addEventListener('cart:updated', function () {
    // After ATC / drawer refresh, strip any leftover surcharge rows once.
    maybeStripLegacyChromeSurcharge();
  });

  // Expose for debugging / manual cart repair.
  window.FF_stripChromeSurchargeLines = stripLegacyChromeSurchargeFromCart;
})();
