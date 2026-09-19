/**
 * Fortune Forged PDP direct-purchase configurator.
 * Scope: product page ATC only. Does not touch quote form / QuoteSubmitted.
 */
(function () {
  'use strict';
  if (window.__ffPdpConfigBoot) return;
  window.__ffPdpConfigBoot = true;

  var PACKAGE_PRESETS = [
    [17, 17],
    [18, 18],
    [19, 19],
    [19, 20],
    [20, 20],
    [20, 21],
    [21, 21],
    [21, 22],
    [22, 22],
  ];

  var PLUG =
    "PLUG N' PLAY || KEEP OEM SPECS";

  function qs(root, sel) {
    return root.querySelector(sel);
  }
  function qsa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function parseDiameters(raw) {
    var out = [];
    String(raw || '')
      .split('||')
      .forEach(function (part) {
        var m = String(part).match(/(1[5-9]|2[0-4])/);
        if (m) {
          var n = parseInt(m[1], 10);
          if (out.indexOf(n) === -1) out.push(n);
        }
      });
    out.sort(function (a, b) {
      return a - b;
    });
    return out;
  }

  function diamLabel(n) {
    return n + '"';
  }

  function packageKey(front, rear) {
    return front + '/' + rear;
  }

  function readStoredVehicle() {
    try {
      var raw = sessionStorage.getItem('ffVehicleSelection');
      if (!raw) return null;
      var v = JSON.parse(raw);
      if (!v || (!v.year && !v.make && !v.model)) return null;
      return v;
    } catch (e) {
      return null;
    }
  }

  function formatVehicle(v) {
    if (!v) return '';
    return [v.year, v.make, v.model, v.trim || v.chassis || '']
      .map(function (x) {
        return String(x || '').trim();
      })
      .filter(Boolean)
      .join(' ');
  }

  function findOptionSelects() {
    var width = null;
    var offset = null;
    var lug = null;
    var diameterNative = [];

    function classify(select) {
      if (!select || select.tagName !== 'SELECT') return;
      var wrap =
        select.closest('.selector-wrapper') ||
        select.closest('.product-form__input') ||
        select.closest('[class*="bcpo"]') ||
        select.parentElement;
      var label = '';
      if (wrap) {
        var lab = wrap.querySelector(
          '.bcpo-title, .bcpo-front-dd-label, .bcpo-label, legend, label, .form__label, .ff-option-acc__trigger'
        );
        if (lab) label = String(lab.textContent || '');
      }
      label += ' ' + (select.getAttribute('name') || '') + ' ' + (select.id || '');
      label = label.toLowerCase();
      if (/width/.test(label) && !width) width = select;
      else if (/offset|et\b/.test(label) && !offset) offset = select;
      else if (/lug|bolt\s*pattern|pcd/.test(label) && !lug) lug = select;
    }

    qsa(document, 'select').forEach(classify);

    qsa(document, 'fieldset.product-form__input, variant-radios fieldset, .productView-variants fieldset').forEach(
      function (fs) {
        var legend = fs.querySelector('legend, .form__label');
        var text = legend ? String(legend.textContent || '').toLowerCase() : '';
        if (/diameter|size|fitment/.test(text)) diameterNative.push(fs);
      }
    );

    return { width: width, offset: offset, lug: lug, diameterNative: diameterNative };
  }

  function setSelectValue(select, preferred) {
    if (!select) return false;
    var opts = Array.prototype.slice.call(select.options || []);
    var match =
      opts.find(function (o) {
        return String(o.value) === preferred || String(o.textContent).trim() === preferred;
      }) ||
      opts.find(function (o) {
        return /plug\s*n/i.test(o.value) || /plug\s*n/i.test(o.textContent) || /keep oem/i.test(o.textContent);
      });
    if (!match) return false;
    select.value = match.value;
    select.dispatchEvent(new Event('change', { bubbles: true }));
    select.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }

  function setWrapperHidden(el, hidden) {
    if (!el) return;
    var wrap =
      el.closest('.ff-option-acc') ||
      el.closest('.selector-wrapper') ||
      el.closest('.product-form__input') ||
      el.closest('[class*="bcpo"]') ||
      el.parentElement;
    if (wrap) wrap.hidden = !!hidden;
    if (wrap) wrap.classList.toggle('ff-pdp-config-hidden-tech', !!hidden);
  }

  function selectDiameterVariant(root, maxDiam) {
    var label = diamLabel(maxDiam);
    var productView = root.closest('.productView') || document;
    var radios = qsa(productView, 'input.product-form__radio');
    var hit = radios.find(function (r) {
      return String(r.value).replace(/\s/g, '') === label.replace(/\s/g, '') || String(r.value).indexOf(String(maxDiam)) === 0;
    });
    if (hit && !hit.checked) {
      hit.checked = true;
      hit.dispatchEvent(new Event('change', { bubbles: true }));
      hit.click();
      return true;
    }
    var selects = qsa(productView, 'select.select__select, variant-selects select');
    for (var i = 0; i < selects.length; i++) {
      var sel = selects[i];
      var wrap = sel.closest('.product-form__input');
      var lab = wrap && wrap.querySelector('.form__label, label');
      var t = lab ? String(lab.textContent || '').toLowerCase() : '';
      if (!/diameter|size|fitment/.test(t) && selects.length > 1) continue;
      for (var j = 0; j < sel.options.length; j++) {
        var opt = sel.options[j];
        if (String(opt.value).indexOf(String(maxDiam)) !== -1 || String(opt.textContent).indexOf(String(maxDiam)) !== -1) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  }

  function buildPackages(available) {
    var set = {};
    available.forEach(function (d) {
      set[d] = true;
    });
    var packages = [];
    PACKAGE_PRESETS.forEach(function (pair) {
      if (set[pair[0]] && set[pair[1]]) {
        packages.push({ front: pair[0], rear: pair[1], max: Math.max(pair[0], pair[1]) });
      }
    });
    if (!packages.length && available.length) {
      available.forEach(function (d) {
        packages.push({ front: d, rear: d, max: d });
      });
    }
    return packages;
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var form =
      root.closest('form[action*="/cart/add"]') ||
      document.querySelector('form[data-type="add-to-cart-form"]') ||
      document.querySelector('form[action*="/cart/add"]');

    var propsHost = form ? qs(form, '[data-ff-pdp-props]') : qs(document, '[data-ff-pdp-props]');
    if (!propsHost && form) {
      // properties may be siblings inside form from same render
    }

    var prop = {
      vehicle: qs(document, '[data-ff-prop-vehicle]'),
      wheelSize: qs(document, '[data-ff-prop-wheel-size]'),
      frontDiam: qs(document, '[data-ff-prop-front-diam]'),
      rearDiam: qs(document, '[data-ff-prop-rear-diam]'),
      fitment: qs(document, '[data-ff-prop-fitment]'),
      method: qs(document, '[data-ff-prop-fitment-method]'),
      frontSpec: qs(document, '[data-ff-prop-front-spec]'),
      rearSpec: qs(document, '[data-ff-prop-rear-spec]'),
      mods: qs(document, '[data-ff-prop-mods]'),
    };

    var vehicleDisplay = qs(root, '[data-ff-vehicle-display]');
    var vehicleForm = qs(root, '[data-ff-vehicle-form]');
    var vehicleLabel = qs(root, '[data-ff-vehicle-label]');
    var vehicleError = qs(root, '[data-ff-vehicle-error]');
    var sizeError = qs(root, '[data-ff-size-error]');
    var advancedError = qs(root, '[data-ff-advanced-error]');
    var packagesEl = qs(root, '[data-ff-size-packages]');
    var advanced = qs(root, '[data-ff-advanced]');
    var modsDetailWrap = qs(root, '[data-ff-mods-detail-wrap]');

    var state = {
      vehicle: null,
      front: null,
      rear: null,
      max: null,
      fitment: 'Flush',
      advanced: false,
    };

    var available = parseDiameters(root.getAttribute('data-ff-diameters'));
    var packages = buildPackages(available);

    function syncTechOptions() {
      var opts = findOptionSelects();
      opts.diameterNative.forEach(function (fs) {
        fs.classList.add('ff-pdp-config-hidden-tech');
        fs.hidden = true;
      });
      if (state.advanced) {
        setWrapperHidden(opts.width, false);
        setWrapperHidden(opts.offset, false);
        setWrapperHidden(opts.lug, false);
      } else {
        setSelectValue(opts.width, PLUG);
        setSelectValue(opts.offset, PLUG);
        setSelectValue(opts.lug, PLUG);
        setWrapperHidden(opts.width, true);
        setWrapperHidden(opts.offset, true);
        setWrapperHidden(opts.lug, true);
      }
    }

    function syncProps() {
      var vehicleText = formatVehicle(state.vehicle);
      if (prop.vehicle) prop.vehicle.value = vehicleText;
      if (prop.fitment) prop.fitment.value = state.fitment || 'Flush';
      if (prop.method) {
        prop.method.value = state.advanced ? 'Customer-Specified' : 'Fortune Forged Spec';
      }
      if (state.front != null && state.rear != null) {
        var sizeLabel = diamLabel(state.front) + ' Front / ' + diamLabel(state.rear) + ' Rear';
        if (prop.wheelSize) prop.wheelSize.value = sizeLabel;
        if (prop.frontDiam) prop.frontDiam.value = diamLabel(state.front);
        if (prop.rearDiam) prop.rearDiam.value = diamLabel(state.rear);
      }
      var frontSpec = qs(root, '[data-ff-front-spec]');
      var rearSpec = qs(root, '[data-ff-rear-spec]');
      if (prop.frontSpec) prop.frontSpec.value = state.advanced && frontSpec ? frontSpec.value.trim() : '';
      if (prop.rearSpec) prop.rearSpec.value = state.advanced && rearSpec ? rearSpec.value.trim() : '';
      // Clear empty advanced props so cart isn't cluttered
      if (prop.frontSpec && !prop.frontSpec.value) prop.frontSpec.disabled = true;
      else if (prop.frontSpec) prop.frontSpec.disabled = false;
      if (prop.rearSpec && !prop.rearSpec.value) prop.rearSpec.disabled = true;
      else if (prop.rearSpec) prop.rearSpec.disabled = false;

      var modsChoice = qs(root, '[data-ff-mods-choice]:checked');
      var modsDetail = qs(root, '[data-ff-mods-detail]');
      var modsVal = modsChoice ? modsChoice.value : 'Stock / No';
      if (modsVal === 'Yes' && modsDetail && modsDetail.value.trim()) {
        modsVal = 'Yes — ' + modsDetail.value.trim();
      }
      if (prop.mods) prop.mods.value = modsVal;
    }

    function showVehicle(v) {
      state.vehicle = v;
      var label = formatVehicle(v);
      if (label) {
        if (vehicleLabel) vehicleLabel.textContent = label;
        if (vehicleDisplay) vehicleDisplay.hidden = false;
        if (vehicleForm) vehicleForm.hidden = true;
        if (vehicleError) vehicleError.hidden = true;
      } else {
        if (vehicleDisplay) vehicleDisplay.hidden = true;
        if (vehicleForm) vehicleForm.hidden = false;
      }
      syncProps();
    }

    function renderPackages() {
      if (!packagesEl) return;
      packagesEl.innerHTML = '';
      if (!packages.length) {
        packagesEl.innerHTML =
          '<p class="ff-pdp-config__helper">Diameter will be confirmed with your vehicle and finish selection.</p>';
        return;
      }
      packages.forEach(function (pkg, idx) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ff-pdp-config__package';
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('data-front', String(pkg.front));
        btn.setAttribute('data-rear', String(pkg.rear));
        btn.setAttribute('data-max', String(pkg.max));
        btn.innerHTML =
          '<span class="ff-pdp-config__package-size">' +
          diamLabel(pkg.front) +
          ' / ' +
          diamLabel(pkg.rear) +
          '</span><span class="ff-pdp-config__package-sub">Front / Rear</span>';
        btn.addEventListener('click', function () {
          selectPackage(pkg, btn);
        });
        packagesEl.appendChild(btn);
        if (idx === 0) {
          // Prefer a mid-range default like 19/20 or 20/20 when available
        }
      });
      var preferred =
        packages.find(function (p) {
          return p.front === 19 && p.rear === 20;
        }) ||
        packages.find(function (p) {
          return p.front === 20 && p.rear === 20;
        }) ||
        packages[0];
      if (preferred) {
        var matchBtn = packagesEl.querySelector(
          '[data-front="' + preferred.front + '"][data-rear="' + preferred.rear + '"]'
        );
        if (matchBtn) selectPackage(preferred, matchBtn);
      }
    }

    function selectPackage(pkg, btn) {
      state.front = pkg.front;
      state.rear = pkg.rear;
      state.max = pkg.max;
      qsa(packagesEl, '.ff-pdp-config__package').forEach(function (el) {
        el.classList.toggle('is-selected', el === btn);
      });
      if (sizeError) sizeError.hidden = true;
      selectDiameterVariant(root, pkg.max);
      syncProps();
      syncTechOptions();
    }

    // Vehicle bootstrap
    var stored = readStoredVehicle();
    if (stored) {
      showVehicle({
        year: stored.year || '',
        make: stored.make || '',
        model: stored.model || '',
        trim: stored.chassis || stored.trim || '',
      });
      qs(root, '[data-ff-year]') && (qs(root, '[data-ff-year]').value = stored.year || '');
      qs(root, '[data-ff-make]') && (qs(root, '[data-ff-make]').value = stored.make || '');
      qs(root, '[data-ff-model]') && (qs(root, '[data-ff-model]').value = stored.model || '');
      qs(root, '[data-ff-trim]') &&
        (qs(root, '[data-ff-trim]').value = stored.chassis || stored.trim || '');
    }

    var saveBtn = qs(root, '[data-ff-vehicle-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', function () {
        var v = {
          year: (qs(root, '[data-ff-year]') || {}).value || '',
          make: (qs(root, '[data-ff-make]') || {}).value || '',
          model: (qs(root, '[data-ff-model]') || {}).value || '',
          trim: (qs(root, '[data-ff-trim]') || {}).value || '',
        };
        v.year = String(v.year).trim();
        v.make = String(v.make).trim();
        v.model = String(v.model).trim();
        v.trim = String(v.trim).trim();
        if (!v.year || !v.make || !v.model) {
          if (vehicleError) vehicleError.hidden = false;
          return;
        }
        try {
          sessionStorage.setItem(
            'ffVehicleSelection',
            JSON.stringify({
              year: v.year,
              make: v.make,
              model: v.model,
              chassis: v.trim,
              source: 'product-page',
            })
          );
        } catch (e) {}
        showVehicle(v);
      });
    }

    var changeBtn = qs(root, '[data-ff-vehicle-change]');
    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        if (vehicleDisplay) vehicleDisplay.hidden = true;
        if (vehicleForm) vehicleForm.hidden = false;
      });
    }

    qsa(root, '[data-ff-fitment-style]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.fitment = input.value;
        syncProps();
      });
    });

    if (advanced) {
      advanced.addEventListener('toggle', function () {
        state.advanced = !!advanced.open;
        syncTechOptions();
        syncProps();
      });
      qsa(root, '[data-ff-front-spec], [data-ff-rear-spec]').forEach(function (input) {
        input.addEventListener('input', syncProps);
      });
    }

    qsa(root, '[data-ff-mods-choice]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        if (modsDetailWrap) modsDetailWrap.hidden = input.value !== 'Yes';
        syncProps();
      });
    });
    var modsDetail = qs(root, '[data-ff-mods-detail]');
    if (modsDetail) modsDetail.addEventListener('input', syncProps);

    renderPackages();
    syncTechOptions();
    syncProps();

    // Re-hide tech options when VO/BCPO injects late
    var obs = new MutationObserver(function () {
      syncTechOptions();
    });
    obs.observe(document.body, { childList: true, subtree: true });

    function validateBeforeAdd(event) {
      syncProps();
      var ok = true;
      if (!formatVehicle(state.vehicle)) {
        ok = false;
        if (vehicleError) vehicleError.hidden = false;
        if (vehicleForm) vehicleForm.hidden = false;
        if (vehicleDisplay) vehicleDisplay.hidden = true;
      }
      if (packages.length && (state.front == null || state.rear == null)) {
        ok = false;
        if (sizeError) sizeError.hidden = false;
      }
      if (state.advanced) {
        var fs = (qs(root, '[data-ff-front-spec]') || {}).value || '';
        var rs = (qs(root, '[data-ff-rear-spec]') || {}).value || '';
        if (!String(fs).trim() || !String(rs).trim()) {
          ok = false;
          if (advancedError) advancedError.hidden = false;
          if (advanced && !advanced.open) advanced.open = true;
        } else if (advancedError) advancedError.hidden = true;
      }
      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        root.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }
      // Ensure plug-and-play width/offset for FF Spec path right before submit
      if (!state.advanced) {
        var opts = findOptionSelects();
        setSelectValue(opts.width, PLUG);
        setSelectValue(opts.offset, PLUG);
        setSelectValue(opts.lug, PLUG);
      }
      syncProps();
      return true;
    }

    document.addEventListener(
      'click',
      function (event) {
        var btn = event.target && event.target.closest('[data-btn-addtocart], [name="add"]');
        if (!btn) return;
        var inProduct =
          btn.closest('form[action*="/cart/add"]') ||
          btn.closest('.productView') ||
          btn.closest('sticky-add-to-cart');
        if (!inProduct) return;
        if (!document.body.contains(root)) return;
        validateBeforeAdd(event);
      },
      true
    );

    if (form) {
      form.addEventListener(
        'submit',
        function (event) {
          validateBeforeAdd(event);
        },
        true
      );
    }

    document.body.classList.add('ff-pdp-config-active');

    // Hide legacy theme YMM customization field for full-set products (vehicle lives in configurator)
    qsa(document, '.line-item-property__field').forEach(function (field) {
      var label = field.querySelector('label');
      var text = label ? String(label.textContent || '').toLowerCase() : '';
      if (/year\s*make|vehicle/.test(text)) {
        field.classList.add('ff-pdp-config-hidden-tech');
        field.hidden = true;
        var input = field.querySelector('input, textarea');
        if (input) {
          input.removeAttribute('required');
          input.disabled = true;
        }
      }
    });
  }

  function boot() {
    qsa(document, '[data-ff-pdp-config]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
  document.addEventListener('shopify:section:load', boot);
})();
