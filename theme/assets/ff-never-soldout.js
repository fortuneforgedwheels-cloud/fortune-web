/**
 * Never show sold-out / limited inventory on storefront.
 * Shopify catalog is set to not track inventory + CONTINUE policy.
 * BCPO still injects inventory_quantity: 0 which can mark options sold out — neutralize that.
 */
(function () {
  var QTY = 9999;

  function patchProduct(p) {
    if (!p || !Array.isArray(p.variants)) return;
    for (var i = 0; i < p.variants.length; i++) {
      var v = p.variants[i];
      if (!v || typeof v !== 'object') continue;
      v.inventory_quantity = QTY;
      v.available = true;
    }
  }

  function patchAll() {
    try {
      if (window.bcpo_product) patchProduct(window.bcpo_product);
      if (window.meta && window.meta.product && Array.isArray(window.meta.product.variants)) {
        window.meta.product.variants.forEach(function (v) {
          if (!v) return;
          v.inventory_quantity = QTY;
          v.available = true;
        });
      }
      if (window.bcpo_settings && typeof window.bcpo_settings === 'object') {
        window.bcpo_settings.sold_out_style = 'none';
      }
      // Hide any leftover theme inventory / sold-out chrome
      document.querySelectorAll('.productView-inventory, [id^="product-sold-out-"]').forEach(function (el) {
        el.style.display = 'none';
        el.classList.add('is-hide');
      });
      document.querySelectorAll('.soldout, .sold-out-badge, .badge.sold-out-badge').forEach(function (el) {
        el.style.display = 'none';
      });
    } catch (e) {}
  }

  // Intercept bcpo_product assignment if BCPO sets it later
  try {
    var current = window.bcpo_product;
    Object.defineProperty(window, 'bcpo_product', {
      configurable: true,
      enumerable: true,
      get: function () {
        return current;
      },
      set: function (value) {
        current = value;
        patchProduct(current);
      },
    });
    if (current) patchProduct(current);
  } catch (e) {
    patchAll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', patchAll);
  } else {
    patchAll();
  }
  window.addEventListener('load', patchAll);
  // BCPO sometimes finishes after load
  setTimeout(patchAll, 50);
  setTimeout(patchAll, 500);
  setTimeout(patchAll, 1500);
})();
