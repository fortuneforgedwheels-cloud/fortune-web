(function () {
  'use strict';

  var SETUPS = {
    '19/20': {
      label: '19/20"',
      specs: '19x10 ET10 & 20x11 ET12',
      fitment: 'True flush plug and play fitment'
    },
    '20/20': {
      label: '20/20"',
      specs: '20x10 ET10 & 20x11 ET12',
      fitment: 'Plug and play fitment'
    }
  };

  var HIDE_KEYS = [
    'DIAMETER',
    'WIDTH',
    'OFFSET',
    'LUG PATTERN',
    'LEAD TIME PREFERENCE',
    'YEAR/MAKE/MODEL',
    'COLOR'
  ];

  function norm(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function optionKey(text) {
    return norm(text).split(':')[0].trim();
  }

  function getRoot() {
    return document.querySelector('[data-ff-g8x-mono-path]');
  }

  function getProductView(root) {
    return root.closest('.productView') || document.querySelector('.productView') || document.body;
  }

  function getForm(root) {
    var id = root.getAttribute('data-form-id');
    return (
      (id && document.getElementById(id)) ||
      root.closest('form') ||
      document.querySelector('form[action*="/cart/add"]')
    );
  }

  function money(amount) {
    var n = Number(amount);
    if (!isFinite(n)) n = 3100;
    return (
      '$' +
      n.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })
    );
  }

  function bcpoOptions() {
    if (window.bcpo_data && Array.isArray(window.bcpo_data.virtual_options)) {
      return window.bcpo_data.virtual_options;
    }
    var scripts = document.querySelectorAll('script:not([src])');
    for (var i = 0; i < scripts.length; i++) {
      var text = scripts[i].textContent || '';
      var marker = 'bcpo_data=';
      var start = text.indexOf(marker);
      if (start === -1) continue;
      var jsonStart = text.indexOf('{', start);
      if (jsonStart === -1) continue;
      var depth = 0;
      var end = -1;
      for (var j = jsonStart; j < text.length; j++) {
        var ch = text.charAt(j);
        if (ch === '{') depth += 1;
        if (ch === '}') {
          depth -= 1;
          if (depth === 0) {
            end = j + 1;
            break;
          }
        }
      }
      if (end === -1) continue;
      try {
        var data = JSON.parse(text.slice(jsonStart, end));
        if (data && Array.isArray(data.virtual_options)) {
          window.bcpo_data = data;
          return data.virtual_options;
        }
      } catch (e) {}
    }
    return [];
  }

  function colorMeta() {
    var opt = bcpoOptions().find(function (o) {
      return optionKey(o.title) === 'COLOR';
    });
    var values = [];
    var prices = {};
    if (opt && Array.isArray(opt.values)) {
      opt.values.forEach(function (v) {
        if (!v) return;
        if (typeof v === 'object') {
          if (!v.key) return;
          values.push(v.key);
          if (v.price != null && Number(v.price) > 0) prices[v.key] = String(v.price);
        } else {
          values.push(String(v));
        }
      });
    }
    return { values: values, prices: prices };
  }

  function findBcpoSelect(title) {
    var wanted = norm(title);
    var labels = document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label');
    for (var i = 0; i < labels.length; i++) {
      if (optionKey(labels[i].textContent) !== wanted) continue;
      var wrap =
        labels[i].closest('.selector-wrapper') ||
        labels[i].closest('[class*="bcpo"]') ||
        labels[i].parentElement;
      if (!wrap) continue;
      return wrap.querySelector('select, .bcpo-dd, .bcpo-select');
    }
    return null;
  }

  function setSelect(field, desired) {
    if (!field || !desired || field.tagName !== 'SELECT') return false;
    var wanted = String(desired).trim();
    var options = Array.from(field.options);
    var match =
      options.find(function (o) {
        return o.value === wanted || o.text.trim() === wanted;
      }) ||
      options.find(function (o) {
        return o.value.indexOf(wanted) !== -1 || o.text.indexOf(wanted) !== -1;
      });
    if (!match) return false;
    if (field.value !== match.value) {
      field.value = match.value;
      field.dispatchEvent(new Event('change', { bubbles: true }));
      field.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return true;
  }

  function currentMode(root) {
    var checked = root.querySelector('input[type="radio"][name^="ff_g8x_mono_path_"]:checked');
    return checked ? checked.value : 'custom';
  }

  function currentSetup(root) {
    var checked = root.querySelector('[data-ff-g8x-mono-setup]:checked');
    return checked ? checked.value : '';
  }

  function populateFinish(root) {
    var select = root.querySelector('[data-ff-g8x-mono-finish]');
    if (!select) return;
    var meta = colorMeta();
    if (!meta.values.length) return;
    var current = select.value;
    select.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = 'Choose one';
    select.appendChild(ph);
    meta.values.forEach(function (value) {
      var opt = document.createElement('option');
      opt.value = value;
      opt.textContent =
        meta.prices[value] && Number(meta.prices[value]) > 0
          ? value + ' (+$' + meta.prices[value] + ')'
          : value;
      select.appendChild(opt);
    });
    if (current && meta.values.indexOf(current) !== -1) select.value = current;
  }

  function syncFinish(root) {
    var select = root.querySelector('[data-ff-g8x-mono-finish]');
    if (!select || !select.value) return;
    setSelect(findBcpoSelect('COLOR'), select.value);
    var prop = root.querySelector('[data-ff-g8x-mono-finish-prop]');
    if (prop) prop.value = select.value;
  }

  function updateSetupProps(root) {
    var key = currentSetup(root);
    var meta = SETUPS[key];
    var setupProp = root.querySelector('[data-ff-g8x-mono-setup-prop]');
    var specsProp = root.querySelector('[data-ff-g8x-mono-specs-prop]');
    if (setupProp) setupProp.value = meta ? meta.label + ' — ' + meta.fitment : '';
    if (specsProp) specsProp.value = meta ? meta.specs : '';
  }

  function hideBcpo(g8x) {
    document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label').forEach(function (label) {
      var key = optionKey(label.textContent);
      var wrap =
        label.closest('.selector-wrapper') ||
        label.closest('[class*="bcpo"]') ||
        label.parentElement;
      if (!wrap || wrap.closest('[data-ff-g8x-mono-path]')) return;
      var shouldHide = g8x && (HIDE_KEYS.indexOf(key) !== -1 || key.indexOf('YEAR') === 0);
      if (shouldHide) {
        wrap.style.setProperty('display', 'none', 'important');
        wrap.setAttribute('aria-hidden', 'true');
        wrap.setAttribute('data-ff-g8x-mono-hidden', '1');
      } else if (wrap.getAttribute('data-ff-g8x-mono-hidden') === '1') {
        wrap.style.removeProperty('display');
        wrap.setAttribute('aria-hidden', 'false');
        wrap.removeAttribute('data-ff-g8x-mono-hidden');
      }
    });

    document.querySelectorAll('.productView-variants').forEach(function (el) {
      if (g8x) {
        el.style.setProperty('display', 'none', 'important');
        el.setAttribute('data-ff-g8x-mono-hidden-diameter', '1');
      } else if (el.getAttribute('data-ff-g8x-mono-hidden-diameter') === '1') {
        el.style.removeProperty('display');
        el.removeAttribute('data-ff-g8x-mono-hidden-diameter');
      }
    });
  }

  function rewritePrice(root, g8x) {
    var setPrice = money(root.getAttribute('data-set-price') || '3100');
    var nodes = document.querySelectorAll(
      '.productView-price .price-item--regular, .productView-price .money, .productView-price [data-product-price], .price__regular .price-item--regular, [data-product-subtotal], .productView-subTotal-value, .bcpo-cart-item-price'
    );
    nodes.forEach(function (node) {
      if (g8x) {
        if (!node.getAttribute('data-ff-g8x-mono-price-orig')) {
          node.setAttribute('data-ff-g8x-mono-price-orig', node.textContent);
        }
        node.textContent = setPrice + ' / set';
      } else if (node.getAttribute('data-ff-g8x-mono-price-orig')) {
        node.textContent = node.getAttribute('data-ff-g8x-mono-price-orig');
        node.removeAttribute('data-ff-g8x-mono-price-orig');
      }
    });

    document.querySelectorAll('[data-btn-addToCart], button[name="add"].product-form__submit').forEach(function (btn) {
      if (g8x) {
        if (!btn.getAttribute('data-ff-g8x-mono-btn-orig')) {
          btn.setAttribute('data-ff-g8x-mono-btn-orig', btn.innerHTML);
        }
        btn.innerHTML = 'CHECKOUT - ' + setPrice;
      } else if (btn.getAttribute('data-ff-g8x-mono-btn-orig')) {
        btn.innerHTML = btn.getAttribute('data-ff-g8x-mono-btn-orig');
        btn.removeAttribute('data-ff-g8x-mono-btn-orig');
      }
    });
  }

  function lockQuantity(g8x) {
    document.querySelectorAll('input.quantity__input, input[name="quantity"]').forEach(function (input) {
      if (g8x) {
        if (!input.getAttribute('data-ff-g8x-mono-qty-orig')) {
          input.setAttribute('data-ff-g8x-mono-qty-orig', input.value || '1');
        }
        input.value = '1';
        input.setAttribute('value', '1');
        input.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (input.getAttribute('data-ff-g8x-mono-qty-orig')) {
        input.value = input.getAttribute('data-ff-g8x-mono-qty-orig');
        input.removeAttribute('data-ff-g8x-mono-qty-orig');
      }
    });
  }

  function setMode(root, next) {
    var g8x = next === 'g8x';
    var view = getProductView(root);
    var g8xPanel = root.querySelector('[data-ff-g8x-mono-g8x-panel]');
    var customPanel = root.querySelector('[data-ff-g8x-mono-custom-panel]');

    root.classList.toggle('is-g8x', g8x);
    view.classList.toggle('is-ff-g8x-mono-g8x', g8x);
    document.body.classList.toggle('is-ff-g8x-mono-g8x', g8x);

    if (g8xPanel) g8xPanel.hidden = !g8x;
    if (customPanel) customPanel.hidden = g8x;

    root.querySelectorAll('[data-ff-g8x-mono-g8x-prop]').forEach(function (el) {
      el.disabled = !g8x;
    });
    root.querySelectorAll('[data-ff-g8x-mono-custom-prop]').forEach(function (el) {
      el.disabled = g8x;
    });

    var finish = root.querySelector('[data-ff-g8x-mono-finish]');
    if (finish) {
      finish.required = g8x;
      finish.disabled = !g8x;
      if (!g8x) finish.setCustomValidity('');
    }

    populateFinish(root);
    hideBcpo(g8x);
    lockQuantity(g8x);
    rewritePrice(root, g8x);
    if (g8x) {
      updateSetupProps(root);
      syncFinish(root);
    }
  }

  function variantId(root) {
    var key = currentSetup(root);
    if (key === '19/20') return root.getAttribute('data-variant-19-20');
    if (key === '20/20') return root.getAttribute('data-variant-20-20');
    return '';
  }

  function validate(root, event) {
    if (currentMode(root) !== 'g8x') return true;
    if (!currentSetup(root)) {
      window.alert('Please choose a 19/20" or 20/20" G8X setup.');
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      }
      return false;
    }
    var finish = root.querySelector('[data-ff-g8x-mono-finish]');
    if (finish && !String(finish.value || '').trim()) {
      finish.focus();
      finish.setCustomValidity('Please choose a finish.');
      finish.reportValidity();
      if (event) {
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
      }
      return false;
    }
    if (!variantId(root)) {
      window.alert('G8X package is unavailable right now. Please refresh and try again.');
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }
      return false;
    }
    updateSetupProps(root);
    syncFinish(root);
    return true;
  }

  function buildProperties(root) {
    var key = currentSetup(root);
    var meta = SETUPS[key] || {};
    var finish = root.querySelector('[data-ff-g8x-mono-finish]');
    return {
      'Spec Path': 'Buy G8X fitment',
      'Wheel Style': root.getAttribute('data-style-code') || '',
      'G8X Setup': meta.label ? meta.label + ' — ' + meta.fitment : key,
      'G8X Specs': meta.specs || '',
      Fitment: meta.fitment || 'G8X plug and play',
      Package: 'Full set of 4 — $3,100.00',
      Finish: finish ? finish.value : ''
    };
  }

  function isChromeFinish(root) {
    var finish = root.querySelector('[data-ff-g8x-mono-finish]');
    if (!finish) return false;
    return (
      String(finish.value || '')
        .replace(/\s*\(\+\$?\d+.*?\)\s*$/i, '')
        .trim()
        .toLowerCase() === 'chrome'
    );
  }

  function addSet(root) {
    var items = [{ id: Number(variantId(root)), quantity: 1, properties: buildProperties(root) }];
    if (isChromeFinish(root) && window.FF_CHROME_SURCHARGE && window.FF_CHROME_SURCHARGE.variantId) {
      items.push({
        id: Number(window.FF_CHROME_SURCHARGE.variantId),
        quantity: 1,
        properties: {
          _Surcharge: 'Chrome finish',
          Note: 'Chrome finish surcharge for G8X set',
          'Chrome selections': root.getAttribute('data-style-code') || 'G8X set'
        }
      });
    }
    return fetch((window.routes && window.routes.cart_add_url) || '/cart/add.js', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ items: items })
    }).then(function (res) {
      if (!res.ok) {
        return res.text().then(function (t) {
          throw new Error(t || 'Unable to add G8X set');
        });
      }
      return res.json();
    });
  }

  function bind(root) {
    if (root.dataset.ffG8xBound === '1') return;
    root.dataset.ffG8xBound = '1';

    root.querySelectorAll('input[type="radio"][name^="ff_g8x_mono_path_"]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        setMode(root, radio.value);
      });
    });

    root.querySelectorAll('[data-ff-g8x-mono-setup]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        updateSetupProps(root);
        lockQuantity(true);
        rewritePrice(root, true);
      });
    });

    var finish = root.querySelector('[data-ff-g8x-mono-finish]');
    if (finish) {
      finish.addEventListener('change', function () {
        finish.setCustomValidity('');
        syncFinish(root);
      });
    }

    var form = getForm(root);
    if (form) {
      form.addEventListener(
        'submit',
        function (event) {
          if (currentMode(root) !== 'g8x') return;
          if (!validate(root, event)) return;
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          addSet(root)
            .then(function () {
              window.location.href = (window.routes && window.routes.cart_url) || '/cart';
            })
            .catch(function (err) {
              window.alert((err && err.message) || 'Could not add G8X set to cart.');
            });
        },
        true
      );
    }

    getProductView(root).addEventListener(
      'click',
      function (event) {
        if (currentMode(root) !== 'g8x') return;
        var btn =
          event.target && event.target.closest
            ? event.target.closest(
                '[data-btn-addtocart], button[name="add"], .product-form__submit, [data-add-to-cart]'
              )
            : null;
        if (!btn) return;
        if (!validate(root, event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        btn.setAttribute('disabled', 'disabled');
        addSet(root)
          .then(function () {
            window.location.href = (window.routes && window.routes.cart_url) || '/cart';
          })
          .catch(function (err) {
            btn.removeAttribute('disabled');
            window.alert((err && err.message) || 'Could not add G8X set to cart.');
          });
      },
      true
    );

    var tries = 0;
    var timer = window.setInterval(function () {
      tries += 1;
      try {
        populateFinish(root);
        setMode(root, currentMode(root));
      } catch (e) {}
      if (colorMeta().values.length || tries >= 40) {
        window.clearInterval(timer);
        try {
          populateFinish(root);
          setMode(root, currentMode(root));
        } catch (e2) {}
      }
    }, 250);

    setMode(root, currentMode(root));
  }

  function init() {
    var root = getRoot();
    if (!root) return;
    bind(root);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
