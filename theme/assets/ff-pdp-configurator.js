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
  var DEFAULT_WIDTHS = [
    '8"',
    '8.5"',
    '9"',
    '9.5"',
    '10"',
    '10.5"',
    '11"',
    '11.5"',
    '12"',
    '12.5"',
    '13"',
    '13.5"',
    '14"',
  ];
  var DEFAULT_OFFSETS = [
    '+5',
    '+8',
    '+10',
    '+12',
    '+15',
    '+20',
    '+22',
    '+25',
    '+30',
    '+32',
    '+35',
    '+38',
    '+40',
    '+45',
    '+50',
  ];

  function qs(root, sel) {
    return root.querySelector(sel);
  }
  function qsa(root, sel) {
    return Array.prototype.slice.call(root.querySelectorAll(sel));
  }

  function usableBcpoOptions(select) {
    if (!select || !select.options) return [];
    var out = [];
    Array.prototype.forEach.call(select.options, function (opt) {
      var text = String(opt.textContent || '')
        .replace(/\s+/g, ' ')
        .trim();
      var val = String(opt.value || '').trim();
      if (!val && !text) return;
      if (/^choose one|^select/i.test(text)) return;
      if (/^\^\^/.test(text) || /^\^\^/.test(val)) return;
      if (/plug\s*n/i.test(text) || /keep oem/i.test(text)) return;
      out.push({ value: val || text, label: text || val });
    });
    return out;
  }

  function fillSelect(select, items, placeholder) {
    if (!select) return;
    var current = select.value;
    select.innerHTML = '';
    var blank = document.createElement('option');
    blank.value = '';
    blank.textContent = placeholder || 'Select';
    select.appendChild(blank);
    (items || []).forEach(function (item) {
      var opt = document.createElement('option');
      if (typeof item === 'string') {
        opt.value = item;
        opt.textContent = item;
      } else {
        opt.value = item.value;
        opt.textContent = item.label;
      }
      select.appendChild(opt);
    });
    if (current) select.value = current;
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
    var faceColor = null;
    var lipColor = null;
    var hardwareColor = null;
    var hardwareInput = null;
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
      var labelLow = label.toLowerCase();
      var nameAttr = String(select.getAttribute('name') || '').toLowerCase();
      if (/width/.test(labelLow) && !width) width = select;
      else if (/offset|et\b/.test(labelLow) && !offset) offset = select;
      else if (/lug|bolt\s*pattern|pcd/.test(labelLow) && !lug) lug = select;
      else if ((/center\s*cap|centre\s*cap/.test(labelLow) || nameAttr === 'name1') && !centerCap) centerCap = select;
      else if (/face\s*color|face\s*finish|properties\[face/.test(labelLow) && !faceColor) faceColor = select;
      else if (/lip\s*\/?\s*barrel|lip\s*color|lip\s*finish|barrel\s*color|barrel\s*finish|ring\s*color/.test(labelLow) && !lipColor)
        lipColor = select;
      else if (/hardware/.test(labelLow) && !hardwareColor) hardwareColor = select;
      else if (
        !color &&
        !/face|lip|barrel|ring|hardware/.test(labelLow) &&
        (/color|colour|finish/.test(labelLow) || nameAttr.indexOf('color') !== -1)
      )
        color = select;
    }

    qsa(document, 'select').forEach(classify);

    // HARDWARE COLOR is often a BCPO text input, not a select
    qsa(document, 'input[type="text"], input:not([type]), textarea').forEach(function (input) {
      if (hardwareInput) return;
      var name = String(input.getAttribute('name') || '').toLowerCase();
      var wrap =
        input.closest('.selector-wrapper') ||
        input.closest('[class*="bcpo"]') ||
        input.closest('.line-item-property__field') ||
        input.parentElement;
      var lab = wrap && wrap.querySelector('.bcpo-title, .bcpo-front-dd-label, .bcpo-label, label, .form__label');
      var label = ((lab && lab.textContent) || '') + ' ' + name;
      if (/hardware/.test(label.toLowerCase()) || name.indexOf('hardware') !== -1) {
        hardwareInput = input;
      }
    });

    qsa(document, 'fieldset.product-form__input, variant-radios fieldset, .productView-variants fieldset').forEach(
      function (fs) {
        var legend = fs.querySelector('legend, .form__label');
        var text = legend ? String(legend.textContent || '').toLowerCase() : '';
        if (/diameter|size|fitment/.test(text)) diameterNative.push(fs);
        if (/color|colour|finish|center\s*cap|centre\s*cap|hardware|lip|face/.test(text)) finishBlocks.push(fs);
      }
    );

    return {
      width: width,
      offset: offset,
      lug: lug,
      diameterNative: diameterNative,
      color: color,
      faceColor: faceColor,
      lipColor: lipColor,
      hardwareColor: hardwareColor,
      hardwareInput: hardwareInput,
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
      faceFinish: qs(document, '[data-ff-prop-face-finish]'),
      lipFinish: qs(document, '[data-ff-prop-lip-finish]'),
      hardwareFinish: qs(document, '[data-ff-prop-hardware-finish]'),
      finish: qs(document, '[data-ff-prop-finish]'),
    };

    var isTwoPiece = root.getAttribute('data-ff-kind') === 'two-piece';
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
    var finishError = qs(root, '[data-ff-finish-error]');
    var diametersEl = qs(root, '[data-ff-diameters]');
    var frontDiamSel = qs(root, '[data-ff-front-diam]');
    var rearDiamSel = qs(root, '[data-ff-rear-diam]');
    var frontWidthSel = qs(root, '[data-ff-front-width]');
    var rearWidthSel = qs(root, '[data-ff-rear-width]');
    var frontOffsetSel = qs(root, '[data-ff-front-offset]');
    var rearOffsetSel = qs(root, '[data-ff-rear-offset]');
    var finishSel = qs(root, '[data-ff-finish]');
    var faceFinishSel = qs(root, '[data-ff-face-finish]');
    var lipFinishSel = qs(root, '[data-ff-lip-finish]');
    var hardwareFinishSel = qs(root, '[data-ff-hardware-finish]');
    var centerCapSel = qs(root, '[data-ff-center-cap]');
    var finishPopulated = false;
    var widthOffsetPopulated = false;

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

      // Always hide native diameter fieldsets — we drive diameter from our UI
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

      // Native finish / center cap always hidden — we mirror them in-flow
      setWrapperHidden(opts.color, true);
      setWrapperHidden(opts.faceColor, true);
      setWrapperHidden(opts.lipColor, true);
      setWrapperHidden(opts.hardwareColor, true);
      setWrapperHidden(opts.hardwareInput, true);
      setWrapperHidden(opts.centerCap, true);

      // Hide BCPO / option-tile / variant wrappers by label
      qsa(document, '.ff-option-acc, .selector-wrapper, [class*="bcpo"] fieldset, fieldset.product-form__input').forEach(
        function (wrap) {
          if (wrap.closest('[data-ff-pdp-config]')) return;
          var lab = wrap.querySelector(
            '.ff-option-acc__label, .bcpo-title, .bcpo-front-dd-label, legend, .form__label, label'
          );
          var text = lab ? String(lab.textContent || '').toLowerCase() : '';
          if (!text) {
            text = String(wrap.textContent || '')
              .toLowerCase()
              .replace(/\s+/g, ' ')
              .slice(0, 40);
          }
          if (
            /color|colour|finish|center\s*cap|centre\s*cap|hardware|lip|face|barrel/.test(text) &&
            !/width|offset|diameter|lug/.test(text)
          ) {
            wrap.classList.add('ff-pdp-config-hidden-tech');
            wrap.hidden = true;
          } else if (
            /width|offset|lug|bolt\s*pattern|diameter|size|fitment|year\s*\/\s*make|year\/make/.test(text)
          ) {
            wrap.classList.add('ff-pdp-config-hidden-tech');
            wrap.hidden = true;
          }
        }
      );

      // Also hide BCPO / native diameter select hosts (not the whole .bcpo app root)
      qsa(document, 'select[name="vopo-id"], select[name="name0"]').forEach(function (sel) {
        if (sel.closest('[data-ff-pdp-config]')) return;
        setWrapperHidden(sel, true);
      });
      qsa(document, 'fieldset.product-form__input').forEach(function (fs) {
        if (fs.closest('[data-ff-pdp-config]')) return;
        var legend = fs.querySelector('legend, .form__label');
        var text = legend ? String(legend.textContent || '').toLowerCase() : '';
        if (/diameter|size|fitment/.test(text)) {
          fs.classList.add('ff-pdp-config-hidden-tech');
          fs.hidden = true;
        }
      });

      // Lead time stays available after path chosen (required BCPO)
      qsa(document, '.selector-wrapper, .ff-option-acc').forEach(function (wrap) {
        if (wrap.closest('[data-ff-pdp-config]')) return;
        var lab = wrap.querySelector('.ff-option-acc__label, .bcpo-title, legend, .form__label, label');
        var text = lab ? String(lab.textContent || '').toLowerCase() : '';
        if (/lead\s*time/.test(text)) {
          wrap.classList.toggle('ff-pdp-config-hidden-tech', !pathChosen);
          wrap.hidden = !pathChosen;
        }
      });

      // Hide legacy year/make/model BCPO UI, but keep the input enabled and synced
      qsa(document, '.selector-wrapper, [class*="bcpo"] .bcpo-field, .line-item-property__field').forEach(
        function (wrap) {
          if (wrap.closest('[data-ff-pdp-config]')) return;
          var text = String(wrap.textContent || '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .slice(0, 40);
          if (/year\s*\/\s*make|year\/make|year.*make.*model/.test(text)) {
            wrap.classList.add('ff-pdp-config-hidden-tech');
            wrap.hidden = true;
          }
        }
      );
      qsa(document, 'input[name="properties[year/make/model]"], input[name="properties[Year/Make/Model]"]').forEach(
        function (input) {
          input.disabled = false;
          input.removeAttribute('disabled');
          input.removeAttribute('required');
          var wrap =
            input.closest('.selector-wrapper') ||
            input.closest('[class*="bcpo"]') ||
            input.closest('.line-item-property__field') ||
            input.parentElement;
          if (wrap && !wrap.closest('[data-ff-pdp-config]')) {
            wrap.classList.add('ff-pdp-config-hidden-tech');
            wrap.hidden = true;
          }
        }
      );
    }

    function syncBcpoVehicleField(vehicleText) {
      var text = String(vehicleText || '').trim();
      qsa(document, 'input[name="properties[year/make/model]"], input[name="properties[Year/Make/Model]"], textarea[name="properties[year/make/model]"]').forEach(
        function (input) {
          input.disabled = false;
          input.removeAttribute('disabled');
          input.value = text;
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      );
    }

    function ensureLeadTimeSelected() {
      var lead = document.querySelector('select[name="properties[LEAD TIME PREFERENCE]"]');
      if (!lead) return;
      if (String(lead.value || '').trim()) return;
      for (var i = 0; i < lead.options.length; i++) {
        var opt = lead.options[i];
        var val = String(opt.value || '').trim();
        var label = String(opt.textContent || '').trim();
        if (!val) continue;
        if (/^choose|^select/i.test(label)) continue;
        lead.value = opt.value;
        lead.dispatchEvent(new Event('change', { bubbles: true }));
        lead.dispatchEvent(new Event('input', { bubbles: true }));
        break;
      }
    }

    function syncProps() {
      var vehicleText = formatVehicle(state.vehicle);
      if (prop.vehicle) prop.vehicle.value = vehicleText;
      syncBcpoVehicleField(vehicleText);

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

      // Finish cart properties (customer-facing)
      var faceVal = faceFinishSel ? String(faceFinishSel.value || '').trim() : '';
      var lipVal = lipFinishSel ? String(lipFinishSel.value || '').trim() : '';
      var hwVal = hardwareFinishSel ? String(hardwareFinishSel.value || '').trim() : '';
      var monoFinishVal = finishSel ? String(finishSel.value || '').trim() : '';
      if (prop.faceFinish) {
        prop.faceFinish.value = isTwoPiece ? faceVal : '';
        prop.faceFinish.disabled = !(isTwoPiece && faceVal);
      }
      if (prop.lipFinish) {
        prop.lipFinish.value = isTwoPiece ? lipVal : '';
        prop.lipFinish.disabled = !(isTwoPiece && lipVal);
      }
      if (prop.hardwareFinish) {
        prop.hardwareFinish.value = isTwoPiece ? hwVal : '';
        prop.hardwareFinish.disabled = !(isTwoPiece && hwVal);
      }
      if (prop.finish) {
        prop.finish.value = isTwoPiece ? '' : monoFinishVal;
        prop.finish.disabled = isTwoPiece || !monoFinishVal;
      }
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

    function populateWidthOffsetSelects() {
      var opts = findOptionSelects();
      var widths = usableBcpoOptions(opts.width);
      var offsets = usableBcpoOptions(opts.offset);
      if (!widths.length) widths = DEFAULT_WIDTHS.map(function (w) { return { value: w, label: w }; });
      if (!offsets.length) offsets = DEFAULT_OFFSETS.map(function (o) { return { value: o, label: o }; });
      fillSelect(frontWidthSel, widths, 'Select');
      fillSelect(rearWidthSel, widths, 'Select');
      fillSelect(frontOffsetSel, offsets, 'Select');
      fillSelect(rearOffsetSel, offsets, 'Select');
      widthOffsetPopulated = true;
    }

    function populateFinishSelects() {
      var opts = findOptionSelects();
      var caps = usableBcpoOptions(opts.centerCap);

      if (isTwoPiece) {
        var faces = usableBcpoOptions(opts.faceColor);
        var lips = usableBcpoOptions(opts.lipColor);
        if (faces.length && faceFinishSel) fillSelect(faceFinishSel, faces, 'Select face finish');
        if (lips.length && lipFinishSel) fillSelect(lipFinishSel, lips, 'Select lip finish');
        // Hardware is a BCPO text field — keep existing Silver/Black/Hidden options
        if (caps.length) fillSelect(centerCapSel, caps, 'Select center cap');
        if (faces.length || lips.length || caps.length) finishPopulated = true;
      } else {
        var colors = usableBcpoOptions(opts.color);
        if (colors.length) fillSelect(finishSel, colors, 'Select finish');
        if (caps.length) fillSelect(centerCapSel, caps, 'Select center cap');
        if (colors.length || caps.length) finishPopulated = true;
      }
      syncFinishToNative();
    }

    function syncFinishToNative() {
      var opts = findOptionSelects();
      if (isTwoPiece) {
        var faceVal = faceFinishSel ? String(faceFinishSel.value || '').trim() : '';
        var lipVal = lipFinishSel ? String(lipFinishSel.value || '').trim() : '';
        var hwVal = hardwareFinishSel ? String(hardwareFinishSel.value || '').trim() : '';
        if (faceVal && opts.faceColor) setSelectValue(opts.faceColor, faceVal);
        if (lipVal && opts.lipColor) setSelectValue(opts.lipColor, lipVal);
        if (hwVal) {
          if (opts.hardwareColor && opts.hardwareColor.tagName === 'SELECT') {
            setSelectValue(opts.hardwareColor, hwVal);
          }
          if (opts.hardwareInput) {
            opts.hardwareInput.disabled = false;
            opts.hardwareInput.removeAttribute('disabled');
            opts.hardwareInput.removeAttribute('required');
            if (opts.hardwareInput.value !== hwVal) {
              opts.hardwareInput.value = hwVal;
              opts.hardwareInput.dispatchEvent(new Event('input', { bubbles: true }));
              opts.hardwareInput.dispatchEvent(new Event('change', { bubbles: true }));
            }
          }
        }
      } else {
        var finishVal = finishSel ? String(finishSel.value || '').trim() : '';
        if (finishVal && opts.color) setSelectValue(opts.color, finishVal);
      }
      var capVal = centerCapSel ? String(centerCapSel.value || '').trim() : '';
      if (capVal && opts.centerCap) setSelectValue(opts.centerCap, capVal);
      syncProps();
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
        if (!widthOffsetPopulated) populateWidthOffsetSelects();
      }
      if (!finishPopulated) populateFinishSelects();

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
        input.addEventListener('change', function () {
          if (customError) customError.hidden = true;
          syncProps();
        });
      }
    );

    function onFinishChange() {
      if (finishError) finishError.hidden = true;
      syncFinishToNative();
    }
    if (finishSel) finishSel.addEventListener('change', onFinishChange);
    if (faceFinishSel) faceFinishSel.addEventListener('change', onFinishChange);
    if (lipFinishSel) lipFinishSel.addEventListener('change', onFinishChange);
    if (hardwareFinishSel) hardwareFinishSel.addEventListener('change', onFinishChange);
    if (centerCapSel) centerCapSel.addEventListener('change', onFinishChange);

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
    populateWidthOffsetSelects();
    populateFinishSelects();
    syncTechOptions();
    syncProps();

    // Re-hide tech options when VO/BCPO / option tiles inject late
    var syncScheduled = false;
    var obs = new MutationObserver(function () {
      if (syncScheduled) return;
      syncScheduled = true;
      requestAnimationFrame(function () {
        syncScheduled = false;
        var opts = findOptionSelects();
        if (!finishPopulated) {
          var ready = isTwoPiece
            ? usableBcpoOptions(opts.faceColor).length ||
              usableBcpoOptions(opts.lipColor).length ||
              usableBcpoOptions(opts.centerCap).length
            : usableBcpoOptions(opts.color).length || usableBcpoOptions(opts.centerCap).length;
          if (ready) populateFinishSelects();
        }
        if (!widthOffsetPopulated && (usableBcpoOptions(opts.width).length || usableBcpoOptions(opts.offset).length)) {
          populateWidthOffsetSelects();
        }
        syncTechOptions();
        syncFinishToNative();
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });

    function prepareBcpoForAdd() {
      syncVehicleFromInputs(false);
      syncProps();
      var opts = findOptionSelects();
      setSelectValue(opts.width, PLUG);
      setSelectValue(opts.offset, PLUG);
      setSelectValue(opts.lug, PLUG);
      syncFinishToNative();
      ensureLeadTimeSelected();
      syncBcpoVehicleField(formatVehicle(state.vehicle));
    }

    function validateBeforeAdd(event) {
      // Must run before BCPO's own capture handlers read required fields
      prepareBcpoForAdd();
      var ok = true;

      if (!state.path) {
        ok = false;
        if (pathChooser) {
          pathChooser.hidden = false;
          pathChooser.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
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

      var finishOk = false;
      var capVal = centerCapSel ? String(centerCapSel.value || '').trim() : '';
      if (isTwoPiece) {
        var faceVal = faceFinishSel ? String(faceFinishSel.value || '').trim() : '';
        var lipVal = lipFinishSel ? String(lipFinishSel.value || '').trim() : '';
        var hwVal = hardwareFinishSel ? String(hardwareFinishSel.value || '').trim() : '';
        finishOk = !!(faceVal && lipVal && hwVal && capVal);
      } else {
        var finishVal = finishSel ? String(finishSel.value || '').trim() : '';
        finishOk = !!(finishVal && capVal);
      }
      if (state.path && !finishOk) {
        ok = false;
        if (finishError) finishError.hidden = false;
      }

      if (!ok) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        root.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return false;
      }

      prepareBcpoForAdd();
      return true;
    }

    // window + capture so we sync BCPO required fields before the app's handlers
    window.addEventListener(
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

    // Hide legacy theme YMM customization field UI (vehicle lives in configurator)
    // Keep the input enabled so BCPO required validation + cart properties still work.
    qsa(document, '.line-item-property__field').forEach(function (field) {
      var label = field.querySelector('label');
      var text = label ? String(label.textContent || '').toLowerCase() : '';
      if (/year\s*make|vehicle/.test(text)) {
        field.classList.add('ff-pdp-config-hidden-tech');
        field.hidden = true;
        var input = field.querySelector('input, textarea');
        if (input) {
          input.removeAttribute('required');
          input.disabled = false;
        }
      }
    });
    qsa(document, 'input[name="properties[year/make/model]"]').forEach(function (input) {
      input.disabled = false;
      input.removeAttribute('disabled');
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
