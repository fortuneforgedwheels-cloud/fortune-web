/**
 * Force Chrome face/ring finish surcharge to $250 on beadlock BCPO options.
 * VO/BCPO embeds prices in window.bcpo_data; storefront can lag app/metafield updates,
 * so we patch Face Color + Ring Color "Chrome" to 250 before ATC/cart math runs.
 */
(function () {
  var CHROME_PRICE = '250';

  function normalizeTitle(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
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

  installSetter();
  patchAll();

  var ticks = 0;
  var timer = setInterval(function () {
    patchAll();
    ticks += 1;
    if (ticks > 60) clearInterval(timer);
  }, 250);

  document.addEventListener('DOMContentLoaded', patchAll);
  window.addEventListener('load', patchAll);
})();
