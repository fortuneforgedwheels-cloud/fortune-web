(function () {
  try {
    function patchBcpoChromePrices() {
      const data = window.bcpo_data;
      if (!data || !Array.isArray(data.virtual_options)) return;
      data.virtual_options.forEach((vo) => {
        const title = String(vo.title || '')
          .replace(/\s+/g, ' ')
          .trim()
          .toUpperCase();
        if (title !== 'FACE COLOR' && title !== 'RING COLOR') return;
        (vo.values || []).forEach((value) => {
          if (!value || typeof value !== 'object') return;
          if (String(value.key || '').toLowerCase() !== 'chrome') return;
          value.price = '250';
        });
      });
    }

    const COLOR_TITLES = ['FACE COLOR', 'RING COLOR', 'BOLT COLOR'];
    const HIDE_ALWAYS_IN_CERTIFIED = [
      'SIZE',
      'DIAMETER',
      'WIDTH',
      'OFFSET',
      'LUG PATTERN',
      'LEAD TIME PREFERENCE',
      'FACE COLOR',
      'RING COLOR',
      'BOLT COLOR',
      'HARDWARE COLOR',
    ];

    function normalizeTitle(text) {
      return String(text || '')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
    }

    function optionKeyFromLabel(text) {
      return normalizeTitle(text).split(':')[0].trim();
    }

    function getRoot() {
      return document.querySelector('[data-ff-826m-path]');
    }

    function getProductView(root) {
      return root.closest('.productView') || document.querySelector('.productView') || document.body;
    }

    function getForm(root) {
      const formId = root.getAttribute('data-form-id');
      return (
        (formId && document.getElementById(formId)) ||
        root.closest('form') ||
        document.querySelector('form[data-type="add-to-cart-form"]')
      );
    }

    function escapeAttr(value) {
      return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    }

    function propertyFields(name) {
      const safe = escapeAttr(name);
      return Array.from(document.querySelectorAll('[name="properties[' + safe + ']"]'));
    }

    const FALLBACK_COLORS = {
      'FACE COLOR': [
        'Polished',
        'Chrome',
        'Gloss black',
        'Brushed silver',
        'Satin black',
        'Brushed Champagne',
        'Brushed bronze',
        'Light brushed gold',
        'Matte bronze',
        'Gloss bronze',
        'Matte black',
        'Motorsport gold',
        'Brushed gunmetal',
        'Brushed light gold',
        'Satin Gunmetal',
        'Gloss white',
      ],
      'RING COLOR': [
        'Polished',
        'Chrome',
        'Gloss black',
        'Brushed silver',
        'Satin black',
        'Brushed Champagne',
        'Brushed bronze',
        'Light brushed gold',
        'Matte bronze',
        'Gloss bronze',
        'Matte black',
        'Motorsport gold',
        'Brushed gunmetal',
        'Brushed light gold',
        'Satin Gunmetal',
        'Gloss white',
      ],
      'BOLT COLOR': ['Raw', 'silver', 'black', 'white', 'red', 'blue', 'orange', 'gold', 'yellow'],
    };

    function getBcpoVirtualOptions() {
      if (window.bcpo_data && Array.isArray(window.bcpo_data.virtual_options)) {
        patchBcpoChromePrices();
        return window.bcpo_data.virtual_options;
      }

      const scripts = document.querySelectorAll('script:not([src])');
      for (let i = 0; i < scripts.length; i++) {
        const text = scripts[i].textContent || '';
        const marker = 'bcpo_data=';
        const start = text.indexOf(marker);
        if (start === -1) continue;
        const jsonStart = text.indexOf('{', start);
        if (jsonStart === -1) continue;
        let depth = 0;
        let end = -1;
        for (let j = jsonStart; j < text.length; j++) {
          const ch = text.charAt(j);
          if (ch === '{') depth += 1;
          if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
              end = j + 1;
              break;
            }
          }
        }
        if (end === -1) continue;
        try {
          const data = JSON.parse(text.slice(jsonStart, end));
          if (data && Array.isArray(data.virtual_options)) {
            window.bcpo_data = data;
            patchBcpoChromePrices();
            return data.virtual_options;
          }
        } catch (e) {}
      }
      return [];
    }

    function extraFaceRingColors(root) {
      const raw = root.getAttribute('data-extra-face-ring-colors') || '';
      if (!raw.trim()) return [];
      return raw
        .split('|')
        .map((v) => v.trim())
        .filter(Boolean);
    }

    function colorOptionMeta(root, title) {
      const wanted = normalizeTitle(title);
      const opt = getBcpoVirtualOptions().find((o) => normalizeTitle(o.title) === wanted);
      let values = [];
      const prices = {};
      if (opt && Array.isArray(opt.values) && opt.values.length) {
        opt.values.forEach((v) => {
          if (!v) return;
          if (typeof v === 'object') {
            if (!v.key) return;
            values.push(v.key);
            if (v.price != null && String(v.price) !== '' && Number(v.price) > 0) {
              prices[v.key] = String(v.price);
            }
          } else {
            values.push(v);
          }
        });
      } else {
        values = (FALLBACK_COLORS[wanted] || []).slice();
      }

      if (wanted === 'FACE COLOR' || wanted === 'RING COLOR') {
        const extras = extraFaceRingColors(root);
        if (extras.length) {
          values = extras.concat(values.filter((v) => extras.indexOf(v) === -1));
        }
        // Guaranteed Chrome surcharge display even if BCPO payload is stale.
        if (values.indexOf('Chrome') !== -1) {
          prices.Chrome = '250';
        }
      }
      return { values: values, prices: prices };
    }

    function valuesForColor(root, title) {
      return colorOptionMeta(root, title).values;
    }

    function labelForColorValue(value, prices) {
      const price = prices && prices[value];
      if (!price || Number(price) <= 0) return value;
      return value + ' (+$' + price + ')';
    }

    function populateColorSelects(root) {
      COLOR_TITLES.forEach((title) => {
        const select = root.querySelector('[data-ff-826m-color-select="' + title + '"]');
        if (!select) return;
        const meta = colorOptionMeta(root, title);
        const values = meta.values;
        if (!values.length) return;

        const current = select.value;
        const existing = Array.from(select.options)
          .map((o) => o.value)
          .filter(Boolean);
        const same =
          existing.length === values.length && values.every((v, i) => existing[i] === v);
        if (same) {
          // Refresh labels if surcharge text is missing.
          Array.from(select.options).forEach((opt) => {
            if (!opt.value) return;
            opt.textContent = labelForColorValue(opt.value, meta.prices);
          });
          return;
        }

        // Keep the open dropdown stable if the shopper is mid-selection.
        if (document.activeElement === select) return;

        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose one';
        select.appendChild(placeholder);
        values.forEach((value) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = labelForColorValue(value, meta.prices);
          select.appendChild(opt);
        });
        if (current && values.indexOf(current) !== -1) select.value = current;
      });
    }

    function findBcpoWrapperByTitle(title) {
      const wanted = normalizeTitle(title);
      const titles = document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label');
      for (let i = 0; i < titles.length; i++) {
        if (optionKeyFromLabel(titles[i].textContent) !== wanted) continue;
        return (
          titles[i].closest('.selector-wrapper') ||
          titles[i].closest('[class*="bcpo"]') ||
          titles[i].parentElement
        );
      }
      return null;
    }

    function findBcpoSelectByTitle(title) {
      const wrapper = findBcpoWrapperByTitle(title);
      if (!wrapper) return null;
      return wrapper.querySelector('select, .bcpo-dd, .bcpo-select');
    }

    function ensureSelectOption(field, value) {
      if (!field || field.tagName !== 'SELECT' || value == null) return null;
      const wanted = String(value).trim();
      if (!wanted) return null;

      const options = Array.from(field.options);
      const match =
        options.find((opt) => opt.value === wanted || opt.text.trim() === wanted) ||
        options.find(
          (opt) =>
            (opt.value && opt.value.includes(wanted)) ||
            (opt.text && opt.text.includes(wanted))
        );
      if (match) return match;

      // S650 Match OEM extras (and any other certified-only values) may not exist in BCPO yet.
      const created = document.createElement('option');
      created.value = wanted;
      created.textContent = wanted;
      field.appendChild(created);
      return created;
    }

    function syncColorToBcpo(title, value) {
      const field = findBcpoSelectByTitle(title);
      if (!field || !value) return false;

      if (field.tagName === 'SELECT') {
        const match = ensureSelectOption(field, value);
        if (!match) return false;
        if (field.value !== match.value) {
          field.value = match.value;
          field.dispatchEvent(new Event('change', { bubbles: true }));
          field.dispatchEvent(new Event('input', { bubbles: true }));
        }
        return true;
      }

      return false;
    }

    function ensureHiddenPropertyInputs(root, certified) {
      const form = getForm(root);
      if (!form) return;

      COLOR_TITLES.forEach((title) => {
        const select = root.querySelector('[data-ff-826m-color-select="' + title + '"]');
        const name = 'properties[' + title + ']';
        let hidden = form.querySelector('input[data-ff-826m-color-hidden="' + title + '"]');
        const bcpoField = findBcpoSelectByTitle(title);

        if (!certified) {
          if (hidden) hidden.remove();
          if (select) select.removeAttribute('name');
          return;
        }

        // Always mirror certified colors into line-item properties so ATC works even when
        // BCPO sync lags or Match OEM values are missing from the app option list.
        if (!hidden) {
          hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.setAttribute('data-ff-826m-color-hidden', title);
          hidden.name = name;
          form.appendChild(hidden);
        }
        hidden.value = select ? select.value : '';
        if (select) select.removeAttribute('name');

        if (bcpoField && select && select.value) {
          syncColorToBcpo(title, select.value);
        }
      });
    }

    function setFieldValue(field, desired) {
      if (!field || desired == null) return false;
      const wanted = String(desired).trim();
      if (!wanted) return false;

      if (field.tagName === 'SELECT') {
        const match = ensureSelectOption(field, wanted);
        if (!match) return false;
        if (field.value === match.value) return true;
        field.value = match.value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    }

    function ensureHiddenSpecProperty(form, title, value) {
      if (!form || !title) return;
      const name = 'properties[' + title + ']';
      let hidden = form.querySelector('input[data-ff-826m-spec-hidden="' + title + '"]');
      if (value == null || String(value).trim() === '') {
        if (hidden) hidden.remove();
        return;
      }
      if (!hidden) {
        hidden = document.createElement('input');
        hidden.type = 'hidden';
        hidden.setAttribute('data-ff-826m-spec-hidden', title);
        hidden.name = name;
        form.appendChild(hidden);
      }
      hidden.value = String(value).trim();
    }

    function relaxHiddenBcpoRequirements(certified) {
      const titles = document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label');
      titles.forEach((titleEl) => {
        const key = optionKeyFromLabel(titleEl.textContent);
        const wrapper =
          titleEl.closest('.selector-wrapper') ||
          titleEl.closest('[class*="bcpo-simple"]') ||
          titleEl.closest('[class*="bcpo"]') ||
          titleEl.parentElement;
        if (!wrapper || wrapper.closest('[data-ff-826m-path]')) return;

        const field = wrapper.querySelector('select, textarea, input');
        if (!field) return;

        const shouldRelax =
          certified &&
          (HIDE_ALWAYS_IN_CERTIFIED.indexOf(key) !== -1 ||
            wrapper.getAttribute('data-ff-826m-spec-field') === '1' ||
            wrapper.getAttribute('aria-hidden') === 'true' ||
            wrapper.style.display === 'none' ||
            window.getComputedStyle(wrapper).display === 'none');

        if (shouldRelax) {
          if (!field.hasAttribute('data-ff-826m-was-required')) {
            field.setAttribute('data-ff-826m-was-required', field.required ? '1' : '0');
          }
          field.required = false;
          field.setCustomValidity('');
        } else if (field.hasAttribute('data-ff-826m-was-required')) {
          field.required = field.getAttribute('data-ff-826m-was-required') === '1';
          field.removeAttribute('data-ff-826m-was-required');
          field.setCustomValidity('');
        }
      });
    }

    function forceCertifiedVariantId(root) {
      const variantId = root.getAttribute('data-certified-variant-id');
      if (!variantId) return;
      const form = getForm(root);
      if (!form) return;
      form.querySelectorAll('input[name="id"], select[name="id"]').forEach((idInput) => {
        if (String(idInput.value) !== String(variantId)) {
          idInput.value = variantId;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    }

    function selectCertifiedSize(root) {
      const size = root.getAttribute('data-certified-size') || '18X11';
      const variantId = root.getAttribute('data-certified-variant-id');
      const productView = getProductView(root);
      const sizeKey = String(size).replace(/\s+/g, '').toUpperCase();

      const radios = productView.querySelectorAll(
        '.productView-variants input.product-form__radio, variant-radios input.product-form__radio, input[type="radio"][name*="option"]'
      );
      radios.forEach((radio) => {
        const value = String(radio.value || '').replace(/\s+/g, '').toUpperCase();
        if (value !== sizeKey) return;
        radio.checked = true;
        if (!radio.checked) radio.click();
        radio.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Native / BCPO size dropdown if present
      const sizeSelect = findBcpoSelectByTitle('SIZE') || findBcpoSelectByTitle('DIAMETER');
      if (sizeSelect && sizeSelect.tagName === 'SELECT') {
        setFieldValue(sizeSelect, size);
      }
      productView.querySelectorAll('select[name*="option"], select.product-form__input').forEach((sel) => {
        const opts = Array.from(sel.options || []);
        const match = opts.find((o) => String(o.value || '').replace(/\s+/g, '').toUpperCase() === sizeKey);
        if (match && sel.value !== match.value) {
          sel.value = match.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      forceCertifiedVariantId(root);
      if (variantId) {
        // Keep a data marker for ATC click interceptor
        root.setAttribute('data-ff-locked-variant-id', String(variantId));
      }
    }

    function applyCertifiedOptions(root) {
      const map = {
        WIDTH: root.getAttribute('data-certified-width'),
        OFFSET: root.getAttribute('data-certified-offset'),
        'LUG PATTERN': root.getAttribute('data-certified-lug'),
      };
      const form = getForm(root);

      Object.keys(map).forEach((name) => {
        propertyFields(name).forEach((field) => setFieldValue(field, map[name]));
        const bcpo = findBcpoSelectByTitle(name);
        if (bcpo) setFieldValue(bcpo, map[name]);
        if (form) ensureHiddenSpecProperty(form, name, map[name]);
      });

      selectCertifiedSize(root);
    }

    function hideBcpoFields(certified) {
      const titles = document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label, .bcpo-label');
      titles.forEach((titleEl) => {
        const key = optionKeyFromLabel(titleEl.textContent);
        const wrapper =
          titleEl.closest('.selector-wrapper') ||
          titleEl.closest('[class*="bcpo-simple"]') ||
          titleEl.closest('[class*="bcpo"]') ||
          titleEl.parentElement;
        if (!wrapper || wrapper.closest('[data-ff-826m-path]')) return;

        if (certified && HIDE_ALWAYS_IN_CERTIFIED.indexOf(key) !== -1) {
          wrapper.style.setProperty('display', 'none', 'important');
          wrapper.setAttribute('aria-hidden', 'true');
          wrapper.setAttribute('data-ff-826m-spec-field', '1');
        } else if (!certified && wrapper.getAttribute('data-ff-826m-spec-field') === '1') {
          wrapper.style.removeProperty('display');
          wrapper.setAttribute('aria-hidden', 'false');
          wrapper.removeAttribute('data-ff-826m-spec-field');
        } else if (certified && key && COLOR_TITLES.indexOf(key) === -1) {
          // Hide any other BCPO option rows in certified mode
          wrapper.style.setProperty('display', 'none', 'important');
          wrapper.setAttribute('aria-hidden', 'true');
          wrapper.setAttribute('data-ff-826m-spec-field', '1');
        }
      });
      relaxHiddenBcpoRequirements(certified);
    }

    function syncAllColors(root) {
      COLOR_TITLES.forEach((title) => {
        const select = root.querySelector('[data-ff-826m-color-select="' + title + '"]');
        if (!select || !select.value) return;
        syncColorToBcpo(title, select.value);
      });
      ensureHiddenPropertyInputs(root, currentMode(root) === 'certified');
    }

    function prepareCertifiedForAtc(root) {
      populateColorSelects(root);
      applyCertifiedOptions(root);
      syncAllColors(root);
      hideBcpoFields(true);
      relaxHiddenBcpoRequirements(true);
      forceCertifiedVariantId(root);
    }

    function setMode(root, mode) {
      const certified = mode === 'certified';
      const productView = getProductView(root);
      const certifiedPanel = root.querySelector('[data-ff-826m-certified-panel]');
      const customPanel = root.querySelector('[data-ff-826m-custom-panel]');

      root.classList.toggle('is-certified', certified);
      productView.classList.toggle('is-ff-826m-certified', certified);
      document.body.classList.toggle('is-ff-826m-certified', certified);

      if (certifiedPanel) certifiedPanel.hidden = !certified;
      if (customPanel) customPanel.hidden = certified;

      root.querySelectorAll('[data-ff-826m-certified-prop]').forEach((el) => {
        el.disabled = !certified;
      });
      root.querySelectorAll('[data-ff-826m-custom-prop]').forEach((el) => {
        el.disabled = certified;
      });
      root.querySelectorAll('[data-ff-826m-required-certified]').forEach((input) => {
        input.required = certified;
        if (!certified) input.setCustomValidity('');
        input.disabled = !certified;
      });
      root.querySelectorAll('[data-ff-826m-color-select]').forEach((select) => {
        select.required = certified;
        select.disabled = !certified;
        if (!certified) select.setCustomValidity('');
      });

      populateColorSelects(root);
      if (certified) applyCertifiedOptions(root);
      hideBcpoFields(certified);
      ensureHiddenPropertyInputs(root, certified);
      if (certified) syncAllColors(root);
      if (!certified) {
        const form = getForm(root);
        if (form) {
          ['WIDTH', 'OFFSET', 'LUG PATTERN'].forEach((title) => {
            const hidden = form.querySelector('input[data-ff-826m-spec-hidden="' + title + '"]');
            if (hidden) hidden.remove();
          });
        }
      }
    }

    function currentMode(root) {
      const checked = root.querySelector('input[type="radio"][name^="ff_826m_path_"]:checked');
      return checked ? checked.value : 'certified';
    }

    function validateCertified(root, event) {
      if (currentMode(root) !== 'certified') return true;

      const ymmMissing = Array.from(root.querySelectorAll('[data-ff-826m-required-certified]')).filter(
        (input) => !input.disabled && !String(input.value || '').trim()
      );
      if (ymmMissing.length) {
        ymmMissing[0].focus();
        ymmMissing[0].setCustomValidity('Please enter your vehicle year, make, and model.');
        ymmMissing[0].reportValidity();
        if (event) {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        }
        return false;
      }

      for (let i = 0; i < COLOR_TITLES.length; i++) {
        const select = root.querySelector('[data-ff-826m-color-select="' + COLOR_TITLES[i] + '"]');
        if (select && !select.disabled && !String(select.value || '').trim()) {
          select.focus();
          select.setCustomValidity('Please choose a ' + COLOR_TITLES[i].toLowerCase() + '.');
          select.reportValidity();
          if (event) {
            event.preventDefault();
            event.stopPropagation();
            if (event.stopImmediatePropagation) event.stopImmediatePropagation();
          }
          return false;
        }
      }

      prepareCertifiedForAtc(root);
      return true;
    }

    function bind(root) {
      if (root.dataset.ff826mBound === '1') return;
      root.dataset.ff826mBound = '1';

      root.querySelectorAll('input[type="radio"][name^="ff_826m_path_"]').forEach((radio) => {
        radio.addEventListener('change', function () {
          setMode(root, radio.value);
        });
      });

      root.querySelectorAll('[data-ff-826m-required-certified]').forEach((input) => {
        input.addEventListener('input', function () {
          input.setCustomValidity('');
        });
      });

      root.querySelectorAll('[data-ff-826m-color-select]').forEach((select) => {
        select.addEventListener('change', function () {
          select.setCustomValidity('');
          const title = select.getAttribute('data-ff-826m-color-select');
          syncColorToBcpo(title, select.value);
          ensureHiddenPropertyInputs(root, currentMode(root) === 'certified');
          relaxHiddenBcpoRequirements(currentMode(root) === 'certified');
        });
      });

      const form = getForm(root);
      if (form) {
        form.addEventListener(
          'submit',
          function (event) {
            if (currentMode(root) !== 'certified') return;
            validateCertified(root, event);
            forceCertifiedVariantId(root);
          },
          true
        );
      }

      // Theme + BCPO both listen on ATC click. Capture-phase prep must run first so
      // hidden required BCPO selects are filled / relaxed before BCPO checkValidity.
      const productView = getProductView(root);
      productView.addEventListener(
        'click',
        function (event) {
          if (currentMode(root) !== 'certified') return;
          const btn =
            event.target && event.target.closest
              ? event.target.closest(
                  '[data-btn-addtocart], button[name="add"], .product-form__submit, [data-add-to-cart]'
                )
              : null;
          if (!btn) return;
          if (!validateCertified(root, event)) return;
          prepareCertifiedForAtc(root);
        },
        true
      );

      document.addEventListener(
        'click',
        function (event) {
          if (currentMode(root) !== 'certified') return;
          const btn =
            event.target && event.target.closest
              ? event.target.closest(
                  '[data-btn-addtocart], button[name="add"], .product-form__submit, [data-add-to-cart]'
                )
              : null;
          if (!btn) return;
          // Sticky ATC can live outside .productView; still prepare before BCPO validates.
          if (!productView.contains(btn)) {
            if (!validateCertified(root, event)) return;
            prepareCertifiedForAtc(root);
          }
        },
        true
      );

      let tries = 0;
      const timer = window.setInterval(function () {
        tries += 1;
        try {
          patchBcpoChromePrices();
          // Only refresh option lists — do NOT call full setMode here.
          // Re-running setMode every 250ms rebuilds <select>s and wipes in-progress choices.
          populateColorSelects(root);
          if (currentMode(root) === 'certified') {
            hideBcpoFields(true);
            ensureHiddenPropertyInputs(root, true);
            relaxHiddenBcpoRequirements(true);
          }
        } catch (e) {}

        const hasValues = COLOR_TITLES.every((title) => valuesForColor(root, title).length > 0);
        const hasBcpo = COLOR_TITLES.some((title) => !!findBcpoSelectByTitle(title));
        if ((hasValues && hasBcpo) || tries >= 30) {
          window.clearInterval(timer);
          try {
            patchBcpoChromePrices();
            populateColorSelects(root);
            if (currentMode(root) === 'certified') {
              applyCertifiedOptions(root);
              hideBcpoFields(true);
              ensureHiddenPropertyInputs(root, true);
              syncAllColors(root);
              relaxHiddenBcpoRequirements(true);
            }
          } catch (e) {}
        }
      }, 250);

      setMode(root, currentMode(root));
    }

    function init() {
      const root = getRoot();
      if (!root) return;
      bind(root);
    }

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    document.addEventListener('shopify:section:load', init);
  } catch (e) {
    // Never let this feature break the storefront.
  }
})();
