(function () {
  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var state = { style: '', priceRange: '' };
    var manual = root.querySelector('[name="ff_vehicle_manual"]');
    var ymm = root.querySelector('[name="contact[vehicle]"]');
    var hiddenVehicle = root.querySelector('[id^="ff-selected-vehicle-"]');
    var hiddenStyle = root.querySelector('[id^="ff-selected-style-"]');
    var hiddenPrice = root.querySelector('[id^="ff-selected-price-"]');
    var helpPreference = root.querySelector('[id^="ff-help-preference-"]');
    var continueBtn = root.querySelector('[data-panel="1"] [data-next="2"]');
    var styleContinue = root.querySelector('[data-need-style]');
    var styleHint = root.querySelector('[data-style-hint]');
    var assistNote = root.querySelector('[data-assist-note]');
    var submitBtn = root.querySelector('[data-submit-label]');
    var submitHint = root.querySelector('[data-submit-hint]');
    var quoteForm = root.querySelector('form.ff-quote');
    var budgetValue = root.querySelector('[data-budget-value]');
    var timelineValue = root.querySelector('[data-timeline-value]');
    var intentValue = root.querySelector('[data-intent-value]');
    var intentCheck = root.querySelector('[data-intent-check]');
    var budgetWarn = root.querySelector('[data-budget-warn]');
    var summary = root.querySelector('[data-build-summary]');
    var summaryVehicle = root.querySelector('[data-summary-vehicle]');
    var summaryStyle = root.querySelector('[data-summary-style]');
    var summaryPrice = root.querySelector('[data-summary-price]');
    var modal = root.querySelector('[data-ff-media-modal]');
    var modalDialog = root.querySelector('[data-ff-modal-dialog]');
    var modalThanks = root.querySelector('[data-ff-modal-thanks]');
    var modalActions = root.querySelector('.ff-media-modal__actions');
    var previousFocus = null;

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
      if (n === 3) refreshSummary();
    }

    function syncVehicle() {
      var value = (manual && manual.value.trim()) || '';
      if (continueBtn) continueBtn.disabled = !value;
      if (hiddenVehicle) hiddenVehicle.value = value;
      if (ymm && value) ymm.value = value;
      refreshSummary();
    }

    function refreshSummary() {
      var vehicle = (hiddenVehicle && hiddenVehicle.value) || (manual && manual.value.trim()) || '';
      if (summary) summary.hidden = !(vehicle || state.style);
      if (summaryVehicle) summaryVehicle.textContent = vehicle || '—';
      if (summaryStyle) summaryStyle.textContent = state.style || '—';
      if (summaryPrice) summaryPrice.textContent = state.priceRange || '—';
    }

    function setStyle(style, priceRange) {
      state.style = style || '';
      state.priceRange = priceRange || '';
      if (hiddenStyle) hiddenStyle.value = state.style;
      if (hiddenPrice) hiddenPrice.value = state.priceRange;
      root.querySelectorAll('[data-style-select]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-style') === state.style);
      });
      if (styleContinue) styleContinue.disabled = !state.style;
      if (styleHint) styleHint.hidden = !!state.style;
      refreshSummary();
      syncQualify();
      try {
        sessionStorage.setItem('ff_build_vehicle', hiddenVehicle ? hiddenVehicle.value : '');
        sessionStorage.setItem('ff_build_style', state.style);
        sessionStorage.setItem('ff_build_price', state.priceRange);
      } catch (e) {}
    }

    function setHelpMode(mode) {
      var specialist = mode === 'specialist';
      root.querySelectorAll('.ff-quote__specs').forEach(function (field) {
        field.hidden = specialist;
      });
      root.querySelectorAll('[data-spec-field]').forEach(function (input) {
        if (specialist) input.value = '';
      });
      if (assistNote) assistNote.hidden = !specialist;
      if (helpPreference) {
        helpPreference.value = specialist
          ? 'Leave it to a fitment specialist — email or call back'
          : 'I know my specs';
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

    function budgetLooksLow(budget) {
      if (!budget || budget.indexOf('Not sure') !== -1) return false;
      if (budget.indexOf('Under $2,500') !== -1) return true;
      if (budget.indexOf('$2,500') !== -1 && /2-Piece|Beadlock/i.test(state.style)) return true;
      return false;
    }

    function syncQualify() {
      var budget = selectedRadio('ff_budget');
      var timeline = selectedRadio('ff_timeline');
      var intentOk = !!(intentCheck && intentCheck.checked);

      if (budgetValue) budgetValue.value = budget;
      if (timelineValue) timelineValue.value = timeline;
      if (intentValue) intentValue.value = intentOk ? 'Yes — serious buyer, understands price range' : '';

      root.querySelectorAll('[data-budget-pick]').forEach(function (input) {
        var label = input.closest('.ff-quote__pick');
        if (label) label.classList.toggle('is-selected', !!input.checked);
      });
      root.querySelectorAll('[data-timeline-pick]').forEach(function (input) {
        var label = input.closest('.ff-quote__pick');
        if (label) label.classList.toggle('is-selected', !!input.checked);
      });

      if (budgetWarn) budgetWarn.hidden = !budgetLooksLow(budget);

      var ready = !!(budget && timeline && intentOk);
      if (submitBtn) submitBtn.disabled = !ready;
      if (submitHint) {
        submitHint.hidden = ready;
        if (!ready) {
          submitHint.textContent = 'Choose budget, timing, and confirm you’re ready to continue.';
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
        setStyle(
          btn.getAttribute('data-style') || '',
          btn.getAttribute('data-price-range') || ''
        );
      });
    });

    root.querySelectorAll('[data-help-mode]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) setHelpMode(radio.value);
      });
    });

    root.querySelectorAll('[data-budget-pick], [data-timeline-pick]').forEach(function (input) {
      input.addEventListener('change', syncQualify);
    });
    if (intentCheck) intentCheck.addEventListener('change', syncQualify);

    root.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = Number(btn.getAttribute('data-next'));
        syncVehicle();
        if (next === 2 && continueBtn && continueBtn.disabled) return;
        if (next === 3) {
          if (!state.style) {
            if (styleHint) styleHint.hidden = false;
            if (styleContinue) styleContinue.disabled = true;
            return;
          }
        }
        if (ymm && hiddenVehicle && hiddenVehicle.value) ymm.value = hiddenVehicle.value;
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
        var budget = selectedRadio('ff_budget');
        var timeline = selectedRadio('ff_timeline');
        var intentOk = !!(intentCheck && intentCheck.checked);
        if (!budget || !timeline || !intentOk) {
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
      setStep(3);
      openModal();
      if (root.id) {
        try {
          root.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } catch (e) {}
      }
    }

    setHelpMode(
      (root.querySelector('[data-help-mode]:checked') || {}).value || 'specs'
    );
    syncVehicle();
    syncQualify();
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
