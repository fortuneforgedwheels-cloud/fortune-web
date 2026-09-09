(function () {
  var DEFAULT_DIAMETERS = [17, 18, 19, 20, 21, 22];
  var DEFAULT_WIDTHS = [8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13];
  var FINISH_GROUPS = [
    {
      label: 'Brushed Finishes',
      options: [
        'Brushed Silver', 'Brushed Bronze', 'Brushed Gold', 'Brushed Champagne',
        'Brushed Copper', 'Brushed Black', 'Brushed Gunmetal',
      ],
    },
    {
      label: 'Polished & Chrome Finishes',
      options: [
        'Standard Polished', 'Polished Gold', 'Polished Black', 'Triple Chrome', 'Black Chrome', '24K Gold Chrome',
      ],
    },
    {
      label: 'Gloss Powder Coat Finishes',
      options: [
        'Gloss Black', 'Gloss White', 'Gloss Silver', 'Gloss Gunmetal', 'Gloss Anthracite',
        'Gloss Bronze', 'Gloss Gold', 'Gloss Champagne', 'Gloss Titanium', 'Gloss Graphite',
        'Gloss Charcoal', 'Gloss Red', 'Gloss Blue', 'Gloss Green', 'Gloss Purple', 'Gloss Orange',
      ],
    },
    {
      label: 'Satin Powder Coat Finishes',
      options: [
        'Satin Black', 'Satin White', 'Satin Silver', 'Satin Gunmetal', 'Satin Titanium',
        'Satin Graphite', 'Satin Bronze', 'Satin Gold', 'Satin Champagne', 'Satin Copper',
        'Satin Olive', 'Satin Red', 'Satin Blue',
      ],
    },
  ];
  var QUOTE_STEP = 7;

  function money(cents) {
    var n = Math.round(Number(cents) || 0) / 100;
    return '$' + n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  }

  function parseSizeToken(raw) {
    var s = String(raw || '')
      .trim()
      .replace(/["″''’]/g, '')
      .replace(/\s+/g, '');
    if (!s || /^default/i.test(s) || /^title$/i.test(s)) return null;
    var m = s.match(/^(\d+(?:\.\d+)?)[xX](\d+(?:\.\d+)?)/);
    if (m) {
      return { diameter: parseFloat(m[1]), width: parseFloat(m[2]) };
    }
    var d = parseFloat(s);
    if (!isNaN(d) && d >= 14 && d <= 30) return { diameter: d, width: null };
    return null;
  }

  function formatInch(value) {
    var n = Number(value);
    if (isNaN(n)) return '';
    return Number.isInteger(n) ? String(n) : String(n);
  }

  function isChromeFinish(name) {
    return /chrome/i.test(name || '');
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var state = {
      style: '',
      priceRange: '',
      wheelTitle: '',
      wheelHandle: '',
      wheelPrice: '',
      wheelPriceCents: 0,
      wheelUnit: 'wheel',
      variants: [],
      beadlockQty: '',
      frontDiameter: '',
      rearDiameter: '',
      frontWidth: '',
      rearWidth: '',
      frontPriceCents: 0,
      rearPriceCents: 0,
      finish: '',
      centerCap: '',
      centerCapPrice: 0,
      fitment: '',
      estimateCents: 0,
      estimateLabel: '',
    };

    var manual = root.querySelector('[name="ff_vehicle_manual"]');
    var ymm = root.querySelector('[name="contact[vehicle]"]');
    var designInput = root.querySelector('[name="contact[design]"]');
    var frontSizeInput = root.querySelector('[name="contact[front_size]"]');
    var rearSizeInput = root.querySelector('[name="contact[rear_size]"]');
    var finishInput = root.querySelector('[name="contact[finish]"]');
    var hiddenVehicle = root.querySelector('[id^="ff-selected-vehicle-"]');
    var hiddenStyle = root.querySelector('[id^="ff-selected-style-"]');
    var hiddenPrice = root.querySelector('[id^="ff-selected-price-"]');
    var helpPreference = root.querySelector('[id^="ff-help-preference-"]');
    var continueBtn = root.querySelector('[data-panel="1"] [data-next="2"]');
    var styleContinue = root.querySelector('[data-need-style]');
    var sizeContinue = root.querySelector('[data-need-size]');
    var finishContinue = root.querySelector('[data-need-finish]');
    var capContinue = root.querySelector('[data-need-cap]');
    var fitmentContinue = root.querySelector('[data-need-fitment]');
    var styleHint = root.querySelector('[data-style-hint]');
    var sizeHint = root.querySelector('[data-size-hint]');
    var finishHint = root.querySelector('[data-finish-hint]');
    var capHint = root.querySelector('[data-cap-hint]');
    var fitmentHint = root.querySelector('[data-fitment-hint]');
    var sizeNote = root.querySelector('[data-size-price-note]');
    var sizeEstimate = root.querySelector('[data-size-estimate]');
    var assistNote = root.querySelector('[data-assist-note]');
    var submitBtn = root.querySelector('[data-submit-label]');
    var submitHint = root.querySelector('[data-submit-hint]');
    var quoteForm = root.querySelector('form.ff-quote');
    var timelineValue = root.querySelector('[data-timeline-value]');
    var nowDiscountValue = root.querySelector('[data-now-discount-value]');
    var nowOffer = root.querySelector('[data-now-offer]');
    var nowDiscountCheck = root.querySelector('[data-now-discount]');
    var intentValue = root.querySelector('[data-intent-value]');
    var intentCheck = root.querySelector('[data-intent-check]');
    var summary = root.querySelector('[data-build-summary]');
    var summaryVehicle = root.querySelector('[data-summary-vehicle]');
    var summaryStyle = root.querySelector('[data-summary-style]');
    var summaryWheel = root.querySelector('[data-summary-wheel]');
    var summaryWheelRow = root.querySelector('[data-summary-wheel-row]');
    var summarySize = root.querySelector('[data-summary-size]');
    var summarySizeRow = root.querySelector('[data-summary-size-row]');
    var summaryFinish = root.querySelector('[data-summary-finish]');
    var summaryFinishRow = root.querySelector('[data-summary-finish-row]');
    var summaryCap = root.querySelector('[data-summary-cap]');
    var summaryCapRow = root.querySelector('[data-summary-cap-row]');
    var summaryFitment = root.querySelector('[data-summary-fitment]');
    var summaryFitmentRow = root.querySelector('[data-summary-fitment-row]');
    var summaryPrice = root.querySelector('[data-summary-price]');
    var wheelBrowser = root.querySelector('[data-wheel-browser]');
    var wheelBrowserTitle = root.querySelector('[data-wheel-browser-title]');
    var wheelSelected = root.querySelector('[data-wheel-selected]');
    var wheelSelectedLabel = root.querySelector('[data-wheel-selected-label]');
    var styleCards = root.querySelector('[data-style-cards]');
    var frontDiameterOptions = root.querySelector('[data-front-diameter-options]');
    var rearDiameterOptions = root.querySelector('[data-rear-diameter-options]');
    var frontWidthOptions = root.querySelector('[data-front-width-options]');
    var rearWidthOptions = root.querySelector('[data-rear-width-options]');
    var finishOptions = root.querySelector('[data-finish-options]');
    var beadlockQtyBlock = root.querySelector('[data-beadlock-qty]');
    var sizeSpecs = root.querySelector('[data-size-specs]');
    var frontSpecs = root.querySelector('[data-front-specs]');
    var rearSpecs = root.querySelector('[data-rear-specs]');
    var frontDiameterValue = root.querySelector('[data-front-diameter-value]');
    var rearDiameterValue = root.querySelector('[data-rear-diameter-value]');
    var frontWidthValue = root.querySelector('[data-front-width-value]');
    var rearWidthValue = root.querySelector('[data-rear-width-value]');
    var beadlockQtyValue = root.querySelector('[data-beadlock-qty-value]');
    var centerCapValue = root.querySelector('[data-center-cap-value]');
    var fitmentStyleValue = root.querySelector('[data-fitment-style-value]');
    var estimateValue = root.querySelector('[data-estimate-value]');
    var modal = root.querySelector('[data-ff-media-modal]');
    var modalDialog = root.querySelector('[data-ff-modal-dialog]');
    var modalThanks = root.querySelector('[data-ff-modal-thanks]');
    var modalActions = root.querySelector('.ff-media-modal__actions');
    var previousFocus = null;
    var hoverTimer = null;

    function setStep(n) {
      root.querySelectorAll('[data-step]').forEach(function (el) {
        var step = Number(el.getAttribute('data-step'));
        el.classList.toggle('is-active', step === n);
        el.classList.toggle('is-done', step < n);
      });
      root.querySelectorAll('[data-panel]').forEach(function (panel) {
        var match = Number(panel.getAttribute('data-panel')) === n;
        panel.hidden = !match;
        panel.classList.toggle('is-active', match);
      });
      if (n === QUOTE_STEP) refreshSummary();
      if (n === 3) buildSizeOptions();
      if (n === 4) buildFinishOptions();
    }

    function syncVehicle() {
      var value = (manual && manual.value.trim()) || '';
      if (continueBtn) continueBtn.disabled = !value;
      if (hiddenVehicle) hiddenVehicle.value = value;
      if (ymm && value) ymm.value = value;
      refreshSummary();
    }

    function canContinueStyle() {
      return !!(state.style && state.wheelTitle);
    }

    function isBeadlock() {
      return state.style === 'Beadlock' || state.wheelUnit === 'pair';
    }

    function isBeadlockPair() {
      return isBeadlock() && state.beadlockQty === 'pair';
    }

    function isBeadlockFull() {
      return isBeadlock() && state.beadlockQty === 'full';
    }

    function canContinueSize() {
      if (isBeadlock() && !state.beadlockQty) return false;
      if (isBeadlockPair()) {
        return !!(state.rearDiameter && state.rearWidth);
      }
      return !!(state.frontDiameter && state.rearDiameter && state.frontWidth && state.rearWidth);
    }

    function refreshContinue() {
      if (styleContinue) styleContinue.disabled = !canContinueStyle();
      if (styleHint) styleHint.hidden = canContinueStyle();
      if (sizeContinue) sizeContinue.disabled = !canContinueSize();
      if (sizeHint) {
        sizeHint.hidden = canContinueSize();
        if (!canContinueSize()) {
          if (isBeadlock() && !state.beadlockQty) {
            sizeHint.textContent = 'Choose pair (2) or full set (4), then select specs.';
          } else if (isBeadlockPair()) {
            sizeHint.textContent = 'Select rear diameter and width to continue.';
          } else {
            sizeHint.textContent = 'Select front and rear diameter and width to continue.';
          }
        }
      }
      if (finishContinue) finishContinue.disabled = !state.finish;
      if (finishHint) finishHint.hidden = !!state.finish;
      if (capContinue) capContinue.disabled = !state.centerCap;
      if (capHint) capHint.hidden = !!state.centerCap;
      if (fitmentContinue) fitmentContinue.disabled = !state.fitment;
      if (fitmentHint) fitmentHint.hidden = !!state.fitment;
    }

    function syncSpecFields() {
      if (frontDiameterValue) {
        frontDiameterValue.value =
          !isBeadlockPair() && state.frontDiameter ? state.frontDiameter + '"' : '';
      }
      if (rearDiameterValue) rearDiameterValue.value = state.rearDiameter ? state.rearDiameter + '"' : '';
      if (frontWidthValue) {
        frontWidthValue.value = !isBeadlockPair() && state.frontWidth ? String(state.frontWidth) : '';
      }
      if (rearWidthValue) rearWidthValue.value = state.rearWidth ? String(state.rearWidth) : '';
      if (beadlockQtyValue) {
        beadlockQtyValue.value = isBeadlock()
          ? state.beadlockQty === 'pair'
            ? 'Pair (2)'
            : state.beadlockQty === 'full'
              ? 'Full set (4)'
              : ''
          : '';
      }
      if (centerCapValue) centerCapValue.value = state.centerCap || '';
      if (fitmentStyleValue) fitmentStyleValue.value = state.fitment || '';
      if (estimateValue) estimateValue.value = state.estimateLabel || '';
      if (designInput) designInput.value = state.wheelTitle || '';
      if (finishInput) finishInput.value = state.finish || '';
      if (frontSizeInput) {
        frontSizeInput.value =
          !isBeadlockPair() && state.frontDiameter && state.frontWidth
            ? formatInch(state.frontDiameter) + 'x' + formatInch(state.frontWidth)
            : isBeadlockPair()
              ? 'N/A — pair (rear only)'
              : '';
      }
      if (rearSizeInput && state.rearDiameter && state.rearWidth) {
        rearSizeInput.value = formatInch(state.rearDiameter) + 'x' + formatInch(state.rearWidth);
      }
    }

    function refreshSummary() {
      var vehicle = (hiddenVehicle && hiddenVehicle.value) || (manual && manual.value.trim()) || '';
      var hasSize = canContinueSize();
      if (summary) {
        summary.hidden = !(vehicle || state.style || state.wheelTitle || hasSize || state.finish);
      }
      if (summaryVehicle) summaryVehicle.textContent = vehicle || '—';
      if (summaryStyle) {
        summaryStyle.textContent = state.style
          ? state.style +
            (isBeadlock() && state.beadlockQty
              ? state.beadlockQty === 'pair'
                ? ' · Pair (2)'
                : ' · Full set (4)'
              : '')
          : '—';
      }
      if (summaryWheelRow) summaryWheelRow.hidden = !state.wheelTitle;
      if (summaryWheel) summaryWheel.textContent = state.wheelTitle || '—';
      if (summarySizeRow) summarySizeRow.hidden = !hasSize;
      if (summarySize && hasSize) {
        if (isBeadlockPair()) {
          summarySize.textContent =
            'Rear ' + formatInch(state.rearDiameter) + 'x' + formatInch(state.rearWidth) + ' (pair)';
        } else {
          summarySize.textContent =
            'F ' +
            formatInch(state.frontDiameter) +
            'x' +
            formatInch(state.frontWidth) +
            ' · R ' +
            formatInch(state.rearDiameter) +
            'x' +
            formatInch(state.rearWidth);
        }
      }
      if (summaryFinishRow) summaryFinishRow.hidden = !state.finish;
      if (summaryFinish) summaryFinish.textContent = state.finish || '—';
      if (summaryCapRow) summaryCapRow.hidden = !state.centerCap;
      if (summaryCap) {
        summaryCap.textContent = state.centerCap
          ? state.centerCap + (state.centerCapPrice ? ' (+$' + state.centerCapPrice + ')' : ' (free)')
          : '—';
      }
      if (summaryFitmentRow) summaryFitmentRow.hidden = !state.fitment;
      if (summaryFitment) summaryFitment.textContent = state.fitment || '—';
      if (summaryPrice) {
        summaryPrice.textContent =
          state.estimateLabel ||
          state.wheelPrice ||
          state.priceRange ||
          '—';
      }
    }

    function showWheelBrowser(style) {
      if (!wheelBrowser || !style) return;
      wheelBrowser.hidden = false;
      if (wheelBrowserTitle) wheelBrowserTitle.textContent = 'All ' + style + ' wheels';
      root.querySelectorAll('[data-wheels-panel]').forEach(function (panel) {
        var match = panel.getAttribute('data-wheels-panel') === style;
        panel.hidden = !match;
        panel.classList.toggle('is-active', match);
      });
    }

    function hideWheelBrowser() {
      if (!wheelBrowser) return;
      if (state.wheelTitle) return;
      wheelBrowser.hidden = true;
      root.querySelectorAll('[data-wheels-panel]').forEach(function (panel) {
        panel.hidden = true;
        panel.classList.remove('is-active');
      });
    }

    function parseVariants(btn) {
      var raw = btn.getAttribute('data-wheel-variants') || '[]';
      var list = [];
      try {
        list = JSON.parse(raw);
      } catch (e) {
        list = [];
      }
      var parsed = [];
      (list || []).forEach(function (row) {
        var token = parseSizeToken(row && row.o);
        var price = Number(row && row.p) || 0;
        if (token) {
          parsed.push({
            label: String(row.o),
            diameter: token.diameter,
            width: token.width,
            price: price,
          });
        } else if (price > 0) {
          parsed.push({
            label: String((row && row.o) || 'Base'),
            diameter: null,
            width: null,
            price: price,
            base: true,
          });
        }
      });
      if (!parsed.length) {
        var fallback = Number(btn.getAttribute('data-wheel-price-cents')) || 0;
        if (fallback > 0) {
          parsed.push({ label: 'Base', diameter: null, width: null, price: fallback, base: true });
        }
      }
      return parsed;
    }

    function basePriceCents() {
      var base = state.variants.find(function (v) {
        return v.base;
      });
      if (base) return base.price;
      if (state.variants.length) {
        return Math.min.apply(
          null,
          state.variants.map(function (v) {
            return v.price;
          })
        );
      }
      return state.wheelPriceCents || 0;
    }

    function diametersAvailable() {
      var map = {};
      state.variants.forEach(function (v) {
        if (v.diameter == null) return;
        if (!map[v.diameter] || v.price < map[v.diameter]) map[v.diameter] = v.price;
      });
      var keys = Object.keys(map)
        .map(Number)
        .sort(function (a, b) {
          return a - b;
        });
      if (keys.length) {
        return keys.map(function (d) {
          return { diameter: d, price: map[d] };
        });
      }
      var base = basePriceCents();
      return DEFAULT_DIAMETERS.map(function (d) {
        return { diameter: d, price: base };
      });
    }

    function widthsForDiameter(diameter) {
      var map = {};
      var hasExact = false;
      state.variants.forEach(function (v) {
        if (v.diameter !== Number(diameter) || v.width == null) return;
        hasExact = true;
        if (!map[v.width] || v.price < map[v.width]) map[v.width] = v.price;
      });
      if (hasExact) {
        return Object.keys(map)
          .map(Number)
          .sort(function (a, b) {
            return a - b;
          })
          .map(function (w) {
            return { width: w, price: map[w], exact: true };
          });
      }
      var diameterPrice = priceForDiameter(diameter);
      return DEFAULT_WIDTHS.map(function (w) {
        return { width: w, price: diameterPrice, exact: false };
      });
    }

    function priceForDiameter(diameter) {
      var best = null;
      state.variants.forEach(function (v) {
        if (v.diameter !== Number(diameter)) return;
        if (best == null || v.price < best) best = v.price;
      });
      if (best != null) return best;
      return basePriceCents();
    }

    function priceForSpec(diameter, width) {
      var best = null;
      state.variants.forEach(function (v) {
        if (v.diameter !== Number(diameter)) return;
        if (v.width != null && Number(width) && v.width !== Number(width)) return;
        if (best == null || v.price < best) best = v.price;
      });
      if (best != null) return best;
      return priceForDiameter(diameter);
    }

    function unitLabel() {
      return state.wheelUnit === 'pair' ? 'pair' : 'wheel';
    }

    function setStyle(style, priceRange, opts) {
      opts = opts || {};
      var styleChanged = state.style !== style;
      state.style = style || '';
      state.priceRange = priceRange || '';
      if (styleChanged) {
        clearWheelSelection(false);
      }
      if (hiddenStyle) hiddenStyle.value = state.style;
      if (hiddenPrice) hiddenPrice.value = state.priceRange;
      root.querySelectorAll('[data-style-select]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-style') === state.style);
      });
      if (opts.showBrowser !== false) showWheelBrowser(state.style);
      refreshContinue();
      refreshSummary();
      syncQualify();
      try {
        sessionStorage.setItem('ff_build_vehicle', hiddenVehicle ? hiddenVehicle.value : '');
        sessionStorage.setItem('ff_build_style', state.style);
        sessionStorage.setItem('ff_build_price', state.priceRange);
        sessionStorage.setItem('ff_build_wheel', state.wheelTitle);
      } catch (e) {}
    }

    function clearWheelSelection(keepStyle) {
      state.wheelTitle = '';
      state.wheelHandle = '';
      state.wheelPrice = '';
      state.wheelPriceCents = 0;
      state.variants = [];
      state.beadlockQty = '';
      state.frontDiameter = '';
      state.rearDiameter = '';
      state.frontWidth = '';
      state.rearWidth = '';
      state.frontPriceCents = 0;
      state.rearPriceCents = 0;
      state.finish = '';
      state.centerCap = '';
      state.centerCapPrice = 0;
      state.fitment = '';
      state.estimateCents = 0;
      state.estimateLabel = '';
      root.querySelectorAll('[data-wheel-select]').forEach(function (btn) {
        btn.classList.remove('is-selected');
      });
      root.querySelectorAll('[data-cap-select], [data-fitment-select], [data-finish-chip], [data-beadlock-qty-select]').forEach(function (el) {
        el.classList.remove('is-selected');
      });
      if (wheelSelected) wheelSelected.hidden = true;
      if (designInput) designInput.value = '';
      if (!keepStyle) {
        /* style may already be cleared by caller */
      }
      syncBeadlockSizeUi();
      syncSpecFields();
      refreshContinue();
      refreshSummary();
    }

    function setWheel(btn) {
      if (!btn) return;
      var style = btn.getAttribute('data-style') || state.style;
      var priceRange = btn.getAttribute('data-price-range') || state.priceRange;
      setStyle(style, priceRange, { showBrowser: true });
      state.wheelTitle = btn.getAttribute('data-wheel-title') || '';
      state.wheelHandle = btn.getAttribute('data-wheel-handle') || '';
      state.wheelPrice = btn.getAttribute('data-wheel-price') || '';
      state.wheelPriceCents = Number(btn.getAttribute('data-wheel-price-cents')) || 0;
      state.wheelUnit = btn.getAttribute('data-wheel-unit') || (style === 'Beadlock' ? 'pair' : 'wheel');
      state.variants = parseVariants(btn);
      state.beadlockQty = '';
      state.frontDiameter = '';
      state.rearDiameter = '';
      state.frontWidth = '';
      state.rearWidth = '';
      state.finish = '';
      state.centerCap = '';
      state.centerCapPrice = 0;
      state.fitment = '';
      root.querySelectorAll('[data-wheel-select]').forEach(function (el) {
        el.classList.toggle('is-selected', el === btn);
      });
      root.querySelectorAll('[data-cap-select], [data-fitment-select], [data-finish-chip], [data-beadlock-qty-select]').forEach(function (el) {
        el.classList.remove('is-selected');
      });
      if (designInput) designInput.value = state.wheelTitle;
      var hiddenWheel = root.querySelector('[data-selected-wheel]');
      if (hiddenWheel) hiddenWheel.value = state.wheelTitle;
      if (wheelSelected) wheelSelected.hidden = !state.wheelTitle;
      if (wheelSelectedLabel) {
        wheelSelectedLabel.textContent = state.wheelTitle + (state.wheelPrice ? ' · ' + state.wheelPrice : '');
      }
      if (sizeNote) {
        sizeNote.textContent =
          'Prices below are from the live ' +
          state.wheelTitle +
          ' listing (' +
          money(basePriceCents()) +
          '+ per ' +
          unitLabel() +
          ').';
      }
      syncBeadlockSizeUi();
      syncSpecFields();
      refreshContinue();
      refreshSummary();
      try {
        sessionStorage.setItem('ff_build_wheel', state.wheelTitle);
      } catch (e) {}
    }

    function renderChips(container, items, selectedValue, onPick, valueKey, labelFn) {
      if (!container) return;
      container.innerHTML = '';
      items.forEach(function (item) {
        var value = item[valueKey];
        var btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'ff-build__chip';
        btn.setAttribute('role', 'listitem');
        if (String(value) === String(selectedValue)) btn.classList.add('is-selected');
        btn.innerHTML =
          '<span class="ff-build__chip-label">' +
          labelFn(item) +
          '</span>' +
          (item.price != null
            ? '<span class="ff-build__chip-price">' + money(item.price) + '/' + unitLabel() + '</span>'
            : '');
        btn.addEventListener('click', function () {
          onPick(item);
        });
        container.appendChild(btn);
      });
    }

    function syncBeadlockSizeUi() {
      var beadlock = isBeadlock();
      if (beadlockQtyBlock) beadlockQtyBlock.hidden = !beadlock;
      root.querySelectorAll('[data-beadlock-qty-select]').forEach(function (btn) {
        btn.classList.toggle(
          'is-selected',
          btn.getAttribute('data-beadlock-qty-value') === state.beadlockQty
        );
      });

      var showSpecs = !beadlock || !!state.beadlockQty;
      if (sizeSpecs) sizeSpecs.hidden = !showSpecs;
      if (frontSpecs) frontSpecs.hidden = isBeadlockPair();
      if (rearSpecs) rearSpecs.hidden = !showSpecs;

      if (isBeadlockPair()) {
        state.frontDiameter = '';
        state.frontWidth = '';
        state.frontPriceCents = 0;
      }

      if (sizeSpecs && !sizeSpecs.hidden) {
        if (!isBeadlockPair()) {
          sizeSpecs.classList.remove('ff-build__spec-grid--rear-only');
        } else {
          sizeSpecs.classList.add('ff-build__spec-grid--rear-only');
        }
      }
    }

    function buildSizeOptions() {
      syncBeadlockSizeUi();
      if (sizeSpecs && sizeSpecs.hidden) {
        updateEstimate();
        refreshContinue();
        return;
      }

      var diameters = diametersAvailable();
      if (!isBeadlockPair()) {
        renderChips(
          frontDiameterOptions,
          diameters,
          state.frontDiameter,
          function (item) {
            state.frontDiameter = item.diameter;
            state.frontPriceCents = item.price;
            state.frontWidth = '';
            buildWidthOptions('front');
            updateEstimate();
            refreshContinue();
            refreshSummary();
            syncSpecFields();
            buildSizeOptions();
          },
          'diameter',
          function (item) {
            return formatInch(item.diameter) + '"';
          }
        );
        buildWidthOptions('front');
      }
      renderChips(
        rearDiameterOptions,
        diameters,
        state.rearDiameter,
        function (item) {
          state.rearDiameter = item.diameter;
          state.rearPriceCents = item.price;
          state.rearWidth = '';
          buildWidthOptions('rear');
          updateEstimate();
          refreshContinue();
          refreshSummary();
          syncSpecFields();
          buildSizeOptions();
        },
        'diameter',
        function (item) {
          return formatInch(item.diameter) + '"';
        }
      );
      buildWidthOptions('rear');
      updateEstimate();
      refreshContinue();
    }

    function buildWidthOptions(axle) {
      var diameter = axle === 'front' ? state.frontDiameter : state.rearDiameter;
      var container = axle === 'front' ? frontWidthOptions : rearWidthOptions;
      var selected = axle === 'front' ? state.frontWidth : state.rearWidth;
      if (!container) return;
      if (axle === 'front' && isBeadlockPair()) {
        container.innerHTML = '';
        return;
      }
      if (!diameter) {
        container.innerHTML = '<p class="ff-build__hint">Choose a diameter first.</p>';
        return;
      }
      var widths = widthsForDiameter(diameter);
      renderChips(
        container,
        widths,
        selected,
        function (item) {
          if (axle === 'front') {
            state.frontWidth = item.width;
            state.frontPriceCents = item.price;
          } else {
            state.rearWidth = item.width;
            state.rearPriceCents = item.price;
          }
          updateEstimate();
          refreshContinue();
          refreshSummary();
          syncSpecFields();
          buildWidthOptions(axle);
        },
        'width',
        function (item) {
          return formatInch(item.width) + '"';
        }
      );
    }

    function updateEstimate() {
      if (!canContinueSize()) {
        state.estimateCents = 0;
        state.estimateLabel = state.priceRange || state.wheelPrice || '';
        if (sizeEstimate) sizeEstimate.hidden = true;
        syncSpecFields();
        return;
      }

      var front = priceForSpec(state.frontDiameter, state.frontWidth);
      var rear = priceForSpec(state.rearDiameter, state.rearWidth);
      state.frontPriceCents = front;
      state.rearPriceCents = rear;

      var total = 0;
      var detail = '';
      if (isBeadlockPair()) {
        total = rear;
        detail = money(rear) + ' rear pair';
      } else if (isBeadlockFull() || state.wheelUnit === 'pair') {
        total = front + rear;
        detail = money(front) + ' front pair + ' + money(rear) + ' rear pair';
      } else {
        total = front * 2 + rear * 2;
        detail =
          '2× ' +
          money(front) +
          ' front + 2× ' +
          money(rear) +
          ' rear';
      }

      if (isChromeFinish(state.finish)) {
        var chromeEach = 25000;
        var chromeCount = isBeadlockPair() ? 2 : 4;
        total += chromeEach * chromeCount;
        detail += ' + Chrome +$250 × ' + chromeCount;
      }

      if (state.centerCapPrice) {
        var capTotal = isBeadlockPair()
          ? Math.round(state.centerCapPrice / 2)
          : state.centerCapPrice;
        total += capTotal * 100;
        detail += ' + caps +$' + capTotal;
      }

      state.estimateCents = total;
      state.estimateLabel = money(total) + ' est. (' + detail + ')';
      if (sizeEstimate) {
        sizeEstimate.hidden = false;
        sizeEstimate.textContent = 'Estimated from website pricing: ' + state.estimateLabel;
      }
      syncSpecFields();
    }

    function buildFinishOptions() {
      if (!finishOptions || finishOptions.dataset.ready === '1') {
        root.querySelectorAll('[data-finish-chip]').forEach(function (btn) {
          btn.classList.toggle('is-selected', btn.getAttribute('data-finish') === state.finish);
        });
        return;
      }
      finishOptions.dataset.ready = '1';
      finishOptions.innerHTML = '';
      FINISH_GROUPS.forEach(function (group) {
        var wrap = document.createElement('div');
        wrap.className = 'ff-build__finish-group';
        var title = document.createElement('p');
        title.className = 'ff-build__finish-group-title';
        title.textContent = group.label;
        wrap.appendChild(title);
        var row = document.createElement('div');
        row.className = 'ff-build__chip-row';
        group.options.forEach(function (name) {
          var btn = document.createElement('button');
          btn.type = 'button';
          btn.className = 'ff-build__chip ff-build__chip--finish';
          btn.setAttribute('data-finish-chip', '');
          btn.setAttribute('data-finish', name);
          var surcharge = isChromeFinish(name) ? ' · +$250/wheel' : '';
          btn.innerHTML =
            '<span class="ff-build__chip-label">' +
            name +
            '</span>' +
            (surcharge ? '<span class="ff-build__chip-price">' + surcharge.replace(' · ', '') + '</span>' : '');
          if (state.finish === name) btn.classList.add('is-selected');
          btn.addEventListener('click', function () {
            state.finish = name;
            root.querySelectorAll('[data-finish-chip]').forEach(function (el) {
              el.classList.toggle('is-selected', el === btn);
            });
            updateEstimate();
            refreshContinue();
            refreshSummary();
            syncSpecFields();
          });
          row.appendChild(btn);
        });
        wrap.appendChild(row);
        finishOptions.appendChild(wrap);
      });
    }

    function setHelpMode(mode) {
      var specialist = mode === 'specialist';
      if (assistNote) assistNote.hidden = !specialist;
      if (helpPreference) {
        helpPreference.value = 'Configured in quote builder';
      }
      root.querySelectorAll('.ff-quote__choice').forEach(function (label) {
        var radio = label.querySelector('[data-help-mode]');
        label.classList.toggle('is-selected', !!(radio && radio.checked));
      });
    }

    function selectedRadio(name) {
      var el = root.querySelector('input[name="' + name + '"]:checked');
      return el ? el.value : '';
    }

    function syncQualify() {
      var timeline = selectedRadio('ff_timeline');
      var intentOk = !!(intentCheck && intentCheck.checked);
      var isNow = timeline === 'Now';

      if (timelineValue) timelineValue.value = timeline;
      if (intentValue) intentValue.value = intentOk ? 'Yes — serious buyer, understands price range' : '';

      root.querySelectorAll('[data-timeline-pick]').forEach(function (input) {
        var label = input.closest('.ff-quote__pick');
        if (label) label.classList.toggle('is-selected', !!input.checked);
      });

      if (nowOffer) nowOffer.hidden = !isNow;
      if (!isNow && nowDiscountCheck) nowDiscountCheck.checked = false;
      if (nowDiscountValue) {
        nowDiscountValue.value =
          isNow && nowDiscountCheck && nowDiscountCheck.checked
            ? 'Yes — wants 10% discount to order now'
            : isNow
              ? 'Now selected — declined 10% discount offer'
              : '';
      }

      var ready = !!(timeline && intentOk);
      if (submitBtn) submitBtn.disabled = !ready;
      if (submitHint) {
        submitHint.hidden = ready;
        if (!ready) {
          submitHint.textContent = 'Choose timing and confirm you’re ready to continue.';
        }
      }
    }

    function openModal() {
      if (!modal) return;
      previousFocus = document.activeElement;
      modal.hidden = false;
      document.documentElement.classList.add('ff-modal-open');
      if (modalDialog) modalDialog.focus();
    }

    function closeModal() {
      if (!modal) return;
      modal.hidden = true;
      document.documentElement.classList.remove('ff-modal-open');
      if (previousFocus && previousFocus.focus) previousFocus.focus();
    }

    if (manual) {
      manual.addEventListener('input', syncVehicle);
    }

    root.querySelectorAll('[data-style-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStyle(btn.getAttribute('data-style') || '', btn.getAttribute('data-price-range') || '');
      });
      btn.addEventListener('mouseenter', function () {
        if (window.matchMedia && window.matchMedia('(hover: hover)').matches) {
          clearTimeout(hoverTimer);
          showWheelBrowser(btn.getAttribute('data-style') || '');
        }
      });
      btn.addEventListener('focus', function () {
        showWheelBrowser(btn.getAttribute('data-style') || '');
      });
    });

    if (styleCards && wheelBrowser) {
      styleCards.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () {
          if (wheelBrowser.matches(':hover')) return;
          if (state.style) {
            showWheelBrowser(state.style);
          } else {
            hideWheelBrowser();
          }
        }, 160);
      });
      wheelBrowser.addEventListener('mouseenter', function () {
        clearTimeout(hoverTimer);
      });
      wheelBrowser.addEventListener('mouseleave', function () {
        clearTimeout(hoverTimer);
        hoverTimer = setTimeout(function () {
          if (styleCards.matches(':hover')) return;
          if (state.style) {
            showWheelBrowser(state.style);
          } else if (!state.wheelTitle) {
            hideWheelBrowser();
          }
        }, 160);
      });
    }

    root.querySelectorAll('[data-wheel-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setWheel(btn);
      });
    });

    root.querySelectorAll('[data-beadlock-qty-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.beadlockQty = btn.getAttribute('data-beadlock-qty-value') || '';
        if (state.beadlockQty === 'pair') {
          state.frontDiameter = '';
          state.frontWidth = '';
          state.frontPriceCents = 0;
        }
        syncBeadlockSizeUi();
        buildSizeOptions();
        updateEstimate();
        refreshContinue();
        refreshSummary();
        syncSpecFields();
      });
    });

    root.querySelectorAll('[data-cap-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.centerCap = btn.getAttribute('data-cap') || '';
        state.centerCapPrice = Number(btn.getAttribute('data-cap-price')) || 0;
        root.querySelectorAll('[data-cap-select]').forEach(function (el) {
          el.classList.toggle('is-selected', el === btn);
        });
        updateEstimate();
        refreshContinue();
        refreshSummary();
        syncSpecFields();
      });
    });

    root.querySelectorAll('[data-fitment-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.fitment = btn.getAttribute('data-fitment') || '';
        root.querySelectorAll('[data-fitment-select]').forEach(function (el) {
          el.classList.toggle('is-selected', el === btn);
        });
        refreshContinue();
        refreshSummary();
        syncSpecFields();
      });
    });

    root.querySelectorAll('[data-help-mode]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) setHelpMode(radio.value);
      });
    });

    root.querySelectorAll('[data-timeline-pick]').forEach(function (input) {
      input.addEventListener('change', syncQualify);
    });
    if (nowDiscountCheck) nowDiscountCheck.addEventListener('change', syncQualify);
    if (intentCheck) intentCheck.addEventListener('change', syncQualify);

    root.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = Number(btn.getAttribute('data-next'));
        syncVehicle();
        if (next === 2 && continueBtn && continueBtn.disabled) return;
        if (next === 3) {
          if (!canContinueStyle()) {
            if (styleHint) styleHint.hidden = false;
            if (styleContinue) styleContinue.disabled = true;
            if (state.style) showWheelBrowser(state.style);
            return;
          }
        }
        if (next === 4 && !canContinueSize()) {
          if (sizeHint) sizeHint.hidden = false;
          return;
        }
        if (next === 5 && !state.finish) {
          if (finishHint) finishHint.hidden = false;
          return;
        }
        if (next === 6 && !state.centerCap) {
          if (capHint) capHint.hidden = false;
          return;
        }
        if (next === 7 && !state.fitment) {
          if (fitmentHint) fitmentHint.hidden = false;
          return;
        }
        if (ymm && hiddenVehicle && hiddenVehicle.value) ymm.value = hiddenVehicle.value;
        syncSpecFields();
        updateEstimate();
        setStep(next);
      });
    });

    root.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStep(Number(btn.getAttribute('data-back')));
      });
    });

    root.querySelectorAll('[data-ff-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });

    var interestedBtn = root.querySelector('[data-ff-modal-interested]');
    if (interestedBtn) {
      interestedBtn.addEventListener('click', function () {
        if (modalThanks) modalThanks.hidden = false;
        if (modalActions) modalActions.hidden = true;
        try {
          sessionStorage.setItem('ff_media_day_interest', 'yes');
        } catch (e) {}
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });

    if (quoteForm) {
      quoteForm.addEventListener('submit', function (event) {
        syncQualify();
        syncSpecFields();
        updateEstimate();
        var timeline = selectedRadio('ff_timeline');
        var intentOk = !!(intentCheck && intentCheck.checked);
        if (!timeline || !intentOk) {
          event.preventDefault();
          syncQualify();
          return false;
        }
        try {
          sessionStorage.setItem('ff_quote_submitted', '1');
        } catch (e) {}
      });
    }

    var success = root.querySelector('[data-ff-quote-success]');
    var justSubmitted = false;
    try {
      justSubmitted = sessionStorage.getItem('ff_quote_submitted') === '1';
      if (justSubmitted) sessionStorage.removeItem('ff_quote_submitted');
    } catch (e) {}

    if (success || justSubmitted) {
      setStep(QUOTE_STEP);
      openModal();
      if (root.id) {
        try {
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
      }
    }

    setHelpMode((root.querySelector('[data-help-mode]:checked') || {}).value || 'specs');
    syncVehicle();
    syncQualify();
    refreshContinue();
  }

  document.querySelectorAll('[data-ff-build]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-build]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
