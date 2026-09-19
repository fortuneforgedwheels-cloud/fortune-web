/**
 * Fortune Forged PDP direct-purchase configurator.
 * Two paths: Leave it to a professional | Customize my specs
 * Scope: product page ATC only. Does not touch quote form / QuoteSubmitted.
 */
(function () {
  'use strict';
  if (window.__ffPdpConfigBoot) return;
  window.__ffPdpConfigBoot = true;

  var PLUG = "PLUG N' PLAY || KEEP OEM SPECS";
  var DEFAULT_DIAMS = [17, 18, 19, 20, 21, 22];

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
        var matches = String(part).match(/(1[5-9]|2[0-4])/g);
        if (!matches) return;
        matches.forEach(function (m) {
          var n = parseInt(m, 10);
          if (out.indexOf(n) === -1) out.push(n);
        });
      });
    out.sort(function (a, b) {
      return a - b;
    });
    return out;
  }

  function diamLabel(n) {
    return n + '"';
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
    return [v.year, v.make, v.model]
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
    var color = null;
    var centerCap = null;
    var finishBlocks = [];

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
      else if (/center\s*cap|centre\s*cap/.test(label) && !centerCap) centerCap = select;
      else if (/color|colour|finish/.test(label) && !color) color = select;
    }

    qsa(document, 'select').forEach(classify);

    qsa(document, 'fieldset.product-form__input, variant-radios fieldset, .productView-variants fieldset').forEach(
      function (fs) {
        var legend = fs.querySelector('legend, .form__label');
        var text = legend ? String(legend.textContent || '').toLowerCase() : '';
        if (/diameter|size|fitment/.test(text)) diameterNative.push(fs);
        if (/color|colour|finish|center\s*cap|centre\s*cap/.test(text)) finishBlocks.push(fs);
      }
    );

    return {
      width: width,
      offset: offset,
      lug: lug,
      diameterNative: diameterNative,
      color: color,
      centerCap: centerCap,
      finishBlocks: finishBlocks,
    };
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
    if (wrap) {
      wrap.hidden = !!hidden;
      wrap.classList.toggle('ff-pdp-config-hidden-tech', !!hidden);
    }
    // Option tiles render an accordion sibling after the native select
    var sibling = el.nextElementSibling;
    if (sibling && sibling.classList && sibling.classList.contains('ff-option-acc')) {
      sibling.hidden = !!hidden;
      sibling.classList.toggle('ff-pdp-config-hidden-tech', !!hidden);
    }
    el.hidden = !!hidden;
    el.classList.toggle('ff-pdp-config-hidden-tech', !!hidden);
  }

  function selectDiameterVariant(root, maxDiam) {
    var productView = root.closest('.productView') || document;
    var radios = qsa(productView, 'input.product-form__radio');
    var label = diamLabel(maxDiam);
    var hit = radios.find(function (r) {
      var val = String(r.value).replace(/\s/g, '');
      return (
        val === label.replace(/\s/g, '') ||
        val.indexOf(String(maxDiam)) === 0 ||
        val.indexOf(String(maxDiam) + '/') !== -1 ||
        new RegExp('\\b' + maxDiam + '\\b').test(String(r.value))
      );
    });
    if (hit && !hit.checked) {
      hit.checked = true;
      hit.dispatchEvent(new Event('change', { bubbles: true }));
      hit.click();
      return true;
    }
    var selects = qsa(productView, 'select.select__select, variant-selects select, select');
    for (var i = 0; i < selects.length; i++) {
      var sel = selects[i];
      var wrap = sel.closest('.product-form__input') || sel.closest('[class*="bcpo"]') || sel.parentElement;
      var lab = wrap && wrap.querySelector('.form__label, label, .bcpo-title, .bcpo-front-dd-label, legend');
      var t = lab ? String(lab.textContent || '').toLowerCase() : '';
      var name = String(sel.getAttribute('name') || '').toLowerCase();
      if (!/diameter|size|fitment/.test(t + ' ' + name) && selects.length > 1) continue;
      for (var j = 0; j < sel.options.length; j++) {
        var opt = sel.options[j];
        var hay = String(opt.value) + ' ' + String(opt.textContent);
        if (new RegExp('\\b' + maxDiam + '\\b').test(hay) || hay.indexOf(String(maxDiam)) !== -1) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
    }
    return false;
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var form =
      root.closest('form[action*="/cart/add"]') ||
      document.querySelector('form[data-type="add-to-cart-form"]') ||
      document.querySelector('form[action*="/cart/add"]');

    var prop = {
      buildPath: qs(document, '[data-ff-prop-build-path]'),
      vehicle: qs(document, '[data-ff-prop-vehicle]'),
      wheelSize: qs(document, '[data-ff-prop-wheel-size]'),
      frontDiam: qs(document, '[data-ff-prop-front-diam]'),
      rearDiam: qs(document, '[data-ff-prop-rear-diam]'),
      layout: qs(document, '[data-ff-prop-layout]'),
      method: qs(document, '[data-ff-prop-fitment-method]'),
      frontSpec: qs(document, '[data-ff-prop-front-spec]'),
      rearSpec: qs(document, '[data-ff-prop-rear-spec]'),
    };

    var pathChooser = qs(root, '[data-ff-path-chooser]');
    var flow = qs(root, '[data-ff-flow]');
    var proPanel = qs(root, '[data-ff-pro-panel]');
    var customPanel = qs(root, '[data-ff-custom-panel]');
    var vehicleDisplay = qs(root, '[data-ff-vehicle-display]');
    var vehicleForm = qs(root, '[data-ff-vehicle-form]');
    var vehicleLabel = qs(root, '[data-ff-vehicle-label]');
    var vehicleError = qs(root, '[data-ff-vehicle-error]');
    var diamError = qs(root, '[data-ff-diam-error]');
    var customError = qs(root, '[data-ff-custom-error]');
    var diametersEl = qs(root, '[data-ff-diameters]');
    var frontDiamSel = qs(root, '[data-ff-front-diam]');
    var rearDiamSel = qs(root, '[data-ff-rear-diam]');

    var state = {
      path: null,
      vehicle: null,
      diameter: null,
      layout: 'Staggered',
      frontDiam: null,
      rearDiam: null,
    };

    var parsed = parseDiameters(root.getAttribute('data-ff-diameters'));
    var available = DEFAULT_DIAMS.filter(function (d) {
      return !parsed.length || parsed.indexOf(d) !== -1;
    });
    if (!available.length) available = DEFAULT_DIAMS.slice();

    function readVehicleFromInputs() {
      return {
        year: String((qs(root, '[data-ff-year]') || {}).value || '').trim(),
        make: String((qs(root, '[data-ff-make]') || {}).value || '').trim(),
        model: String((qs(root, '[data-ff-model]') || {}).value || '').trim(),
      };
    }

    function persistVehicle(v) {
      try {
        sessionStorage.setItem(
          'ffVehicleSelection',
          JSON.stringify({
            year: v.year,
            make: v.make,
            model: v.model,
            source: 'product-page',
          })
        );
      } catch (e) {}
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

    function syncVehicleFromInputs(commitDisplay) {
      var v = readVehicleFromInputs();
      if (v.year && v.make && v.model) {
        persistVehicle(v);
        if (commitDisplay) showVehicle(v);
        else {
          state.vehicle = v;
          syncProps();
        }
      } else {
        state.vehicle = null;
        syncProps();
      }
    }

    function syncTechOptions() {
      var opts = findOptionSelects();
      var pathChosen = !!state.path;

      opts.diameterNative.forEach(function (fs) {
        fs.classList.add('ff-pdp-config-hidden-tech');
        fs.hidden = true;
      });

      // Always force Plug N' Play on tech options — specs live in our UI / cart props
      setSelectValue(opts.width, PLUG);
      setSelectValue(opts.offset, PLUG);
      setSelectValue(opts.lug, PLUG);
      setWrapperHidden(opts.width, true);
      setWrapperHidden(opts.offset, true);
      setWrapperHidden(opts.lug, true);

      // Hide finish / center cap until a build path is chosen
      setWrapperHidden(opts.color, !pathChosen);
      setWrapperHidden(opts.centerCap, !pathChosen);
      opts.finishBlocks.forEach(function (fs) {
        if (pathChosen) {
          fs.classList.remove('ff-pdp-config-hidden-tech');
          fs.hidden = false;
        } else {
          fs.classList.add('ff-pdp-config-hidden-tech');
          fs.hidden = true;
        }
      });

      // Hide BCPO / option-tile accordions for tech options by trigger label
      qsa(document, '.ff-option-acc').forEach(function (wrap) {
        if (wrap.closest('[data-ff-pdp-config]')) return;
        var lab = wrap.querySelector('.ff-option-acc__label, .bcpo-title, legend, .form__label');
        var text = lab ? String(lab.textContent || '').toLowerCase() : '';
        if (!text) return;
        var isFinish = /color|colour|finish|center\s*cap|centre\s*cap/.test(text);
        var isTech = /width|offset|lug|bolt\s*pattern|diameter|size|fitment|lead\s*time/.test(text);
        if (isFinish) {
          wrap.classList.toggle('ff-pdp-config-hidden-tech', !pathChosen);
          wrap.hidden = !pathChosen;
        } else if (isTech) {
          wrap.classList.add('ff-pdp-config-hidden-tech');
          wrap.hidden = true;
        }
      });
    }

    function syncProps() {
      var vehicleText = formatVehicle(state.vehicle);
      if (prop.vehicle) prop.vehicle.value = vehicleText;

      if (state.path === 'pro') {
        if (prop.buildPath) prop.buildPath.value = 'Leave it to a professional';
        if (prop.method) prop.method.value = 'Fitment Specialist';
        if (prop.layout) prop.layout.value = state.layout || 'Square';
        if (state.diameter != null) {
          var sizeLabel = diamLabel(state.diameter) + ' · ' + (state.layout || 'Square');
          if (prop.wheelSize) prop.wheelSize.value = sizeLabel;
          if (prop.frontDiam) prop.frontDiam.value = diamLabel(state.diameter);
          if (prop.rearDiam) prop.rearDiam.value = diamLabel(state.diameter);
        } else {
          if (prop.wheelSize) prop.wheelSize.value = '';
          if (prop.frontDiam) prop.frontDiam.value = '';
          if (prop.rearDiam) prop.rearDiam.value = '';
        }
        if (prop.frontSpec) {
          prop.frontSpec.value = '';
          prop.frontSpec.disabled = true;
        }
        if (prop.rearSpec) {
          prop.rearSpec.value = '';
          prop.rearSpec.disabled = true;
        }
      } else if (state.path === 'custom') {
        if (prop.buildPath) prop.buildPath.value = 'Customize my specs';
        if (prop.method) prop.method.value = 'Customer-Specified';
        if (prop.layout) prop.layout.value = '';

        var fd = state.frontDiam;
        var rd = state.rearDiam;
        var fw = String((qs(root, '[data-ff-front-width]') || {}).value || '').trim();
        var fo = String((qs(root, '[data-ff-front-offset]') || {}).value || '').trim();
        var rw = String((qs(root, '[data-ff-rear-width]') || {}).value || '').trim();
        var ro = String((qs(root, '[data-ff-rear-offset]') || {}).value || '').trim();

        if (fd != null && rd != null) {
          if (prop.wheelSize) prop.wheelSize.value = diamLabel(fd) + ' Front / ' + diamLabel(rd) + ' Rear';
          if (prop.frontDiam) prop.frontDiam.value = diamLabel(fd);
          if (prop.rearDiam) prop.rearDiam.value = diamLabel(rd);
        } else {
          if (prop.wheelSize) prop.wheelSize.value = '';
          if (prop.frontDiam) prop.frontDiam.value = '';
          if (prop.rearDiam) prop.rearDiam.value = '';
        }

        var frontSpec = fd != null ? diamLabel(fd) + (fw ? ' × ' + fw : '') + (fo ? ' ET' + fo : '') : '';
        var rearSpec = rd != null ? diamLabel(rd) + (rw ? ' × ' + rw : '') + (ro ? ' ET' + ro : '') : '';
        if (prop.frontSpec) {
          prop.frontSpec.value = frontSpec;
          prop.frontSpec.disabled = !frontSpec;
        }
        if (prop.rearSpec) {
          prop.rearSpec.value = rearSpec;
          prop.rearSpec.disabled = !rearSpec;
        }
        if (prop.layout) prop.layout.disabled = true;
      } else {
        if (prop.buildPath) prop.buildPath.value = '';
        if (prop.method) prop.method.value = '';
        if (prop.layout) {
          prop.layout.value = '';
          prop.layout.disabled = false;
        }
      }

      if (prop.layout && state.path === 'pro') prop.layout.disabled = false;
    }

    function renderDiameters() {
      if (!diametersEl) return;
      diametersEl.innerHTML = '';
      available.forEach(function (d) {
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ff-pdp-config__diam';
        btn.setAttribute('role', 'listitem');
        btn.setAttribute('data-diam', String(d));
        btn.textContent = diamLabel(d);
        btn.addEventListener('click', function () {
          selectDiameter(d, btn);
        });
        diametersEl.appendChild(btn);
      });
    }

    function populateCustomDiamSelects() {
      [frontDiamSel, rearDiamSel].forEach(function (sel) {
        if (!sel) return;
        var current = sel.value;
        sel.innerHTML = '<option value="">Select</option>';
        available.forEach(function (d) {
          var opt = document.createElement('option');
          opt.value = String(d);
          opt.textContent = diamLabel(d);
          sel.appendChild(opt);
        });
        if (current) sel.value = current;
      });
    }

    function selectDiameter(d, btn) {
      state.diameter = d;
      if (diametersEl) {
        qsa(diametersEl, '.ff-pdp-config__diam').forEach(function (el) {
          el.classList.toggle('is-selected', el === btn || Number(el.getAttribute('data-diam')) === d);
        });
      }
      if (diamError) diamError.hidden = true;
      selectDiameterVariant(root, d);
      syncProps();
      syncTechOptions();
    }

    function setPath(path) {
      state.path = path;
      if (pathChooser) pathChooser.hidden = true;
      if (flow) flow.hidden = false;
      if (proPanel) proPanel.hidden = path !== 'pro';
      if (customPanel) customPanel.hidden = path !== 'custom';

      qsa(root, '[data-ff-path]').forEach(function (btn) {
        btn.classList.toggle('is-active', btn.getAttribute('data-ff-path') === path);
      });

      if (path === 'pro' && state.diameter == null && available.length) {
        // no default — force intentional pick
      }
      if (path === 'custom') {
        populateCustomDiamSelects();
      }

      syncTechOptions();
      syncProps();
      root.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function resetPath() {
      state.path = null;
      state.diameter = null;
      state.frontDiam = null;
      state.rearDiam = null;
      if (pathChooser) pathChooser.hidden = false;
      if (flow) flow.hidden = true;
      if (proPanel) proPanel.hidden = true;
      if (customPanel) customPanel.hidden = true;
      if (diametersEl) {
        qsa(diametersEl, '.ff-pdp-config__diam').forEach(function (el) {
          el.classList.remove('is-selected');
        });
      }
      syncTechOptions();
      syncProps();
    }

    // Path chooser
    qsa(root, '[data-ff-path]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setPath(btn.getAttribute('data-ff-path'));
      });
    });
    var resetBtn = qs(root, '[data-ff-path-reset]');
    if (resetBtn) resetBtn.addEventListener('click', resetPath);

    // Layout radios
    qsa(root, '[data-ff-layout]').forEach(function (input) {
      input.addEventListener('change', function () {
        if (!input.checked) return;
        state.layout = input.value;
        syncProps();
      });
    });
    var checkedLayout = qs(root, '[data-ff-layout]:checked');
    if (checkedLayout) state.layout = checkedLayout.value;

    // Custom front/rear
    function onCustomChange() {
      var fd = (frontDiamSel && frontDiamSel.value) || '';
      var rd = (rearDiamSel && rearDiamSel.value) || '';
      state.frontDiam = fd ? parseInt(fd, 10) : null;
      state.rearDiam = rd ? parseInt(rd, 10) : null;
      var max = Math.max(state.frontDiam || 0, state.rearDiam || 0);
      if (max) selectDiameterVariant(root, max);
      if (customError) customError.hidden = true;
      syncProps();
      syncTechOptions();
    }
    if (frontDiamSel) frontDiamSel.addEventListener('change', onCustomChange);
    if (rearDiamSel) rearDiamSel.addEventListener('change', onCustomChange);
    qsa(root, '[data-ff-front-width], [data-ff-front-offset], [data-ff-rear-width], [data-ff-rear-offset]').forEach(
      function (input) {
        input.addEventListener('input', function () {
          if (customError) customError.hidden = true;
          syncProps();
        });
      }
    );

    // Vehicle bootstrap
    var stored = readStoredVehicle();
    if (stored) {
      qs(root, '[data-ff-year]') && (qs(root, '[data-ff-year]').value = stored.year || '');
      qs(root, '[data-ff-make]') && (qs(root, '[data-ff-make]').value = stored.make || '');
      qs(root, '[data-ff-model]') && (qs(root, '[data-ff-model]').value = stored.model || '');
      showVehicle({
        year: stored.year || '',
        make: stored.make || '',
        model: stored.model || '',
      });
    }

    qsa(root, '[data-ff-year], [data-ff-make], [data-ff-model]').forEach(function (input) {
      input.addEventListener('input', function () {
        if (vehicleError) vehicleError.hidden = true;
        syncVehicleFromInputs(false);
      });
      input.addEventListener('blur', function () {
        syncVehicleFromInputs(true);
      });
    });

    var changeBtn = qs(root, '[data-ff-vehicle-change]');
    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        if (vehicleDisplay) vehicleDisplay.hidden = true;
        if (vehicleForm) vehicleForm.hidden = false;
      });
    }

    renderDiameters();
    populateCustomDiamSelects();
    syncTechOptions();
    syncProps();

    // Re-hide tech options when VO/BCPO / option tiles inject late
    var syncScheduled = false;
    var obs = new MutationObserver(function () {
      if (syncScheduled) return;
      syncScheduled = true;
      requestAnimationFrame(function () {
        syncScheduled = false;
        syncTechOptions();
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    function validateBeforeAdd(event) {
      syncVehicleFromInputs(false);
      syncProps();
      var ok = true;

      if (!state.path) {
        ok = false;
        if (pathChooser) pathChooser.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      if (!formatVehicle(state.vehicle)) {
        ok = false;
        if (vehicleError) vehicleError.hidden = false;
        if (vehicleForm) vehicleForm.hidden = false;
        if (vehicleDisplay) vehicleDisplay.hidden = true;
      }

      if (state.path === 'pro') {
        if (state.diameter == null) {
          ok = false;
          if (diamError) diamError.hidden = false;
        }
      }

      if (state.path === 'custom') {
        var fw = String((qs(root, '[data-ff-front-width]') || {}).value || '').trim();
        var fo = String((qs(root, '[data-ff-front-offset]') || {}).value || '').trim();
        var rw = String((qs(root, '[data-ff-rear-width]') || {}).value || '').trim();
        var ro = String((qs(root, '[data-ff-rear-offset]') || {}).value || '').trim();
        if (
          state.frontDiam == null ||
          state.rearDiam == null ||
          !fw ||
          !fo ||
          !rw ||
          !ro
        ) {
          ok = false;
          if (customError) customError.hidden = false;
        }
      }

      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        root.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      var opts = findOptionSelects();
      setSelectValue(opts.width, PLUG);
      setSelectValue(opts.offset, PLUG);
      setSelectValue(opts.lug, PLUG);
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

    // Hide legacy theme YMM customization field (vehicle lives in configurator)
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
