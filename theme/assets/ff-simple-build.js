(function () {
  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var state = { vehicle: '', style: '' };
    var manual = root.querySelector('[name="ff_vehicle_manual"]');
    var ymm = root.querySelector('[name="contact[vehicle]"]');
    var hiddenVehicle = root.querySelector('[id^="ff-selected-vehicle-"]');
    var hiddenStyle = root.querySelector('[id^="ff-selected-style-"]');
    var continueBtn = root.querySelector('[data-next="2"]');

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
      var value = state.vehicle || (manual && manual.value.trim()) || '';
      if (continueBtn) continueBtn.disabled = !value;
      if (hiddenVehicle) hiddenVehicle.value = value;
      if (ymm && value && !ymm.value) ymm.value = value;
    }

    root.querySelectorAll('[data-vehicle]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        root.querySelectorAll('[data-vehicle]').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        state.vehicle = btn.getAttribute('data-vehicle') || '';
        if (manual && state.vehicle !== 'Other vehicle') {
          manual.value = state.vehicle.indexOf('BMW') === -1 && state.vehicle.indexOf('G') === 0
            ? 'BMW ' + state.vehicle
            : state.vehicle;
          if (state.vehicle === 'G80 M3') manual.value = 'BMW G80 M3';
          if (state.vehicle === 'G82 M4') manual.value = 'BMW G82 M4';
          if (state.vehicle === 'F80 M3') manual.value = 'BMW F80 M3';
        }
        syncVehicle();
      });
    });

    if (manual) {
      manual.addEventListener('input', function () {
        state.vehicle = '';
        root.querySelectorAll('[data-vehicle]').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        syncVehicle();
      });
    }

    root.querySelectorAll('[data-style]').forEach(function (link) {
      link.addEventListener('click', function () {
        state.style = link.getAttribute('data-style') || '';
        if (hiddenStyle) hiddenStyle.value = state.style;
        try {
          sessionStorage.setItem('ff_build_vehicle', hiddenVehicle ? hiddenVehicle.value : '');
          sessionStorage.setItem('ff_build_style', state.style);
        } catch (e) {}
      });
    });

    root.querySelectorAll('[data-next]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var next = Number(btn.getAttribute('data-next'));
        syncVehicle();
        if (next === 2 && continueBtn && continueBtn.disabled) return;
        if (ymm && hiddenVehicle && hiddenVehicle.value) ymm.value = hiddenVehicle.value;
        setStep(next);
      });
    });

    root.querySelectorAll('[data-back]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setStep(Number(btn.getAttribute('data-back')));
      });
    });

    var params = new URLSearchParams(window.location.search);
    var prefill = params.get('vehicle');
    if (prefill && manual) {
      manual.value = prefill;
      syncVehicle();
      if (params.get('step') === '3') setStep(3);
      else if (params.get('step') === '2') setStep(2);
    }

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
