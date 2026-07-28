(function () {
  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var state = { style: '' };
    var manual = root.querySelector('[name="ff_vehicle_manual"]');
    var ymm = root.querySelector('[name="contact[vehicle]"]');
    var hiddenVehicle = root.querySelector('[id^="ff-selected-vehicle-"]');
    var hiddenStyle = root.querySelector('[id^="ff-selected-style-"]');
    var helpPreference = root.querySelector('[id^="ff-help-preference-"]');
    var continueBtn = root.querySelector('[data-panel="1"] [data-next="2"]');
    var browseWrap = root.querySelector('[data-browse-links]');
    var assistNote = root.querySelector('[data-assist-note]');
    var submitBtn = root.querySelector('[data-submit-label]');

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

    function syncVehicle() {
      var value = (manual && manual.value.trim()) || '';
      if (continueBtn) continueBtn.disabled = !value;
      if (hiddenVehicle) hiddenVehicle.value = value;
      if (ymm && value) ymm.value = value;
    }

    function setStyle(style) {
      state.style = style || '';
      if (hiddenStyle) hiddenStyle.value = state.style;
      root.querySelectorAll('[data-style-select]').forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-style') === state.style);
      });
      if (browseWrap) {
        var show = !!state.style;
        browseWrap.hidden = !show;
        browseWrap.querySelectorAll('[data-browse-for]').forEach(function (link) {
          link.hidden = link.getAttribute('data-browse-for') !== state.style;
        });
      }
      try {
        sessionStorage.setItem('ff_build_vehicle', hiddenVehicle ? hiddenVehicle.value : '');
        sessionStorage.setItem('ff_build_style', state.style);
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
      if (submitBtn) {
        submitBtn.textContent = specialist
          ? 'Request specialist callback'
          : 'Submit build request';
      }
    }

    if (manual) {
      manual.addEventListener('input', syncVehicle);
    }

    root.querySelectorAll('[data-style-select]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStyle(btn.getAttribute('data-style') || '');
      });
    });

    root.querySelectorAll('[data-help-mode]').forEach(function (radio) {
      radio.addEventListener('change', function () {
        if (radio.checked) setHelpMode(radio.value);
      });
    });

    root.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = Number(btn.getAttribute('data-next'));
        syncVehicle();
        if (next === 2 && continueBtn && continueBtn.disabled) return;
        if (ymm && hiddenVehicle && hiddenVehicle.value) ymm.value = hiddenVehicle.value;
        if (btn.hasAttribute('data-skip-quote')) setStyle(state.style || 'Custom quote');
        setStep(next);
      });
    });

    root.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStep(Number(btn.getAttribute('data-back')));
      });
    });

    setHelpMode('specs');
    syncVehicle();
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
