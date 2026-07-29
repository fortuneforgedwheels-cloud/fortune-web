(function () {
  if (window.__ffShopByVehicle) return;
  window.__ffShopByVehicle = true;

  var FINISHES = ['Brushed Clear', 'Polished Clear', 'Gloss Black', 'Satin Black'];

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

  function escHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function normalizeSpec(s) {
    return String(s || '').replace(/\s+/g, ' ').trim();
  }

  function isSquare(front, rear) {
    return normalizeSpec(front).toLowerCase() === normalizeSpec(rear).toLowerCase();
  }

  function vehicleLabel(year, make, model, chassis) {
    return [year, make, model, chassis].filter(Boolean).join(' ');
  }

  /* Strip Apex wheel product references from fitment copy (keep sizes/offsets). */
  function isApexAvailabilityNote(note) {
    return /^\s*available in\b/i.test(String(note || ''));
  }

  function stripApexWheelRefs(text) {
    return String(text || '')
      .replace(/\s*\([^)]*(?:VS-5|EC-?7|ARC-8|SM-10|SM-8|ML-\d|FL-5|SL-\d|TC-10)[^)]*\)/gi, '')
      .replace(/\bAvailable in:?\s*[^.]+(?:\.|$)/gi, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function sanitizeApexNotes(notesArr) {
    return (notesArr || [])
      .filter(function (n) { return !isApexAvailabilityNote(n); })
      .map(stripApexWheelRefs)
      .filter(Boolean)
      .join(' ')
      .trim();
  }

  function sanitizeFitmentNotes(notes, source) {
    var cleaned = source === 'apex' ? stripApexWheelRefs(notes) : String(notes || '').trim();
    if (isApexAvailabilityNote(cleaned)) return '';
    return cleaned;
  }

  /* ── FF slug resolution ── */
  function resolveFfSlug(slug, ffData) {
    if (!ffData || !slug) return null;
    if (ffData.fitments && ffData.fitments[slug]) return slug;
    var alias = ffData.slugAliases && ffData.slugAliases[slug];
    if (alias && ffData.fitments && ffData.fitments[alias]) return alias;
    return null;
  }

  /* ── Apex → selectable configs ── */
  function apexToConfigs(apexTiers) {
    var configs = [];
    (apexTiers || []).forEach(function (cat) {
      (cat.sizes || []).forEach(function (size) {
        if (!size.w || !size.w.length) return;
        var front = '';
        var rear = '';
        size.w.forEach(function (w) {
          var spec = w.diameter + 'x' + w.width + ' ET' + w.offset;
          if (w.axle === 'front') front = spec;
          else if (w.axle === 'rear') rear = spec;
          else { front = spec; rear = spec; }
        });
        if (!front && rear) front = rear;
        if (!rear && front) rear = front;
        var tirePick = '';
        if (size.t && size.t.length) {
          tirePick = size.t.map(function (t) {
            var ax = t.axle === 'front' ? 'F ' : (t.axle === 'rear' ? 'R ' : '');
            return ax + (t.label || (t.width + '/' + t.aspect + '-' + t.diameter));
          }).join(' // ');
        }
        configs.push({
          tier: cat.cat || '',
          config: stripApexWheelRefs(size.label ? size.label.split('\n')[0] : 'Wheel fitment'),
          front: front,
          rear: rear,
          notes: sanitizeApexNotes(size.n),
          tirePick: tirePick,
          tireFlags: '',
          source: 'apex',
        });
      });
    });
    return configs;
  }

  function getFitmentConfigs(slug, ffData, apexData) {
    var ffSlug = resolveFfSlug(slug, ffData);
    if (ffSlug) {
      return { configs: ffData.fitments[ffSlug], source: 'fortune-forged', guideSlug: ffSlug };
    }
    if (apexData && apexData[slug]) {
      return { configs: apexToConfigs(apexData[slug]), source: 'apex', guideSlug: null };
    }
    return { configs: [], source: null, guideSlug: null };
  }

  function isFortuneTopSeller(cfg, guideSlug) {
    if (guideSlug === 'f80') {
      return cfg.tier === 'Aggressive Street'
        && normalizeSpec(cfg.front) === '20x9.5 ET15'
        && normalizeSpec(cfg.rear) === '20x11 ET40';
    }
    if (guideSlug === 'g8x') {
      return cfg.tier === 'Daily Street & OEM+ Bolt-On'
        && normalizeSpec(cfg.front) === '20x10 ET10'
        && normalizeSpec(cfg.rear) === '20x11 ET12';
    }
    return false;
  }

  /* ── fitment card with selectable options ── */
  function renderFitmentCard(container, chassis, configs, source, guideSlug, onPick) {
    container.innerHTML = '';
    if (!configs || !configs.length) {
      container.hidden = true;
      return;
    }

    var sourceLabel = source === 'fortune-forged'
      ? 'Fortune Forged fitment guide'
      : 'Apex fitment guide';

    var html = '<div class="ff-sbv__fitment-header">'
      + '<span class="ff-sbv__fitment-chassis">' + escHtml(chassis) + '</span>'
      + '<span class="ff-sbv__fitment-label">Select a fitment · ' + escHtml(sourceLabel) + '</span>'
      + '</div>'
      + '<div class="ff-sbv__fitment-options">';

    configs.forEach(function (cfg, idx) {
      var specLine;
      var isTopSeller = isFortuneTopSeller(cfg, guideSlug);
      if (isSquare(cfg.front, cfg.rear)) {
        specLine = 'Front &amp; Rear: <strong>' + escHtml(cfg.front) + '</strong>';
      } else {
        specLine = 'Front: <strong>' + escHtml(cfg.front) + '</strong>'
          + ' · Rear: <strong>' + escHtml(cfg.rear) + '</strong>';
      }
      html += '<button type="button" class="ff-sbv__fitment-option'
        + (isTopSeller ? ' ff-sbv__fitment-option--top-seller' : '')
        + '" data-ff-sbv-pick-fitment data-index="' + idx + '">';
      if (isTopSeller) {
        html += '<span class="ff-sbv__fitment-option-badge">Fortune Top Seller</span>';
      }
      html += '<span class="ff-sbv__fitment-option-tier">' + escHtml(cfg.tier) + '</span>'
        + '<span class="ff-sbv__fitment-option-label">' + escHtml(cfg.config) + '</span>'
        + '<span class="ff-sbv__fitment-option-specs">' + specLine + '</span>';
      if (cfg.tirePick) {
        html += '<span class="ff-sbv__fitment-option-tires">Tires: ' + escHtml(cfg.tirePick) + '</span>';
      }
      if (cfg.notes) {
        var noteText = sanitizeFitmentNotes(cfg.notes, source);
        if (noteText) {
          html += '<span class="ff-sbv__fitment-option-notes">' + escHtml(noteText.slice(0, 180)) + (noteText.length > 180 ? '…' : '') + '</span>';
        }
      }
      html += '</button>';
    });

    html += '</div>';
    container.innerHTML = html;
    container.hidden = false;

    container.querySelectorAll('[data-ff-sbv-pick-fitment]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.ff-sbv__fitment-option').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        var idx = Number(btn.getAttribute('data-index'));
        if (onPick && configs[idx]) onPick(configs[idx], idx);
      });
    });
  }

  /* ── design catalog cache ── */
  var designCache = {};

  function loadDesigns(collectionPath) {
    if (designCache[collectionPath]) {
      return Promise.resolve(designCache[collectionPath]);
    }
    var url = collectionPath.replace(/\/$/, '') + '/products.json?limit=50';
    return fetch(url, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : { products: [] }; })
      .then(function (data) {
        var products = (data.products || []).map(function (p) {
          var v = p.variants && p.variants[0];
          return {
            id: p.id,
            title: p.title,
            handle: p.handle,
            variantId: v ? v.id : null,
            image: p.images && p.images[0] ? p.images[0].src : '',
            price: v ? v.price : '',
          };
        }).filter(function (p) { return p.variantId; });
        designCache[collectionPath] = products;
        return products;
      })
      .catch(function () { return []; });
  }

  function renderDesigns(container, products, onSelect) {
    if (!products.length) {
      container.innerHTML = '<p class="ff-sbv__empty">No wheel designs found in this collection. <a href="/collections/all">Browse all wheels</a>.</p>';
      return;
    }
    var html = '';
    products.forEach(function (p, i) {
      html += '<button type="button" class="ff-sbv__design' + (i === 0 ? ' is-selected' : '') + '"'
        + ' data-variant-id="' + p.variantId + '">';
      if (p.image) {
        html += '<img src="' + escHtml(p.image) + '" alt="" loading="lazy" width="80" height="80">';
      }
      html += '<span>' + escHtml(p.title) + '</span></button>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.ff-sbv__design').forEach(function (btn) {
      btn.addEventListener('click', function () {
        container.querySelectorAll('.ff-sbv__design').forEach(function (b) { b.classList.remove('is-selected'); });
        btn.classList.add('is-selected');
        if (onSelect) onSelect(btn);
      });
    });

    if (onSelect) {
      var first = container.querySelector('.ff-sbv__design');
      if (first) onSelect(first);
    }
  }

  /* ── cart builder ── */
  function buildCartItems(state) {
    var items = [];
    var design = state.selectedDesign;
    if (!design || !design.variantId) return items;

    var vehicle = state.vehicleLabel;
    var fit = state.selectedFitment;
    var finish = state.selectedFinish || 'Brushed Clear';
    var note = sanitizeFitmentNotes(fit.notes, fit.source) || fit.tireFlags || '';
    var tireNote = fit.tirePick ? ('Tires: ' + fit.tirePick) : '';
    var fitmentNote = [note, tireNote].filter(Boolean).join(' · ');
    var construction = state.wheelStyle === 'mono' ? 'Monoblock'
      : (state.wheelStyle === 'two' ? '2-Piece' : 'Beadlock');

    var baseProps = {
      'Vehicle': vehicle,
      'Chassis': state.chassis,
      'Bolt Pattern': state.boltPattern || '',
      'Center Bore': state.centerBore || '',
      'Wheel Design': design.title,
      'Construction': construction,
      'Finish': finish,
      'Fitment Tier': fit.tier,
      'Fitment Config': fit.config,
      'Fitment Source': fit.source === 'fortune-forged' ? 'Fortune Forged Guide' : 'Apex Guide',
    };

    if (state.wheelStyle === 'bead') {
      items.push({
        id: Number(design.variantId),
        quantity: 2,
        properties: Object.assign({}, baseProps, {
          'Position': 'Rear pair (beadlock)',
          'Size': fit.rear,
          'Front Size': fit.front,
          'Rear Size': fit.rear,
          'Fitment': fitmentNote,
        }),
      });
      return items;
    }

    if (isSquare(fit.front, fit.rear)) {
      items.push({
        id: Number(design.variantId),
        quantity: 4,
        properties: Object.assign({}, baseProps, {
          'Position': 'Front & Rear (square)',
          'Size': fit.front,
          'Front Size': fit.front,
          'Rear Size': fit.rear,
          'Fitment': fitmentNote,
        }),
      });
      return items;
    }

    items.push({
      id: Number(design.variantId),
      quantity: 2,
      properties: Object.assign({}, baseProps, {
        'Position': 'Front',
        'Size': fit.front,
        'Front Size': fit.front,
        'Rear Size': fit.rear,
        'Fitment': fitmentNote,
      }),
    });
    items.push({
      id: Number(design.variantId),
      quantity: 2,
      properties: Object.assign({}, baseProps, {
        'Position': 'Rear',
        'Size': fit.rear,
        'Front Size': fit.front,
        'Rear Size': fit.rear,
        'Fitment': fitmentNote,
      }),
    });
    return items;
  }

  /* ── main init ── */
  function init(root) {
    root.style.setProperty('--ff-sbv-bg', '#0a0a0a');
    root.style.setProperty('--ff-sbv-pad-y', '10px');

    var catalogUrl    = root.getAttribute('data-catalog-url');
    var fitmentUrl    = root.getAttribute('data-fitment-url');
    var ffFitmentsUrl = root.getAttribute('data-ff-fitments-url');
    var goTarget      = root.getAttribute('data-go-target') || '/#order';
    var colMono       = root.getAttribute('data-collection-mono') || '/collections/monoblock-wheels';
    var colTwo        = root.getAttribute('data-collection-two') || '/collections/two-piece-wheels';
    var colBead       = root.getAttribute('data-collection-bead') || '/collections/beadlock-wheels';

    var form         = root.querySelector('[data-ff-sbv-form]');
    var yearEl       = root.querySelector('[data-ff-sbv-year]');
    var makeEl       = root.querySelector('[data-ff-sbv-make]');
    var modelEl      = root.querySelector('[data-ff-sbv-model]');
    var chassisEl    = root.querySelector('[data-ff-sbv-chassis]');
    var goBtn        = root.querySelector('[data-ff-sbv-go]');
    var specsEl      = root.querySelector('[data-ff-sbv-specs]');
    var specsLine    = root.querySelector('[data-ff-sbv-specs-line]');
    var fitmentCard  = root.querySelector('[data-ff-sbv-fitment]');
    var builder      = root.querySelector('[data-ff-sbv-builder]');
    var builderSub   = root.querySelector('[data-ff-sbv-builder-sub]');
    var stepStyle    = root.querySelector('[data-ff-sbv-step="style"]');
    var stepDesign   = root.querySelector('[data-ff-sbv-step="design"]');
    var stepFinish   = root.querySelector('[data-ff-sbv-step="finish"]');
    var designsEl    = root.querySelector('[data-ff-sbv-designs]');
    var finishesEl   = root.querySelector('[data-ff-sbv-finishes]');
    var addCartBtn   = root.querySelector('[data-ff-sbv-add-cart]');
    var errorEl      = root.querySelector('[data-ff-sbv-error]');

    if (!catalogUrl || !form || !yearEl) return;

    var catalog      = null;
    var apexData     = null;
    var ffData       = null;
    var chassisMap   = {};
    var currentConfigs = [];
    var currentSource  = null;

    var state = {
      selectedFitment: null,
      wheelStyle: null,
      selectedDesign: null,
      selectedFinish: FINISHES[0],
      vehicleLabel: '',
      chassis: '',
      boltPattern: '',
      centerBore: '',
    };

    function selectedChassis() { return chassisMap[chassisEl.value] || null; }

    function resetBuilder() {
      state.selectedFitment = null;
      state.wheelStyle = null;
      state.selectedDesign = null;
      state.selectedFinish = FINISHES[0];
      if (builder) builder.hidden = true;
      if (stepDesign) stepDesign.hidden = true;
      if (stepFinish) stepFinish.hidden = true;
      if (addCartBtn) { addCartBtn.disabled = true; addCartBtn.textContent = 'Add to cart'; }
      if (errorEl) errorEl.hidden = true;
      root.querySelectorAll('.ff-sbv__style').forEach(function (b) { b.classList.remove('is-selected'); });
      root.querySelectorAll('.ff-sbv__finish').forEach(function (b) {
        b.classList.toggle('is-selected', b.getAttribute('data-ff-sbv-finish') === FINISHES[0]);
      });
    }

    function showBuilder(fitment) {
      if (!builder) return;
      var opt = selectedChassis() || {};
      state.selectedFitment = fitment;
      state.vehicleLabel = vehicleLabel(yearEl.value, makeEl.value, modelEl.value, chassisEl.value);
      state.chassis = chassisEl.value;
      state.boltPattern = opt.boltPattern || '';
      state.centerBore = opt.centerBore || '';

      builderSub.textContent = fitment.config + ' · ' + (isSquare(fitment.front, fitment.rear)
        ? fitment.front
        : ('F ' + fitment.front + ' / R ' + fitment.rear));
      builder.hidden = false;
      stepStyle.hidden = false;
      stepDesign.hidden = true;
      stepFinish.hidden = true;
      state.wheelStyle = null;
      state.selectedDesign = null;
      if (addCartBtn) addCartBtn.disabled = true;
      root.querySelectorAll('.ff-sbv__style').forEach(function (b) { b.classList.remove('is-selected'); });
      builder.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function onStyleSelect(style) {
      state.wheelStyle = style;
      state.selectedDesign = null;
      root.querySelectorAll('.ff-sbv__style').forEach(function (b) {
        b.classList.toggle('is-selected', b.getAttribute('data-ff-sbv-style') === style);
      });

      var col = style === 'mono' ? colMono : (style === 'two' ? colTwo : colBead);
      stepDesign.hidden = false;
      stepFinish.hidden = false;
      designsEl.innerHTML = '<p class="ff-sbv__loading">Loading designs…</p>';
      if (addCartBtn) addCartBtn.disabled = true;

      loadDesigns(col).then(function (products) {
        renderDesigns(designsEl, products, function (btn) {
          var titleEl = btn.querySelector('span');
          state.selectedDesign = {
            variantId: btn.getAttribute('data-variant-id'),
            title: titleEl ? titleEl.textContent : '',
          };
          if (addCartBtn) addCartBtn.disabled = false;
        });
      });
    }

    function updateGo() {
      var opt = selectedChassis();
      var ready = !!(yearEl.value && makeEl.value && modelEl.value && chassisEl.value);
      goBtn.disabled = !ready;

      if (!opt) {
        specsEl.hidden = true; specsLine.textContent = '';
        if (fitmentCard) { fitmentCard.innerHTML = ''; fitmentCard.hidden = true; }
        resetBuilder();
        currentConfigs = [];
        return;
      }

      var bits = [];
      if (opt.boltPattern) bits.push('Bolt pattern: <strong>' + escHtml(opt.boltPattern) + '</strong>');
      if (opt.centerBore)  bits.push('Center bore: <strong>' + escHtml(opt.centerBore) + '</strong>');
      if (opt.yearsLabel)  bits.push('Years: ' + escHtml(opt.yearsLabel));
      specsLine.innerHTML = bits.join(' &nbsp;·&nbsp; ');
      specsEl.hidden = bits.length === 0;

      if (!fitmentCard) return;
      var slug = opt.slug || '';

      function render(slugKey) {
        var pack = getFitmentConfigs(slugKey, ffData, apexData);
        currentConfigs = pack.configs;
        currentSource = pack.source;
        if (!pack.configs.length) {
          fitmentCard.innerHTML = '<p class="ff-sbv__empty">No fitment data for this vehicle yet. <a href="/#order">Request a custom quote</a>.</p>';
          fitmentCard.hidden = false;
          resetBuilder();
          return;
        }
        var label = chassisEl.value + (opt.trim && opt.trim !== chassisEl.value ? ' – ' + opt.trim : '');
        renderFitmentCard(fitmentCard, label, pack.configs, pack.source, pack.guideSlug, showBuilder);
      }

      if (ffData || apexData) {
        render(slug);
      } else {
        var pending = 0;
        function done() {
          pending--;
          if (pending <= 0) render(slug);
        }
        if (ffFitmentsUrl && !ffData) {
          pending++;
          fetch(ffFitmentsUrl, { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { ffData = d; })
            .catch(function () {})
            .finally(done);
        }
        if (fitmentUrl && !apexData) {
          pending++;
          fetch(fitmentUrl, { credentials: 'same-origin' })
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) { apexData = d; })
            .catch(function () {})
            .finally(done);
        }
        if (pending === 0) render(slug);
      }
    }

    /* ── cascade ── */
    function onYear() {
      resetDownstream([makeEl, modelEl, chassisEl], ['Make', 'Model', 'Chassis']);
      chassisMap = {};
      resetBuilder();
      if (!yearEl.value || !catalog) { updateGo(); return; }
      fillSelect(makeEl, 'Make', Object.keys(catalog.years[yearEl.value] || {}).sort(), true);
      updateGo();
    }

    function onMake() {
      resetDownstream([modelEl, chassisEl], ['Model', 'Chassis']);
      chassisMap = {};
      resetBuilder();
      if (!makeEl.value) { updateGo(); return; }
      var models = Object.keys(((catalog.years[yearEl.value] || {})[makeEl.value] || {})).sort();
      fillSelect(modelEl, 'Model', models, true);
      updateGo();
    }

    function onModel() {
      resetDownstream([chassisEl], ['Chassis']);
      chassisMap = {};
      resetBuilder();
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

    /* ── style / finish / cart ── */
    root.querySelectorAll('[data-ff-sbv-style]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onStyleSelect(btn.getAttribute('data-ff-sbv-style'));
      });
    });

    if (finishesEl) {
      finishesEl.querySelectorAll('[data-ff-sbv-finish]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          finishesEl.querySelectorAll('.ff-sbv__finish').forEach(function (b) { b.classList.remove('is-selected'); });
          btn.classList.add('is-selected');
          state.selectedFinish = btn.getAttribute('data-ff-sbv-finish');
        });
      });
    }

    if (addCartBtn) {
      addCartBtn.addEventListener('click', function () {
        if (!state.selectedFitment || !state.selectedDesign || !state.wheelStyle) {
          if (errorEl) {
            errorEl.textContent = 'Select a fitment, wheel style, and design first.';
            errorEl.hidden = false;
          }
          return;
        }
        var items = buildCartItems(state);
        if (!items.length) {
          if (errorEl) {
            errorEl.textContent = 'Could not build cart items. Please try another design.';
            errorEl.hidden = false;
          }
          return;
        }

        addCartBtn.disabled = true;
        addCartBtn.textContent = 'Adding…';
        if (errorEl) errorEl.hidden = true;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items }),
        })
          .then(function (r) {
            if (!r.ok) throw new Error('cart-add-failed');
            return r.json();
          })
          .then(function () {
            try {
              sessionStorage.setItem('ffVehicleSelection', JSON.stringify({
                year: yearEl.value, make: makeEl.value, model: modelEl.value,
                chassis: chassisEl.value, slug: (selectedChassis() || {}).slug || '',
                fitment: state.selectedFitment, source: 'shop-by-vehicle',
              }));
            } catch (e) {}
            window.location.href = '/cart';
          })
          .catch(function () {
            addCartBtn.disabled = false;
            addCartBtn.textContent = 'Add to cart';
            if (errorEl) {
              errorEl.textContent = 'Something went wrong adding to cart. Please try again.';
              errorEl.hidden = false;
            }
          });
      });
    }

    /* ── GO scrolls to fitments ── */
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      if (goBtn.disabled) return;
      if (fitmentCard && !fitmentCard.hidden) {
        fitmentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        return;
      }
      var opt = selectedChassis() || {};
      try {
        sessionStorage.setItem('ffVehicleSelection', JSON.stringify({
          year: yearEl.value, make: makeEl.value, model: modelEl.value,
          chassis: chassisEl.value, slug: opt.slug || '', source: 'shop-by-vehicle',
        }));
      } catch (e) {}
      var url;
      try { url = new URL(goTarget, window.location.origin); }
      catch (e) { url = new URL('/#order', window.location.origin); }
      window.location.assign(url.pathname + url.search + (url.hash || '#order'));
    });

    /* ── load catalog + preload fitment data ── */
    fetch(catalogUrl, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        catalog = data;
        fillSelect(yearEl, 'Year', (data.yearList || Object.keys(data.years || {})).map(String), true);
        updateGo();

        window.setTimeout(function () {
          if (ffFitmentsUrl) {
            fetch(ffFitmentsUrl, { credentials: 'same-origin' })
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (d) { ffData = d; })
              .catch(function () {});
          }
          if (fitmentUrl) {
            fetch(fitmentUrl, { credentials: 'same-origin' })
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (d) { apexData = d; })
              .catch(function () {});
          }
        }, 400);
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
