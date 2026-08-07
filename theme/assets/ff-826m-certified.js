(function () {
  try {
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

    function valuesForColor(root, title) {
      const wanted = normalizeTitle(title);
      const opt = getBcpoVirtualOptions().find((o) => normalizeTitle(o.title) === wanted);
      let values = [];
      if (opt && Array.isArray(opt.values) && opt.values.length) {
        values = opt.values
          .map((v) => (v && typeof v === 'object' ? v.key : v))
          .filter(Boolean);
      } else {
        values = (FALLBACK_COLORS[wanted] || []).slice();
      }

      if (wanted === 'FACE COLOR' || wanted === 'RING COLOR') {
        const extras = extraFaceRingColors(root);
        if (extras.length) {
          values = extras.concat(values.filter((v) => extras.indexOf(v) === -1));
        }
      }
      return values;
    }

    function populateColorSelects(root) {
      COLOR_TITLES.forEach((title) => {
        const select = root.querySelector('[data-ff-826m-color-select="' + title + '"]');
        if (!select) return;
        const values = valuesForColor(root, title);
        if (!values.length) return;

        const current = select.value;
        const existing = Array.from(select.options)
          .map((o) => o.value)
          .filter(Boolean);
        const same =
          existing.length === values.length && values.every((v, i) => existing[i] === v);
        if (same) return;

        select.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Choose one';
        select.appendChild(placeholder);
        values.forEach((value) => {
          const opt = document.createElement('option');
          opt.value = value;
          opt.textContent = value;
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

    function syncColorToBcpo(title, value) {
      const field = findBcpoSelectByTitle(title);
      if (!field || !value) return false;

      if (field.tagName === 'SELECT') {
        const options = Array.from(field.options);
        const match =
          options.find((opt) => opt.value === value || opt.text.trim() === value) ||
          options.find((opt) => opt.value.includes(value) || opt.text.includes(value));
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

        // If BCPO field exists, prefer it and remove our hidden fallback
        const bcpoField = findBcpoSelectByTitle(title);
        if (bcpoField) {
          if (hidden) hidden.remove();
          if (select) select.removeAttribute('name');
          return;
        }

        if (!certified) {
          if (hidden) hidden.remove();
          if (select) select.removeAttribute('name');
          return;
        }

        if (!hidden) {
          hidden = document.createElement('input');
          hidden.type = 'hidden';
          hidden.setAttribute('data-ff-826m-color-hidden', title);
          hidden.name = name;
          form.appendChild(hidden);
        }
        hidden.value = select ? select.value : '';
        if (select) select.removeAttribute('name');
      });
    }

    function setFieldValue(field, desired) {
      if (!field || desired == null) return false;
      const wanted = String(desired).trim();

      if (field.tagName === 'SELECT') {
        const options = Array.from(field.options);
        const match =
          options.find((opt) => opt.value === wanted || opt.text.trim() === wanted) ||
          options.find((opt) => opt.value.includes(wanted) || opt.text.includes(wanted));
        if (!match || field.value === match.value) return Boolean(match);
        field.value = match.value;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    }

    function selectCertifiedSize(root) {
      const size = root.getAttribute('data-certified-size') || '18X11';
      const variantId = root.getAttribute('data-certified-variant-id');
      const productView = getProductView(root);
      const sizeKey = String(size).replace(/\s+/g, '').toUpperCase();

      const radios = productView.querySelectorAll(
        '.productView-variants input.product-form__radio, variant-radios input.product-form__radio'
      );
      radios.forEach((radio) => {
        const value = String(radio.value || '').replace(/\s+/g, '').toUpperCase();
        if (value !== sizeKey) return;
        if (!radio.checked) radio.click();
      });

      // BCPO size dropdown if present
      const sizeSelect = findBcpoSelectByTitle('SIZE');
      if (sizeSelect && sizeSelect.tagName === 'SELECT') {
        setFieldValue(sizeSelect, size);
      }

      if (variantId) {
        const form = getForm(root);
        const idInput = form && form.querySelector('input[name="id"], select[name="id"]');
        if (idInput && String(idInput.value) !== String(variantId)) {
          idInput.value = variantId;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    function applyCertifiedOptions(root) {
      const map = {
        WIDTH: root.getAttribute('data-certified-width'),
        OFFSET: root.getAttribute('data-certified-offset'),
        'LUG PATTERN': root.getAttribute('data-certified-lug'),
      };

      Object.keys(map).forEach((name) => {
        propertyFields(name).forEach((field) => setFieldValue(field, map[name]));
        const bcpo = findBcpoSelectByTitle(name);
        if (bcpo) setFieldValue(bcpo, map[name]);
      });

      selectCertifiedSize(root);
    }

    function hideBcpoFields(certified) {
      const titles = document.querySelectorAll('.bcpo-title, .bcpo-front-dd-label');
      titles.forEach((titleEl) => {
        const key = optionKeyFromLabel(titleEl.textContent);
        const wrapper =
          titleEl.closest('.selector-wrapper') ||
          titleEl.closest('[class*="bcpo-simple"]') ||
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
    }

    function syncAllColors(root) {
      COLOR_TITLES.forEach((title) => {
        const select = root.querySelector('[data-ff-826m-color-select="' + title + '"]');
        if (!select || !select.value) return;
        syncColorToBcpo(title, select.value);
      });
      ensureHiddenPropertyInputs(root, currentMode(root) === 'certified');
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
    }

    function currentMode(root) {
      const checked = root.querySelector('input[type="radio"][name^="ff_826m_path_"]:checked');
      return checked ? checked.value : 'certified';
    }

    function validateCertified(root, event) {
      if (currentMode(root) !== 'certified') return;

      const ymmMissing = Array.from(root.querySelectorAll('[data-ff-826m-required-certified]')).filter(
        (input) => !input.disabled && !String(input.value || '').trim()
      );
      if (ymmMissing.length) {
        ymmMissing[0].focus();
        ymmMissing[0].setCustomValidity('Please enter your vehicle year, make, and model.');
        ymmMissing[0].reportValidity();
        event.preventDefault();
        event.stopPropagation();
        return;
      }

      for (let i = 0; i < COLOR_TITLES.length; i++) {
        const select = root.querySelector('[data-ff-826m-color-select="' + COLOR_TITLES[i] + '"]');
        if (select && !select.disabled && !String(select.value || '').trim()) {
          select.focus();
          select.setCustomValidity('Please choose a ' + COLOR_TITLES[i].toLowerCase() + '.');
          select.reportValidity();
          event.preventDefault();
          event.stopPropagation();
          return;
        }
      }

      syncAllColors(root);
      applyCertifiedOptions(root);
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
        });
      });

      const form = getForm(root);
      if (form) {
        form.addEventListener(
          'submit',
          function (event) {
            if (currentMode(root) !== 'certified') return;
            validateCertified(root, event);
          },
          true
        );
      }

      let tries = 0;
      const timer = window.setInterval(function () {
        tries += 1;
        try {
          populateColorSelects(root);
          setMode(root, currentMode(root));
        } catch (e) {}

        const hasValues = COLOR_TITLES.every((title) => valuesForColor(root, title).length > 0);
        const hasBcpo = COLOR_TITLES.some((title) => !!findBcpoSelectByTitle(title));
        if ((hasValues && hasBcpo) || tries >= 30) {
          window.clearInterval(timer);
          try {
            setMode(root, currentMode(root));
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
