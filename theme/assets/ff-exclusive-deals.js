(function () {
  function formatMoney(cents, format) {
    if (window.Shopify && typeof Shopify.formatMoney === 'function') {
      try {
        return Shopify.formatMoney(cents, format || window.money_format);
      } catch (e) {
        /* fall through */
      }
    }
    var value = (Number(cents) / 100).toFixed(2);
    if (!format) return '$' + value;
    return format
      .replace(/\{\{\s*amount\s*\}\}/, value)
      .replace(/\{\{\s*amount_no_decimals\s*\}\}/, String(Math.round(Number(cents) / 100)))
      .replace(/\{\{\s*amount_with_comma_separator\s*\}\}/, value.replace('.', ','));
  }

  function parseVariants(buy) {
    var el = buy.querySelector('[data-ff-xd-variants]');
    if (!el) return [];
    try {
      var data = JSON.parse(el.textContent || '[]');
      return Array.isArray(data) ? data : [];
    } catch (e) {
      return [];
    }
  }

  function selectedOptions(buy) {
    var options = [];
    Array.prototype.slice.call(buy.querySelectorAll('[data-ff-xd-option]')).forEach(function (group) {
      var active = group.querySelector('.ff-xd__chip.is-active');
      options.push(active ? active.getAttribute('data-ff-xd-option-value') || '' : '');
    });
    return options;
  }

  function findVariant(variants, options) {
    for (var i = 0; i < variants.length; i++) {
      var v = variants[i];
      var match =
        (options[0] == null || options[0] === '' || v.option1 === options[0]) &&
        (options[1] == null || options[1] === '' || v.option2 === options[1]) &&
        (options[2] == null || options[2] === '' || v.option3 === options[2]);
      if (match) return v;
    }
    return null;
  }

  function clampQty(value) {
    var n = parseInt(value, 10);
    if (isNaN(n) || n < 1) n = 1;
    if (n > 20) n = 20;
    return n;
  }

  function updateAvailability(buy, variants, current) {
    Array.prototype.slice.call(buy.querySelectorAll('[data-ff-xd-option]')).forEach(function (group, optionIndex) {
      var chips = Array.prototype.slice.call(group.querySelectorAll('[data-ff-xd-option-value]'));
      chips.forEach(function (chip) {
        var value = chip.getAttribute('data-ff-xd-option-value') || '';
        var probe = selectedOptions(buy).slice();
        probe[optionIndex] = value;
        var variant = findVariant(variants, probe);
        var available = !!(variant && variant.available);
        chip.classList.toggle('is-unavailable', !available);
        chip.setAttribute('aria-disabled', available ? 'false' : 'true');
      });
    });

    var priceEl = buy.querySelector('[data-ff-xd-price]');
    var atc = buy.querySelector('[data-ff-xd-atc]');
    var moneyFormat = buy.getAttribute('data-money-format') || window.money_format;
    var defaultLabel = atc ? atc.getAttribute('data-label-default') || atc.textContent.trim() : 'Add to cart';

    if (atc && !atc.getAttribute('data-label-default')) {
      atc.setAttribute('data-label-default', defaultLabel);
    }

    if (!current) {
      if (atc) {
        atc.disabled = true;
        atc.textContent = 'Unavailable';
        atc.removeAttribute('data-variant-id');
      }
      return;
    }

    if (priceEl) {
      var html = formatMoney(current.price, moneyFormat);
      if (current.compare_at_price && current.compare_at_price > current.price) {
        html += ' <span class="ff-xd__compare">' + formatMoney(current.compare_at_price, moneyFormat) + '</span>';
      }
      priceEl.innerHTML = html;
    }

    var img = buy.closest('[data-ff-xd-card]');
    if (img && current.featured_image) {
      var mediaImg = img.querySelector('.ff-xd__card-img');
      if (mediaImg && mediaImg.getAttribute('src') !== current.featured_image) {
        mediaImg.setAttribute('src', current.featured_image);
      }
    }

    if (atc) {
      atc.setAttribute('data-variant-id', String(current.id));
      atc.disabled = !current.available;
      atc.textContent = current.available
        ? (atc.getAttribute('data-label-default') || 'Add to cart')
        : 'Sold out';
    }
  }

  function syncCard(buy) {
    var variants = parseVariants(buy);
    var options = selectedOptions(buy);
    var current = findVariant(variants, options);
    if (!current) {
      for (var i = 0; i < variants.length; i++) {
        if (variants[i].available) {
          current = variants[i];
          break;
        }
      }
    }
    if (!current) current = variants[0] || null;
    updateAvailability(buy, variants, current);
    return current;
  }

  function openCartDrawer() {
    if (window.Shopify && typeof Shopify.getCart === 'function') {
      try {
        Shopify.getCart(function () {
          document.body.classList.add('cart-sidebar-show');
        });
        return;
      } catch (e) {
        /* fall through */
      }
    }
    window.location.href = '/cart';
  }

  function initBuy(buy) {
    var variants = parseVariants(buy);
    var qtyInput = buy.querySelector('[data-ff-xd-qty]');
    var minus = buy.querySelector('[data-ff-xd-qty-minus]');
    var plus = buy.querySelector('[data-ff-xd-qty-plus]');
    var atc = buy.querySelector('[data-ff-xd-atc]');
    var errorEl = buy.querySelector('[data-ff-xd-error]');

    Array.prototype.slice.call(buy.querySelectorAll('[data-ff-xd-option]')).forEach(function (group) {
      Array.prototype.slice.call(group.querySelectorAll('[data-ff-xd-option-value]')).forEach(function (chip) {
        chip.addEventListener('click', function () {
          Array.prototype.slice.call(group.querySelectorAll('[data-ff-xd-option-value]')).forEach(function (other) {
            var active = other === chip;
            other.classList.toggle('is-active', active);
            other.setAttribute('aria-selected', active ? 'true' : 'false');
          });
          if (errorEl) errorEl.hidden = true;
          syncCard(buy);
        });
      });
    });

    function setQty(next) {
      if (!qtyInput) return;
      qtyInput.value = String(clampQty(next));
    }

    if (minus) {
      minus.addEventListener('click', function () {
        setQty((parseInt(qtyInput && qtyInput.value, 10) || 1) - 1);
      });
    }
    if (plus) {
      plus.addEventListener('click', function () {
        setQty((parseInt(qtyInput && qtyInput.value, 10) || 1) + 1);
      });
    }
    if (qtyInput) {
      qtyInput.addEventListener('change', function () {
        setQty(qtyInput.value);
      });
    }

    if (atc) {
      atc.addEventListener('click', function () {
        var current = syncCard(buy);
        var qty = clampQty(qtyInput ? qtyInput.value : 1);
        var defaultLabel = atc.getAttribute('data-label-default') || 'Add to cart';

        if (!current || !current.id || !current.available) {
          if (errorEl) {
            errorEl.textContent = 'That option is unavailable. Pick another combination.';
            errorEl.hidden = false;
          }
          return;
        }

        atc.disabled = true;
        atc.textContent = 'Adding…';
        if (errorEl) errorEl.hidden = true;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [{ id: Number(current.id), quantity: qty }]
          })
        })
          .then(function (response) {
            if (!response.ok) throw new Error('cart-add-failed');
            return response.json();
          })
          .then(function () {
            atc.disabled = false;
            atc.textContent = defaultLabel;
            openCartDrawer();
          })
          .catch(function () {
            atc.disabled = false;
            atc.textContent = defaultLabel;
            if (errorEl) {
              errorEl.textContent = 'Could not add to cart. Please try again.';
              errorEl.hidden = false;
            }
          });
      });
    }

    syncCard(buy);
  }

  function init(root) {
    Array.prototype.slice.call(root.querySelectorAll('[data-ff-xd-buy]')).forEach(initBuy);
  }

  function boot() {
    Array.prototype.slice.call(document.querySelectorAll('[data-ff-exclusive-deals]')).forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target && event.target.querySelector
      ? event.target.querySelector('[data-ff-exclusive-deals]')
      : null;
    if (root) init(root);
    else if (event.target && event.target.matches && event.target.matches('[data-ff-exclusive-deals]')) {
      init(event.target);
    }
  });
})();
