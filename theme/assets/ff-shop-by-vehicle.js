(function () {
  if (window.__ffShopByVehicle) return;
  window.__ffShopByVehicle = true;

  /* ── helpers ── */
  function fillSelect(select, placeholder, values, enable) {
    select.innerHTML = '';
    var o = document.createElement('option');
    o.value = ''; o.textContent = placeholder;
    select.appendChild(o);
    (values || []).forEach(function (v) {
      var opt = document.createElement('option');
      opt.value = v; opt.textContent = v;
      select.appendChild(opt);
    });
    select.disabled = !enable;
    select.value = '';
  }

  function resetDownstream(selects, placeholders) {
    selects.forEach(function (s, i) { fillSelect(s, placeholders[i], [], false); });
  }

  /* ── fitment card renderer ── */
  function renderFitmentCard(container, chassis, fitments) {
    container.innerHTML = '';
    if (!fitments || !fitments.length) {
      container.hidden = true; return;
    }

    // Build unique wheel sizes grouped by category
    var html = '<div class="ff-sbv__fitment-header">'
      + '<span class="ff-sbv__fitment-chassis">' + escHtml(chassis) + '</span>'
      + '<span class="ff-sbv__fitment-label">Compatible wheel sizes</span>'
      + '</div>';

    fitments.forEach(function (cat) {
      if (!cat.sizes || !cat.sizes.length) return;

      html += '<div class="ff-sbv__fitment-cat">';
      html += '<h4 class="ff-sbv__fitment-cat-name">' + escHtml(cat.cat) + '</h4>';

      // Group by diameter for compact display
      var byDia = {};
      cat.sizes.forEach(function (s) {
        s.w.forEach(function (w) {
          var key = w.diameter + '"';
          (byDia[key] = byDia[key] || []).push(w);
        });
      });

      // Build unique size pills
      var pills = {};
      cat.sizes.forEach(function (s) {
        s.w.forEach(function (w) {
          var k = w.diameter + 'x' + w.width;
          if (pills[k]) return;
          var axle = w.axle === 'both' ? '' : (w.axle === 'front' ? 'F ' : 'R ');
          pills[k] = axle + w.diameter + '×' + w.width + '" ET' + w.offset;
        });
      });

      if (Object.keys(pills).length) {
        html += '<div class="ff-sbv__fitment-pills">';
        Object.values(pills).forEach(function (pill) {
          html += '<span class="ff-sbv__fitment-pill">' + escHtml(pill) + '</span>';
        });
        html += '</div>';
      }

      // Tire picks
      var tireLines = [];
      cat.sizes.forEach(function (s) {
        if (s.t && s.t.length) {
          var staffIdx = s.n ? s.n.findIndex(function (n) {
            return n.toLowerCase().includes('staff pick');
          }) : -1;
          s.t.forEach(function (t) {
            var prefix = s.label && s.label.toLowerCase().includes('staff pick') ? '★ ' : '';
            var ax = t.axle === 'front' ? 'F ' : (t.axle === 'rear' ? 'R ' : '');
            var line = prefix + ax + t.width + '/' + t.aspect + '-' + t.diameter;
            if (!tireLines.includes(line)) tireLines.push(line);
          });
        }
      });
      if (tireLines.length) {
        html += '<div class="ff-sbv__fitment-tires">';
        html += '<span class="ff-sbv__fitment-tires-label">Tires: </span>';
        tireLines.slice(0, 6).forEach(function (t) {
          html += '<span class="ff-sbv__fitment-tire-pill">' + escHtml(t) + '</span>';
        });
        html += '</div>';
      }

      html += '</div>';
    });

    container.innerHTML = html;
    container.hidden = false;
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ── main init ── */
  function init(root) {
    var catalogUrl   = root.getAttribute('data-catalog-url');
    var fitmentUrl   = root.getAttribute('data-fitment-url');
    var goTarget     = root.getAttribute('data-go-target') || '/#order';
    var form         = root.querySelector('[data-ff-sbv-form]');
    var yearEl       = root.querySelector('[data-ff-sbv-year]');
    var makeEl       = root.querySelector('[data-ff-sbv-make]');
    var modelEl      = root.querySelector('[data-ff-sbv-model]');
    var chassisEl    = root.querySelector('[data-ff-sbv-chassis]');
    var goBtn        = root.querySelector('[data-ff-sbv-go]');
    var specsEl      = root.querySelector('[data-ff-sbv-specs]');
    var specsLine    = root.querySelector('[data-ff-sbv-specs-line]');
    var fitmentCard  = root.querySelector('[data-ff-sbv-fitment]');
    if (!catalogUrl || !form || !yearEl) return;

    var catalog     = null;
    var fitmentData = null;
    var chassisMap  = {};

    function selectedChassis() { return chassisMap[chassisEl.value] || null; }

    function updateGo() {
      var opt = selectedChassis();
      var ready = !!(yearEl.value && makeEl.value && modelEl.value && chassisEl.value);
      goBtn.disabled = !ready;

      if (!opt) {
        specsEl.hidden = true; specsLine.textContent = '';
        if (fitmentCard) { fitmentCard.innerHTML = ''; fitmentCard.hidden = true; }
        return;
      }

      var bits = [];
      if (opt.boltPattern) bits.push('Bolt pattern: <strong>' + escHtml(opt.boltPattern) + '</strong>');
      if (opt.centerBore)  bits.push('Center bore: <strong>' + escHtml(opt.centerBore) + '</strong>');
      if (opt.yearsLabel)  bits.push('Years: ' + escHtml(opt.yearsLabel));
      specsLine.innerHTML = bits.join(' &nbsp;·&nbsp; ');
      specsEl.hidden = bits.length === 0;

      if (fitmentCard) {
        var slug = opt.slug || '';
        if (fitmentData && fitmentData[slug]) {
          renderFitmentCard(fitmentCard, chassisEl.value + (opt.trim && opt.trim !== chassisEl.value ? ' – ' + opt.trim : ''), fitmentData[slug]);
        } else if (opt.hasFitment && fitmentUrl && !fitmentData) {
          // lazy-load fitment file on first chassis selection
          loadFitments(function () {
            if (fitmentData && fitmentData[slug]) {
              renderFitmentCard(fitmentCard, chassisEl.value, fitmentData[slug]);
            }
          });
        } else {
          fitmentCard.innerHTML = '';
          fitmentCard.hidden = true;
        }
      }
    }

    function loadFitments(cb) {
      fetch(fitmentUrl, { credentials: 'same-origin' })
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) {
          if (data) fitmentData = data;
          if (cb) cb();
        })
        .catch(function () {});
    }

    /* ── cascade ── */
    function onYear() {
      resetDownstream([makeEl, modelEl, chassisEl], ['Make', 'Model', 'Chassis']);
      chassisMap = {};
      if (!yearEl.value || !catalog) { updateGo(); return; }
      var makes = Object.keys(catalog.years[yearEl.value] || {}).sort();
      fillSelect(makeEl, 'Make', makes, true);
      updateGo();
    }

    function onMake() {
      resetDownstream([modelEl, chassisEl], ['Model', 'Chassis']);
      chassisMap = {};
      if (!makeEl.value) { updateGo(); return; }
      var models = Object.keys(((catalog.years[yearEl.value] || {})[makeEl.value] || {})).sort();
      fillSelect(modelEl, 'Model', models, true);
      updateGo();
    }

    function onModel() {
      resetDownstream([chassisEl], ['Chassis']);
      chassisMap = {};
      if (!modelEl.value) { updateGo(); return; }
      var opts = (((catalog.years[yearEl.value] || {})[makeEl.value] || {})[modelEl.value] || []);
      var labels = opts.map(function (opt) {
        var label = opt.chassis || opt.trim || 'Standard';
        chassisMap[label] = opt;
        return label;
      });
      fillSelect(chassisEl, 'Chassis', labels, true);
      if (labels.length === 1) { chassisEl.value = labels[0]; chassisEl.dispatchEvent(new Event('change')); }
      updateGo();
    }

    yearEl.addEventListener('change', onYear);
    makeEl.addEventListener('change', onMake);
    modelEl.addEventListener('change', onModel);
    chassisEl.addEventListener('change', updateGo);

    /* ── GO ── */
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (goBtn.disabled) return;
      var opt = selectedChassis() || {};
      var payload = {
        year: yearEl.value, make: makeEl.value,
        model: modelEl.value, chassis: chassisEl.value,
        trim: opt.trim || chassisEl.value,
        boltPattern: opt.boltPattern || '',
        centerBore: opt.centerBore || '',
        yearsLabel: opt.yearsLabel || '',
        submodels: opt.submodels || [],
        slug: opt.slug || '',
        source: 'shop-by-vehicle',
      };
      try { sessionStorage.setItem('ffVehicleSelection', JSON.stringify(payload)); } catch (e) {}
      var url;
      try { url = new URL(goTarget, window.location.origin); }
      catch (e) { url = new URL('/#order', window.location.origin); }
      url.searchParams.set('year', payload.year);
      url.searchParams.set('make', payload.make);
      url.searchParams.set('model', payload.model);
      url.searchParams.set('chassis', payload.chassis);
      if (payload.boltPattern) url.searchParams.set('bolt', payload.boltPattern);
      if (payload.centerBore)  url.searchParams.set('bore', payload.centerBore);
      window.location.assign(url.pathname + url.search + (url.hash || '#order'));
    });

    /* ── load catalog ── */
    fetch(catalogUrl, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        catalog = data;
        var years = (data.yearList || Object.keys(data.years || {})).map(String);
        fillSelect(yearEl, 'Year', years, true);
        updateGo();

        // pre-load fitment data in background after catalog is ready
        if (fitmentUrl) {
          window.setTimeout(function () {
            loadFitments(null);
          }, 800);
        }
      })
      .catch(function () { fillSelect(yearEl, 'Year unavailable', [], false); });
  }

  function boot() {
    document.querySelectorAll('[data-ff-sbv]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
