(function () {
  var STORAGE_KEY = 'ff_fitment_vehicle';

  function splitList(value) {
    return (value || '')
      .split(',')
      .map(function (item) { return item.trim().toLowerCase(); })
      .filter(Boolean);
  }

  function readSavedVehicle() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function saveVehicle(vehicle) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(vehicle));
    } catch (e) {}
  }

  function clearVehicle() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }

  function findMatch(dataset, vehicle) {
    var year = Number(vehicle.year);
    var make = (vehicle.make || '').trim().toLowerCase();
    var model = (vehicle.model || '').trim().toLowerCase();

    for (var i = 0; i < dataset.length; i++) {
      var entry = dataset[i];
      var makes = splitList(entry.makes);
      var models = splitList(entry.models);

      if (makes.length && makes.indexOf(make) === -1) continue;
      if (year && (year < entry.yearMin || year > entry.yearMax)) continue;
      if (models.length) {
        var hit = models.some(function (keyword) {
          return model.indexOf(keyword) !== -1;
        });
        if (!hit) continue;
      }
      return entry;
    }
    return null;
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var dataset = [];
    var dataEl = root.querySelector('[data-ff-fitment-data]');
    if (dataEl) {
      try {
        dataset = JSON.parse(dataEl.textContent) || [];
      } catch (e) {
        dataset = [];
      }
    }

    var form = root.querySelector('[data-ff-fitment-form]');
    var yearField = root.querySelector('[data-ff-fitment-year]');
    var makeField = root.querySelector('[data-ff-fitment-make]');
    var modelField = root.querySelector('[data-ff-fitment-model]');

    var result = root.querySelector('[data-ff-fitment-result]');
    var panelMatch = root.querySelector('[data-ff-fitment-panel-match]');
    var panelCustom = root.querySelector('[data-ff-fitment-panel-custom]');
    var matchVehicleEl = root.querySelector('[data-ff-fitment-match-vehicle]');
    var matchSizesEl = root.querySelector('[data-ff-fitment-match-sizes]');
    var guideLink = root.querySelector('[data-ff-fitment-guide-link]');
    var hiddenVehicleField = root.querySelector('[data-ff-fitment-hidden-vehicle]');

    var saved = root.querySelector('[data-ff-fitment-saved]');
    var savedLabel = root.querySelector('[data-ff-fitment-saved-label]');
    var changeBtn = root.querySelector('[data-ff-fitment-change]');

    function vehicleLabel(vehicle) {
      return [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
    }

    function showResult(vehicle) {
      var match = findMatch(dataset, vehicle);
      var label = vehicleLabel(vehicle);

      if (hiddenVehicleField) hiddenVehicleField.value = label;

      if (result) result.hidden = false;

      if (match) {
        if (panelMatch) panelMatch.hidden = false;
        if (panelCustom) panelCustom.hidden = true;
        if (matchVehicleEl) matchVehicleEl.textContent = 'Great news — this fits your ' + label + '.';
        if (matchSizesEl) matchSizesEl.textContent = match.sizes || '';
        if (guideLink) {
          if (match.guideUrl) {
            guideLink.href = match.guideUrl;
            guideLink.textContent = match.guideLabel || 'View full fitment guide';
            guideLink.hidden = false;
          } else {
            guideLink.hidden = true;
          }
        }
      } else {
        if (panelMatch) panelMatch.hidden = true;
        if (panelCustom) panelCustom.hidden = false;
      }
    }

    function showSavedChip(vehicle) {
      if (!saved) return;
      if (vehicle) {
        if (savedLabel) savedLabel.textContent = vehicleLabel(vehicle);
        saved.hidden = false;
        if (form) form.hidden = true;
      } else {
        saved.hidden = true;
        if (form) form.hidden = false;
      }
    }

    function applyVehicle(vehicle, opts) {
      opts = opts || {};
      if (yearField) yearField.value = vehicle.year || '';
      if (makeField) makeField.value = vehicle.make || '';
      if (modelField) modelField.value = vehicle.model || '';
      showResult(vehicle);
      if (opts.persist) saveVehicle(vehicle);
      if (opts.collapse) showSavedChip(vehicle);
    }

    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        var vehicle = {
          year: yearField ? yearField.value : '',
          make: makeField ? makeField.value : '',
          model: modelField ? modelField.value : ''
        };
        if (!vehicle.year || !vehicle.make || !vehicle.model) return;
        applyVehicle(vehicle, { persist: true, collapse: true });
        if (result) {
          try {
            result.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {}
        }
      });
    }

    if (changeBtn) {
      changeBtn.addEventListener('click', function () {
        clearVehicle();
        showSavedChip(null);
        if (result) result.hidden = true;
      });
    }

    var existing = readSavedVehicle();
    if (existing && existing.year && existing.make && existing.model) {
      applyVehicle(existing, { collapse: true });
    }
  }

  document.querySelectorAll('[data-ff-fitment]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-fitment]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
