(function () {
  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var state = { style: '', design: '' };
    var manual = root.querySelector('[name="ff_vehicle_manual"]');
    var ymm = root.querySelector('[name="contact[vehicle]"]');
    var hiddenVehicle = root.querySelector('[id^="ff-selected-vehicle-"]');
    var hiddenStyle = root.querySelector('[id^="ff-selected-style-"]');
    var designInput = root.querySelector('[name="contact[design]"]');
    var customRefHidden = root.querySelector('[name="contact[custom_design_reference]"]');
    var customRefPanel = root.querySelector('[data-custom-design-ref]');
    var customRefVisible = root.querySelector('[data-custom-design-ref-input]');
    var customRefError = root.querySelector('[data-custom-design-ref-error]');
    var continueBtn = root.querySelector('[data-panel="1"] [data-next="2"]');
    var continueQuoteBtn = root.querySelector('[data-continue-quote]');
    var designPicker = root.querySelector('[data-design-picker]');
    var catalogViewport = root.querySelector('.ff-build__catalog-viewport');
    var quoteForm = root.querySelector('form.ff-quote');
    var summaryVehicle = root.querySelector('[data-summary-vehicle]');
    var summaryStyle = root.querySelector('[data-summary-style]');
    var summaryDesign = root.querySelector('[data-summary-design]');
    var modal = root.querySelector('[data-ff-media-modal]');
    var modalDialog = root.querySelector('[data-ff-modal-dialog]');
    var modalThanks = root.querySelector('[data-ff-modal-thanks]');
    var modalActions = root.querySelector('.ff-media-modal__actions');
    var previousFocus = null;
    var gate = root.querySelector('[data-ff-build-gate]');
    var unlockBtn = root.querySelector('[data-ff-build-unlock]');

    function fireQuoteStarted() {
      var payload = {
        form_name: 'Fortune Forged Build Quote',
        content_name: 'Custom Forged Wheel Quote',
        value: 1,
        currency: 'USD'
      };
      try {
        if (typeof window.fbq === 'function') {
          window.fbq('track', 'QuoteStarted', payload);
        }
      } catch (e) {}
      try {
        if (
          window.Shopify &&
          window.Shopify.analytics &&
          typeof window.Shopify.analytics.publish === 'function'
        ) {
          window.Shopify.analytics.publish('QuoteStarted', {
            form_name: payload.form_name
          });
        }
      } catch (e) {}
    }

    function unlockGate() {
      if (!gate) return;
      var wasLocked = gate.classList.contains('is-locked');
      gate.classList.remove('is-locked');
      if (wasLocked) fireQuoteStarted();
      if (manual) {
        try { manual.focus(); } catch (e) {}
      }
    }

    if (unlockBtn) {
      unlockBtn.addEventListener('click', unlockGate);
    }

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
    }

    function updateBuildSummary() {
      var vehicleValue =
        (hiddenVehicle && hiddenVehicle.value) ||
        (manual && manual.value.trim()) ||
        '';
      var styleValue = state.style || (hiddenStyle && hiddenStyle.value) || '';
      var designValue = state.design || (designInput && designInput.value) || '';
      if (summaryVehicle) summaryVehicle.textContent = vehicleValue || '—';
      if (summaryStyle) summaryStyle.textContent = styleValue || '—';
      if (summaryDesign) summaryDesign.textContent = designValue || '—';
    }

    function syncVehicle() {
      var value = (manual && manual.value.trim()) || '';
      if (continueBtn) continueBtn.disabled = !value;
      if (hiddenVehicle) hiddenVehicle.value = value;
      if (ymm) ymm.value = value;
      updateBuildSummary();
    }

    function syncQuoteCarryForward() {
      syncVehicle();
      if (hiddenStyle) hiddenStyle.value = state.style || '';
      if (designInput) designInput.value = state.design || '';
      syncCustomDesignReference();
      updateBuildSummary();
    }

    function syncContinueQuote() {
      if (continueQuoteBtn) {
        continueQuoteBtn.disabled = !(state.style && state.design && isCustomRefAcceptable());
      }
    }

    function isHttpUrl(value) {
      try {
        var parsed = new URL(value);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch (e) {
        return false;
      }
    }

    function syncCustomDesignReference() {
      var raw = customRefVisible ? customRefVisible.value.trim() : '';
      if (customRefVisible && customRefVisible.value !== raw) {
        customRefVisible.value = raw;
      }
      if (customRefHidden) {
        customRefHidden.value = state.design === 'Custom Design' ? raw : '';
      }
      var invalid = state.design === 'Custom Design' && raw !== '' && (!isHttpUrl(raw) || raw.length > 2048);
      if (customRefError) customRefError.hidden = !invalid;
      if (customRefVisible) {
        customRefVisible.setAttribute('aria-invalid', invalid ? 'true' : 'false');
      }
      return !invalid;
    }

    function isCustomRefAcceptable() {
      return syncCustomDesignReference();
    }

    function clearCustomDesignReference() {
      if (customRefVisible) customRefVisible.value = '';
      if (customRefHidden) customRefHidden.value = '';
      if (customRefError) customRefError.hidden = true;
      if (customRefVisible) customRefVisible.setAttribute('aria-invalid', 'false');
    }

    function updateCustomDesignRefPanel() {
      var isCustom = state.design === 'Custom Design';
      if (customRefPanel) {
        customRefPanel.hidden = !isCustom;
        if (isCustom) {
          try {
            customRefPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {}
        }
      }
      if (!isCustom) clearCustomDesignReference();
      else syncCustomDesignReference();
    }

    function clearDesignSelection() {
      state.design = '';
      if (designInput) designInput.value = '';
      root.querySelectorAll('[data-design-select]').forEach(function (btn) {
        btn.classList.remove('is-selected');
      });
      updateCustomDesignRefPanel();
      updateBuildSummary();
      syncContinueQuote();
    }

    function setDesign(title, selectedBtn) {
      state.design = title || '';
      if (designInput) designInput.value = state.design;
      root.querySelectorAll('[data-design-select]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn === selectedBtn);
      });
      updateCustomDesignRefPanel();
      updateBuildSummary();
      syncContinueQuote();
      try {
        sessionStorage.setItem('ff_build_design', state.design);
      } catch (e) {}
    }

    function setStyle(style) {
      var nextStyle = style || '';
      var styleChanged = nextStyle !== state.style;
      state.style = nextStyle;
      if (hiddenStyle) hiddenStyle.value = state.style;
      root.querySelectorAll('[data-style-select]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-style') === state.style);
      });
      if (designPicker) {
        designPicker.hidden = !state.style;
      }
      root.querySelectorAll('[data-catalog]').forEach(function (catalog) {
        catalog.hidden = catalog.getAttribute('data-catalog') !== state.style;
      });
      if (catalogViewport) catalogViewport.scrollTop = 0;
      if (styleChanged) clearDesignSelection();
      else {
        updateBuildSummary();
        syncContinueQuote();
      }
      try {
        sessionStorage.setItem('ff_build_vehicle', hiddenVehicle ? hiddenVehicle.value : '');
        sessionStorage.setItem('ff_build_style', state.style);
      } catch (e) {}
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
        setStyle(btn.getAttribute('data-style') || '');
      });
    });

    root.querySelectorAll('[data-design-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setDesign(btn.getAttribute('data-design-title') || '', btn);
      });
    });

    if (customRefVisible) {
      customRefVisible.addEventListener('input', function () {
        syncCustomDesignReference();
        syncContinueQuote();
      });
      customRefVisible.addEventListener('blur', function () {
        syncCustomDesignReference();
        syncContinueQuote();
      });
    }

    root.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = Number(btn.getAttribute('data-next'));
        syncVehicle();
        if (next === 2 && continueBtn && continueBtn.disabled) return;
        if (
          next === 3 &&
          btn.hasAttribute('data-continue-quote') &&
          !(state.style && state.design && isCustomRefAcceptable())
        ) {
          return;
        }
        syncQuoteCarryForward();
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
        syncQuoteCarryForward();
        if (state.design === 'Custom Design' && !isCustomRefAcceptable()) {
          event.preventDefault();
          return;
        }
        if (!ymm || !ymm.value) {
          event.preventDefault();
          return;
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

    syncVehicle();
    updateBuildSummary();
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
