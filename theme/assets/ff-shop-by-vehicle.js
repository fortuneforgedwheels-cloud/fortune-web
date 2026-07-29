(function () {
  if (window.__ffShopByVehicle) return;
  window.__ffShopByVehicle = true;

  function fillSelect(select, placeholder, values, enable) {
    select.innerHTML = '';
    var opt0 = document.createElement('option');
    opt0.value = '';
    opt0.textContent = placeholder;
    select.appendChild(opt0);
    (values || []).forEach(function (value) {
      var opt = document.createElement('option');
      opt.value = value;
      opt.textContent = value;
      select.appendChild(opt);
    });
    select.disabled = !enable;
    select.value = '';
  }

  function resetDownstream(selects, placeholders) {
    selects.forEach(function (select, i) {
      fillSelect(select, placeholders[i], [], false);
    });
  }

  function init(root) {
    var catalogUrl = root.getAttribute('data-catalog-url');
    var goTarget = root.getAttribute('data-go-target') || '/#order';
    var form = root.querySelector('[data-ff-sbv-form]');
    var yearEl = root.querySelector('[data-ff-sbv-year]');
    var makeEl = root.querySelector('[data-ff-sbv-make]');
    var modelEl = root.querySelector('[data-ff-sbv-model]');
    var chassisEl = root.querySelector('[data-ff-sbv-chassis]');
    var goBtn = root.querySelector('[data-ff-sbv-go]');
    var specs = root.querySelector('[data-ff-sbv-specs]');
    var specsLine = root.querySelector('[data-ff-sbv-specs-line]');
    if (!catalogUrl || !form || !yearEl) return;

    var catalog = null;
    var chassisMap = {};

    function selectedChassis() {
      return chassisMap[chassisEl.value] || null;
    }

    function updateGo() {
      var ready = !!(yearEl.value && makeEl.value && modelEl.value && chassisEl.value);
      goBtn.disabled = !ready;
      var option = selectedChassis();
      if (!option) {
        specs.hidden = true;
        specsLine.textContent = '';
        return;
      }
      var bits = [];
      if (option.boltPattern) bits.push('Bolt pattern ' + option.boltPattern);
      if (option.centerBore) bits.push('Center bore ' + option.centerBore);
      if (option.yearsLabel) bits.push('Years ' + option.yearsLabel);
      if (option.submodels && option.submodels.length) {
        bits.push('Includes ' + option.submodels.join(', '));
      }
      specsLine.textContent = bits.join(' · ');
      specs.hidden = bits.length === 0;
    }

    function onYear() {
      resetDownstream([makeEl, modelEl, chassisEl], ['Make', 'Model', 'Chassis']);
      chassisMap = {};
      if (!yearEl.value || !catalog) {
        updateGo();
        return;
      }
      var makes = Object.keys(catalog.years[yearEl.value] || {}).sort();
      fillSelect(makeEl, 'Make', makes, true);
      updateGo();
    }

    function onMake() {
      resetDownstream([modelEl, chassisEl], ['Model', 'Chassis']);
      chassisMap = {};
      if (!makeEl.value) {
        updateGo();
        return;
      }
      var models = Object.keys((catalog.years[yearEl.value] || {})[makeEl.value] || {}).sort();
      fillSelect(modelEl, 'Model', models, true);
      updateGo();
    }

    function onModel() {
      resetDownstream([chassisEl], ['Chassis']);
      chassisMap = {};
      if (!modelEl.value) {
        updateGo();
        return;
      }
      var options =
        (((catalog.years[yearEl.value] || {})[makeEl.value] || {})[modelEl.value] || []);
      var labels = options.map(function (opt) {
        var label = opt.chassis || opt.trim || 'Standard';
        chassisMap[label] = opt;
        return label;
      });
      fillSelect(chassisEl, 'Chassis', labels, true);
      if (labels.length === 1) {
        chassisEl.value = labels[0];
        chassisEl.dispatchEvent(new Event('change'));
      }
      updateGo();
    }

    yearEl.addEventListener('change', onYear);
    makeEl.addEventListener('change', onMake);
    modelEl.addEventListener('change', onModel);
    chassisEl.addEventListener('change', updateGo);

    form.addEventListener('submit', function (event) {
      event.preventDefault();
      if (goBtn.disabled) return;
      var option = selectedChassis() || {};
      var payload = {
        year: yearEl.value,
        make: makeEl.value,
        model: modelEl.value,
        chassis: chassisEl.value,
        trim: option.trim || chassisEl.value,
        boltPattern: option.boltPattern || '',
        centerBore: option.centerBore || '',
        yearsLabel: option.yearsLabel || '',
        submodels: option.submodels || [],
        slug: option.slug || '',
        source: 'shop-by-vehicle'
      };
      try {
        sessionStorage.setItem('ffVehicleSelection', JSON.stringify(payload));
      } catch (e) {}

      var url;
      try {
        url = new URL(goTarget, window.location.origin);
      } catch (e) {
        url = new URL('/#order', window.location.origin);
      }
      url.searchParams.set('year', payload.year);
      url.searchParams.set('make', payload.make);
      url.searchParams.set('model', payload.model);
      url.searchParams.set('chassis', payload.chassis);
      if (payload.boltPattern) url.searchParams.set('bolt', payload.boltPattern);
      if (payload.centerBore) url.searchParams.set('bore', payload.centerBore);

      window.location.assign(url.pathname + url.search + (url.hash || '#order'));
    });

    fetch(catalogUrl, { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('catalog ' + res.status);
        return res.json();
      })
      .then(function (data) {
        catalog = data;
        var years = (data.yearList || Object.keys(data.years || {})).map(String);
        fillSelect(yearEl, 'Year', years, true);
        updateGo();
      })
      .catch(function () {
        fillSelect(yearEl, 'Year unavailable', [], false);
      });
  }

  function boot() {
    document.querySelectorAll('[data-ff-sbv]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
