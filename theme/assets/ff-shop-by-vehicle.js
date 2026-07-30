(function () {
  if (window.__ffShopByVehicle) return;
  window.__ffShopByVehicle = true;

  var DEFAULT_FINISH = 'Brushed Silver';
  var DEFAULT_HARDWARE = 'Silver';

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

  function populateFinishSelect(select, placeholder) {
    if (!select) return;
    select.innerHTML = '';
    var ph = document.createElement('option');
    ph.value = '';
    ph.textContent = placeholder || 'Select finish…';
    select.appendChild(ph);
    FINISH_GROUPS.forEach(function (group) {
      var og = document.createElement('optgroup');
      og.label = group.label;
      group.options.forEach(function (name) {
        var opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        og.appendChild(opt);
      });
      select.appendChild(og);
    });
  }

  function resetFinishSelect(select, placeholder) {
    populateFinishSelect(select, placeholder);
    select.value = '';
  }

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

  function isFortuneCertified(cfg, guideSlug) {
    if (guideSlug === 'g20-g21') {
      return cfg.tier === 'Performance Street & Track — Square'
        && normalizeSpec(cfg.front) === '19x9 ET25'
        && normalizeSpec(cfg.rear) === '19x9 ET25';
    }
    return false;
  }

  function fitmentBadge(cfg, guideSlug) {
    if (isFortuneCertified(cfg, guideSlug)) {
      return { label: 'Fortune Certified', className: 'ff-sbv__fitment-option--certified', priority: 2 };
    }
    if (isFortuneTopSeller(cfg, guideSlug)) {
      return { label: 'Fortune Top Seller', className: 'ff-sbv__fitment-option--top-seller', priority: 1 };
    }
    return null;
  }

  function getFitmentLayout(cfg) {
    var hay = [cfg.tier, cfg.config, cfg.notes, cfg.tireFlags].filter(Boolean).join(' ');
    if (/\bbead\s*lock|\bbeadlock\b/i.test(hay)) return 'beadlock';
    if (isSquare(cfg.front, cfg.rear)) return 'square';
    return 'staggered';
  }

  function filterFitmentsByLayout(configs, layout) {
    return (configs || []).filter(function (cfg) {
      return getFitmentLayout(cfg) === layout;
    });
  }

  function sortFitmentsWithBadgesFirst(configs, guideSlug) {
    return (configs || []).map(function (cfg, idx) {
      return { cfg: cfg, idx: idx, badge: fitmentBadge(cfg, guideSlug) };
    }).sort(function (a, b) {
      var pa = a.badge ? a.badge.priority : 0;
      var pb = b.badge ? b.badge.priority : 0;
      if (pb !== pa) return pb - pa;
      return a.idx - b.idx;
    }).map(function (row) { return row.cfg; });
  }

  /* ── fitment card with selectable options ── */
  function renderFitmentCard(container, chassis, configs, source, guideSlug, onPick) {
    container.innerHTML = '';
    container.classList.remove('is-collapsed');
    if (!configs || !configs.length) {
      container.hidden = true;
      return;
    }

    var ordered = sortFitmentsWithBadgesFirst(configs, guideSlug);
    var sourceLabel = source === 'fortune-forged'
      ? 'Fortune Forged fitment guide'
      : 'Apex fitment guide';

    var html = '<div class="ff-sbv__fitment-header">'
      + '<div class="ff-sbv__fitment-header-text">'
      + '<span class="ff-sbv__fitment-chassis">' + escHtml(chassis) + '</span>'
      + '<span class="ff-sbv__fitment-label" data-ff-sbv-fitment-label>Select a fitment · ' + escHtml(sourceLabel) + '</span>'
      + '</div>'
      + '<button type="button" class="ff-sbv__fitment-toggle" data-ff-sbv-fitment-toggle hidden>Change fitment</button>'
      + '</div>'
      + '<div class="ff-sbv__fitment-options">';

    ordered.forEach(function (cfg, idx) {
      var specLine;
      var badge = fitmentBadge(cfg, guideSlug);
      if (isSquare(cfg.front, cfg.rear)) {
        specLine = 'Front &amp; Rear: <strong>' + escHtml(cfg.front) + '</strong>';
      } else {
        specLine = 'Front: <strong>' + escHtml(cfg.front) + '</strong>'
          + ' · Rear: <strong>' + escHtml(cfg.rear) + '</strong>';
      }
      html += '<button type="button" class="ff-sbv__fitment-option'
        + (badge ? ' ' + badge.className : '')
        + '" data-ff-sbv-pick-fitment data-index="' + idx + '">';
      if (badge) {
        html += '<span class="ff-sbv__fitment-option-badge">' + escHtml(badge.label) + '</span>';
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

    var labelEl = container.querySelector('[data-ff-sbv-fitment-label]');
    var toggleBtn = container.querySelector('[data-ff-sbv-fitment-toggle]');

    function collapseToSelected(btn) {
      container.classList.add('is-collapsed');
      container.querySelectorAll('.ff-sbv__fitment-option').forEach(function (b) {
        b.hidden = !b.classList.contains('is-selected');
      });
      if (labelEl) labelEl.textContent = 'Selected fitment';
      if (toggleBtn) {
        toggleBtn.hidden = false;
        toggleBtn.textContent = 'Change fitment';
      }
    }

    function expandAll() {
      container.classList.remove('is-collapsed');
      container.querySelectorAll('.ff-sbv__fitment-option').forEach(function (b) {
        b.hidden = false;
      });
      if (labelEl) labelEl.textContent = 'Select a fitment · ' + sourceLabel;
      if (toggleBtn) {
        toggleBtn.hidden = true;
        toggleBtn.textContent = 'Change fitment';
      }
    }

    if (toggleBtn) {
      toggleBtn.addEventListener('click', function () {
        if (container.classList.contains('is-collapsed')) expandAll();
        else {
          var selected = container.querySelector('.ff-sbv__fitment-option.is-selected');
          if (selected) collapseToSelected(selected);
        }
      });
    }

    container.querySelectorAll('[data-ff-sbv-pick-fitment]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        if (container.classList.contains('is-collapsed') && btn.classList.contains('is-selected')) {
          expandAll();
          return;
        }
        container.querySelectorAll('.ff-sbv__fitment-option').forEach(function (b) {
          b.classList.remove('is-selected');
        });
        btn.classList.add('is-selected');
        collapseToSelected(btn);
        var idx = Number(btn.getAttribute('data-index'));
        if (onPick && ordered[idx]) onPick(ordered[idx], idx);
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
    var finish = state.selectedFinish || '';
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
      'Fitment Tier': fit.tier,
      'Fitment Config': fit.config,
      'Fitment Source': fit.source === 'fortune-forged' ? 'Fortune Forged Guide' : 'Apex Guide',
    };

    if (state.wheelStyle === 'two') {
      baseProps['Face Finish'] = state.faceFinish || '';
      baseProps['Barrel Finish'] = state.barrelFinish || '';
      baseProps['Finish'] = finish || ('Face: ' + state.faceFinish + ' / Barrel: ' + state.barrelFinish);
      baseProps['Hardware'] = state.hardware || DEFAULT_HARDWARE;
    } else {
      baseProps['Finish'] = finish;
    }

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

  function findChassisOption(cat, year, make, model, chassisLabel) {
    var opts = (((cat.years[year] || {})[make] || {})[model] || []);
    for (var i = 0; i < opts.length; i++) {
      var label = opts[i].chassis || opts[i].trim || 'Standard';
      if (label === chassisLabel) return opts[i];
    }
    return null;
  }

  function getVehicleFromQuery() {
    var params = new URLSearchParams(window.location.search);
    return {
      year: params.get('year') || '',
      make: params.get('make') || '',
      model: params.get('model') || '',
      chassis: params.get('chassis') || '',
      slug: params.get('slug') || '',
      boltPattern: params.get('bolt') || '',
      centerBore: params.get('bore') || '',
    };
  }

  /* ── main init ── */
  function init(root) {
    root.style.setProperty('--ff-sbv-bg', '#0a0a0a');
    root.style.setProperty('--ff-sbv-pad-y', '10px');

    var isCompact     = root.getAttribute('data-sbv-mode') === 'compact';
    var buildUrl      = root.getAttribute('data-build-url') || '/pages/shop-by-vehicle?view=shop-by-vehicle-build';
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
    var layoutChooser = root.querySelector('[data-ff-sbv-layout-chooser]');
    var fitmentCard  = root.querySelector('[data-ff-sbv-fitment]');
    var builder      = root.querySelector('[data-ff-sbv-builder]');
    var builderSub   = root.querySelector('[data-ff-sbv-builder-sub]');
    var stepStyle    = root.querySelector('[data-ff-sbv-step="style"]');
    var stepDesign   = root.querySelector('[data-ff-sbv-step="design"]');
    var stepFinish   = root.querySelector('[data-ff-sbv-step="finish"]');
    var designsEl    = root.querySelector('[data-ff-sbv-designs]');
    var finishSingle = root.querySelector('[data-ff-sbv-finish-single]');
    var finishTwo    = root.querySelector('[data-ff-sbv-finish-twopiece]');
    var finishSelect = root.querySelector('[data-ff-sbv-finish-select]');
    var faceFinishSelect = root.querySelector('[data-ff-sbv-face-finish-select]');
    var barrelFinishSelect = root.querySelector('[data-ff-sbv-barrel-finish-select]');
    var hardwarePanel = root.querySelector('[data-ff-sbv-hardware-panel]');
    var hardwareSelect = root.querySelector('[data-ff-sbv-hardware-select]');
    var addCartBtn   = root.querySelector('[data-ff-sbv-add-cart]');
    var errorEl      = root.querySelector('[data-ff-sbv-error]');
    var pageVehicleEl = root.querySelector('[data-ff-sbv-page-vehicle]');

    if (!catalogUrl) return;
    if (isCompact && (!form || !yearEl)) return;
    if (!isCompact && !fitmentCard) return;

    var catalog      = null;
    var apexData     = null;
    var ffData       = null;
    var chassisMap   = {};
    var vehicleOpt   = null;
    var currentConfigs = [];
    var currentSource  = null;
    var currentGuideSlug = null;
    var currentChassisLabel = '';
    var selectedLayout = '';

    var state = {
      selectedFitment: null,
      wheelStyle: null,
      selectedDesign: null,
      selectedFinish: '',
      faceFinish: '',
      barrelFinish: '',
      hardware: '',
      vehicleLabel: '',
      chassis: '',
      boltPattern: '',
      centerBore: '',
    };

    if (finishSelect) populateFinishSelect(finishSelect, 'Select finish…');
    if (faceFinishSelect) populateFinishSelect(faceFinishSelect, 'Select face finish…');
    if (barrelFinishSelect) populateFinishSelect(barrelFinishSelect, 'Select barrel finish…');
    if (hardwareSelect) hardwareSelect.value = DEFAULT_HARDWARE;

    function selectedChassis() {
      if (chassisEl && chassisMap[chassisEl.value]) return chassisMap[chassisEl.value];
      return vehicleOpt;
    }

    function updatePageVehicle() {
      if (pageVehicleEl && state.vehicleLabel) {
        pageVehicleEl.textContent = state.vehicleLabel;
      }
    }

    function showVehicleSpecs(opt) {
      if (!specsEl || !specsLine) return;
      var bits = [];
      if (opt.boltPattern) bits.push('Bolt pattern: <strong>' + escHtml(opt.boltPattern) + '</strong>');
      if (opt.centerBore)  bits.push('Center bore: <strong>' + escHtml(opt.centerBore) + '</strong>');
      if (opt.yearsLabel)  bits.push('Years: ' + escHtml(opt.yearsLabel));
      specsLine.innerHTML = bits.join(' &nbsp;·&nbsp; ');
      specsEl.hidden = bits.length === 0;
    }

    function showLayoutChooser() {
      selectedLayout = '';
      if (layoutChooser) {
        layoutChooser.hidden = false;
        layoutChooser.querySelectorAll('.ff-sbv__layout-option').forEach(function (btn) {
          btn.classList.remove('is-selected');
        });
      }
      if (fitmentCard) {
        fitmentCard.innerHTML = '';
        fitmentCard.hidden = true;
      }
      resetBuilder();
    }

    function renderFilteredFitments(layout) {
      selectedLayout = layout;
      if (!fitmentCard) return;

      if (layoutChooser) {
        layoutChooser.querySelectorAll('.ff-sbv__layout-option').forEach(function (btn) {
          btn.classList.toggle('is-selected', btn.getAttribute('data-ff-sbv-layout') === layout);
        });
      }

      var filtered = filterFitmentsByLayout(currentConfigs, layout);
      resetBuilder();

      if (!filtered.length) {
        var layoutLabel = layout === 'square' ? 'square' : layout;
        fitmentCard.innerHTML = '<p class="ff-sbv__empty">No '
          + escHtml(layoutLabel)
          + ' fitments for this vehicle yet. Pick another layout or <a href="/#order">request a custom quote</a>.</p>';
        fitmentCard.hidden = false;
        return;
      }

      var label = currentChassisLabel;
      renderFitmentCard(fitmentCard, label, filtered, currentSource, currentGuideSlug, showBuilder);
      fitmentCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function renderFitmentsForVehicle(opt, chassisLabel) {
      if (!fitmentCard || !opt) return;
      var slug = opt.slug || '';
      currentChassisLabel = chassisLabel + (opt.trim && opt.trim !== chassisLabel ? ' – ' + opt.trim : '');

      function prepare(slugKey) {
        var pack = getFitmentConfigs(slugKey, ffData, apexData);
        currentConfigs = pack.configs;
        currentSource = pack.source;
        currentGuideSlug = pack.guideSlug;
        if (!pack.configs.length) {
          if (layoutChooser) layoutChooser.hidden = true;
          fitmentCard.innerHTML = '<p class="ff-sbv__empty">No fitment data for this vehicle yet. <a href="/#order">Request a custom quote</a>.</p>';
          fitmentCard.hidden = false;
          resetBuilder();
          return;
        }
        showLayoutChooser();
      }

      if (ffData || apexData) {
        prepare(slug);
        return;
      }
      var pending = 0;
      function done() {
        pending--;
        if (pending <= 0) prepare(slug);
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
      if (pending === 0) prepare(slug);
    }

    function initBuildFromQuery() {
      var v = getVehicleFromQuery();
      if (!v.year || !v.make || !v.model || !v.chassis) {
        if (pageVehicleEl) {
          pageVehicleEl.innerHTML = 'No vehicle selected. <a href="/">Return home</a> to choose your vehicle.';
        }
        if (fitmentCard) {
          fitmentCard.hidden = false;
          fitmentCard.innerHTML = '<p class="ff-sbv__empty">No vehicle selected. <a href="/">Go back home</a> and use Shop By Vehicle.</p>';
        }
        return;
      }

      var opt = catalog ? findChassisOption(catalog, v.year, v.make, v.model, v.chassis) : null;
      if (!opt) {
        opt = {
          chassis: v.chassis,
          trim: v.chassis,
          slug: v.slug || '',
          boltPattern: v.boltPattern || '',
          centerBore: v.centerBore || '',
          yearsLabel: '',
        };
      }

      vehicleOpt = opt;
      state.vehicleLabel = vehicleLabel(v.year, v.make, v.model, v.chassis);
      state.chassis = v.chassis;
      state.boltPattern = opt.boltPattern || v.boltPattern || '';
      state.centerBore = opt.centerBore || v.centerBore || '';
      updatePageVehicle();
      showVehicleSpecs(opt);
      renderFitmentsForVehicle(opt, v.chassis);
    }

    function readFinishState() {
      if (state.wheelStyle === 'two') {
        state.faceFinish = faceFinishSelect ? faceFinishSelect.value : '';
        state.barrelFinish = barrelFinishSelect ? barrelFinishSelect.value : '';
        state.selectedFinish = state.faceFinish && state.barrelFinish
          ? ('Face: ' + state.faceFinish + ' / Barrel: ' + state.barrelFinish)
          : '';
      } else {
        state.selectedFinish = finishSelect ? finishSelect.value : '';
        state.faceFinish = '';
        state.barrelFinish = '';
      }
      state.hardware = (state.wheelStyle === 'two' && hardwareSelect)
        ? hardwareSelect.value
        : '';
    }

    function finishesValid() {
      readFinishState();
      if (state.wheelStyle === 'two') {
        return !!(state.faceFinish && state.barrelFinish && state.hardware);
      }
      return !!state.selectedFinish;
    }

    function updateAddCartState() {
      if (!addCartBtn) return;
      addCartBtn.disabled = !(state.selectedDesign && state.selectedDesign.variantId && finishesValid());
    }

    function setFinishMode(style) {
      var isTwo = style === 'two';
      if (finishSingle) finishSingle.hidden = isTwo;
      if (finishTwo) finishTwo.hidden = !isTwo;
      if (hardwarePanel) hardwarePanel.hidden = !isTwo;
      if (finishSelect) resetFinishSelect(finishSelect, 'Select finish…');
      if (faceFinishSelect) resetFinishSelect(faceFinishSelect, 'Select face finish…');
      if (barrelFinishSelect) resetFinishSelect(barrelFinishSelect, 'Select barrel finish…');
      if (hardwareSelect) hardwareSelect.value = DEFAULT_HARDWARE;
      state.selectedFinish = '';
      state.faceFinish = '';
      state.barrelFinish = '';
      state.hardware = isTwo ? DEFAULT_HARDWARE : '';
      updateAddCartState();
    }

    function resetBuilder() {
      state.selectedFitment = null;
      state.wheelStyle = null;
      state.selectedDesign = null;
      state.selectedFinish = '';
      state.faceFinish = '';
      state.barrelFinish = '';
      state.hardware = '';
      if (builder) builder.hidden = true;
      if (stepDesign) stepDesign.hidden = true;
      if (stepFinish) stepFinish.hidden = true;
      if (addCartBtn) { addCartBtn.disabled = true; addCartBtn.textContent = 'Add to cart'; }
      if (errorEl) errorEl.hidden = true;
      root.querySelectorAll('.ff-sbv__style').forEach(function (b) { b.classList.remove('is-selected'); });
      setFinishMode('mono');
    }

    function showBuilder(fitment) {
      if (!builder) return;
      var opt = selectedChassis() || {};
      state.selectedFitment = Object.assign({}, fitment, { source: currentSource });
      if (yearEl && makeEl && modelEl && chassisEl) {
        state.vehicleLabel = vehicleLabel(yearEl.value, makeEl.value, modelEl.value, chassisEl.value);
        state.chassis = chassisEl.value;
        state.boltPattern = opt.boltPattern || '';
        state.centerBore = opt.centerBore || '';
      }

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

      setFinishMode(style);
      var col = style === 'mono' ? colMono : (style === 'two' ? colTwo : colBead);
      stepDesign.hidden = false;
      stepFinish.hidden = false;
      designsEl.innerHTML = '<p class="ff-sbv__loading">Loading designs…</p>';
      updateAddCartState();

      loadDesigns(col).then(function (products) {
        renderDesigns(designsEl, products, function (btn) {
          var titleEl = btn.querySelector('span');
          state.selectedDesign = {
            variantId: btn.getAttribute('data-variant-id'),
            title: titleEl ? titleEl.textContent : '',
          };
          updateAddCartState();
        });
      });
    }

    function updateGo() {
      if (!goBtn || !yearEl || !makeEl || !modelEl || !chassisEl) return;
      var ready = !!(yearEl.value && makeEl.value && modelEl.value && chassisEl.value);
      goBtn.disabled = !ready;
    }

    /* ── cascade (compact homepage only) ── */
    function onYear() {
      resetDownstream([makeEl, modelEl, chassisEl], ['Make', 'Model', 'Chassis']);
      chassisMap = {};
      if (!yearEl.value || !catalog) { updateGo(); return; }
      fillSelect(makeEl, 'Make', Object.keys(catalog.years[yearEl.value] || {}).sort(), true);
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

    if (form && yearEl && makeEl && modelEl && chassisEl) {
      yearEl.addEventListener('change', onYear);
      makeEl.addEventListener('change', onMake);
      modelEl.addEventListener('change', onModel);
      chassisEl.addEventListener('change', updateGo);
    }

    /* ── layout chooser / style / finish / cart ── */
    root.querySelectorAll('[data-ff-sbv-layout]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        renderFilteredFitments(btn.getAttribute('data-ff-sbv-layout'));
      });
    });

    root.querySelectorAll('[data-ff-sbv-style]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        onStyleSelect(btn.getAttribute('data-ff-sbv-style'));
      });
    });

    [finishSelect, faceFinishSelect, barrelFinishSelect, hardwareSelect].forEach(function (el) {
      if (!el) return;
      el.addEventListener('change', updateAddCartState);
    });

    if (addCartBtn) {
      addCartBtn.addEventListener('click', function () {
        if (!state.selectedFitment || !state.selectedDesign || !state.wheelStyle) {
          if (errorEl) {
            errorEl.textContent = 'Select a fitment, wheel style, and design first.';
            errorEl.hidden = false;
          }
          return;
        }
        if (!finishesValid()) {
          if (errorEl) {
            errorEl.textContent = state.wheelStyle === 'two'
              ? 'Select face finish, barrel finish, and hardware before adding to cart.'
              : 'Select a finish before adding to cart.';
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
              var v = getVehicleFromQuery();
              sessionStorage.setItem('ffVehicleSelection', JSON.stringify({
                year: yearEl ? yearEl.value : v.year,
                make: makeEl ? makeEl.value : v.make,
                model: modelEl ? modelEl.value : v.model,
                chassis: chassisEl ? chassisEl.value : v.chassis,
                slug: (selectedChassis() || {}).slug || v.slug || '',
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

    function navigateToBuildPage() {
      var opt = selectedChassis() || {};
      var dest;
      try {
        dest = new URL(buildUrl, window.location.origin);
      } catch (e) {
        dest = new URL('/pages/shop-by-vehicle', window.location.origin);
        dest.searchParams.set('view', 'shop-by-vehicle-build');
      }
      dest.searchParams.set('year', yearEl.value);
      dest.searchParams.set('make', makeEl.value);
      dest.searchParams.set('model', modelEl.value);
      dest.searchParams.set('chassis', chassisEl.value);
      dest.searchParams.set('slug', opt.slug || '');
      dest.searchParams.set('bolt', opt.boltPattern || '');
      dest.searchParams.set('bore', opt.centerBore || '');
      try {
        sessionStorage.setItem('ffVehicleSelection', JSON.stringify({
          year: yearEl.value, make: makeEl.value, model: modelEl.value,
          chassis: chassisEl.value, slug: opt.slug || '', source: 'shop-by-vehicle',
        }));
      } catch (e) {}
      window.location.assign(dest.pathname + dest.search);
    }

    if (form && goBtn) {
      form.addEventListener('submit', function (ev) {
        ev.preventDefault();
        if (goBtn.disabled) return;
        if (isCompact) {
          navigateToBuildPage();
          return;
        }
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
    }

    function preloadFitmentData(done) {
      var pending = 0;
      function tick() {
        pending--;
        if (pending <= 0 && done) done();
      }
      if (ffFitmentsUrl && !ffData) {
        pending++;
        fetch(ffFitmentsUrl, { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { ffData = d; })
          .catch(function () {})
          .finally(tick);
      }
      if (fitmentUrl && !apexData) {
        pending++;
        fetch(fitmentUrl, { credentials: 'same-origin' })
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (d) { apexData = d; })
          .catch(function () {})
          .finally(tick);
      }
      if (pending === 0 && done) done();
    }

    /* ── load catalog ── */
    fetch(catalogUrl, { credentials: 'same-origin' })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (!data) return;
        catalog = data;

        if (isCompact && yearEl) {
          fillSelect(yearEl, 'Year', (data.yearList || Object.keys(data.years || {})).map(String), true);
          updateGo();
          return;
        }

        preloadFitmentData(initBuildFromQuery);
      })
      .catch(function () {
        if (isCompact && yearEl) fillSelect(yearEl, 'Year unavailable', [], false);
        if (!isCompact) initBuildFromQuery();
      });
  }

  function boot() {
    document.querySelectorAll('[data-ff-sbv]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else { boot(); }
})();
