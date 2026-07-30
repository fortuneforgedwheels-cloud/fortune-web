(function () {
  try {
    const HIDE_TITLES = ['SIZE', 'WIDTH', 'OFFSET', 'LUG PATTERN'];

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

    function findOptionWrappers() {
      const results = [];
      const seen = new Set();

      HIDE_TITLES.forEach((name) => {
        propertyFields(name).forEach((el) => {
          const wrapper =
            el.closest('.selector-wrapper') ||
            el.closest('[class*="bcpo"]') ||
            el.closest('.product-form__input') ||
            el.parentElement;
          if (!wrapper || seen.has(wrapper)) return;
          seen.add(wrapper);
          results.push({ wrapper, title: name, field: el });
        });
      });

      document.querySelectorAll('.selector-wrapper, [class*="bcpo-"]').forEach((node) => {
        if (seen.has(node)) return;
        const titleEl = node.querySelector('.bcpo-title, .bcpo-label, label, legend');
        if (!titleEl) return;
        const key = optionKeyFromLabel(titleEl.textContent);
        if (!HIDE_TITLES.includes(key)) return;
        seen.add(node);
        results.push({
          wrapper: node,
          title: key,
          field: node.querySelector('select, input, textarea'),
        });
      });

      return results;
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

      if (field.type === 'radio' || field.type === 'checkbox') {
        const wantedUp = wanted.toUpperCase();
        if (String(field.value).trim().toUpperCase() !== wantedUp) return false;
        if (field.checked) return true;
        field.checked = true;
        field.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }

      return false;
    }

    function normalizeSizeKey(value) {
      return String(value || '').replace(/\s+/g, '').toUpperCase();
    }

    function sizeMatches(candidate, targetKey) {
      const key = normalizeSizeKey(candidate);
      if (!key || !targetKey) return false;
      if (key === targetKey) return true;
      return key.replace(/X/g, 'x') === targetKey.replace(/X/g, 'x');
    }

    function selectCertifiedSize(root) {
      const size = root.getAttribute('data-certified-size') || '18X11';
      const variantId = root.getAttribute('data-certified-variant-id');
      const productView = getProductView(root);
      const sizeKey = normalizeSizeKey(size);

      propertyFields('SIZE').forEach((field) => setFieldValue(field, size));

      const radios = productView.querySelectorAll(
        '.productView-variants input.product-form__radio, variant-radios input.product-form__radio'
      );
      radios.forEach((radio) => {
        if (!sizeMatches(radio.value, sizeKey)) return;
        if (!radio.checked) radio.click();
      });

      const selects = productView.querySelectorAll(
        '.productView-variants select.select__select, variant-selects select.select__select'
      );
      selects.forEach((select) => {
        const match = Array.from(select.options).find((opt) => sizeMatches(opt.value, sizeKey));
        if (!match) return;
        if (select.value !== match.value) {
          select.value = match.value;
          select.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      if (variantId) {
        const idInput = getForm(root) && getForm(root).querySelector('input[name="id"], select[name="id"]');
        if (idInput && String(idInput.value) !== String(variantId)) {
          idInput.value = variantId;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    function toggleVariantPicker(root, certified) {
      const productView = getProductView(root);
      productView.querySelectorAll('[data-ff-826m-hide-certified]').forEach((picker) => {
        if (certified) {
          picker.setAttribute('data-ff-826m-variant-hidden', '1');
          picker.style.setProperty('display', 'none', 'important');
          picker.setAttribute('aria-hidden', 'true');
        } else {
          picker.removeAttribute('data-ff-826m-variant-hidden');
          picker.style.removeProperty('display');
          picker.setAttribute('aria-hidden', 'false');
        }

        picker.querySelectorAll('select, input.product-form__radio').forEach((field) => {
          if (certified) {
            if (!field.hasAttribute('data-ff-826m-was-required')) {
              field.setAttribute('data-ff-826m-was-required', field.required ? '1' : '0');
            }
            field.required = false;
            if (field.tagName === 'SELECT') field.disabled = true;
          } else {
            if (field.getAttribute('data-ff-826m-was-required') === '1') {
              field.required = true;
            }
            if (field.tagName === 'SELECT') field.disabled = false;
          }
        });
      });
    }

    function hideSpecFields(certified) {
      findOptionWrappers().forEach(({ wrapper, field }) => {
        wrapper.setAttribute('data-ff-826m-spec-field', '1');
        if (certified) {
          wrapper.style.setProperty('display', 'none', 'important');
          wrapper.setAttribute('aria-hidden', 'true');
        } else {
          wrapper.style.removeProperty('display');
          wrapper.setAttribute('aria-hidden', 'false');
        }

        if (!field) return;
        if (certified) {
          if (!field.hasAttribute('data-ff-826m-was-required')) {
            field.setAttribute('data-ff-826m-was-required', field.required ? '1' : '0');
          }
          field.required = false;
        } else if (field.getAttribute('data-ff-826m-was-required') === '1') {
          field.required = true;
        }
      });
    }

    function applyCertifiedOptions(root) {
      const map = {
        SIZE: root.getAttribute('data-certified-size'),
        WIDTH: root.getAttribute('data-certified-width'),
        OFFSET: root.getAttribute('data-certified-offset'),
        'LUG PATTERN': root.getAttribute('data-certified-lug'),
      };

      Object.keys(map).forEach((name) => {
        propertyFields(name).forEach((field) => setFieldValue(field, map[name]));
      });

      findOptionWrappers().forEach(({ wrapper, title }) => {
        const field = wrapper.querySelector('select, input');
        if (field && map[title] != null) setFieldValue(field, map[title]);
      });

      selectCertifiedSize(root);
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

      if (certified) applyCertifiedOptions(root);
      hideSpecFields(certified);
      toggleVariantPicker(root, certified);
    }

    function currentMode(root) {
      const checked = root.querySelector('input[type="radio"][name^="ff_826m_path_"]:checked');
      return checked ? checked.value : 'certified';
    }

    function validateCertified(root, event) {
      if (currentMode(root) !== 'certified') return;
      const missing = Array.from(root.querySelectorAll('[data-ff-826m-required-certified]')).filter(
        (input) => !input.disabled && !String(input.value || '').trim()
      );
      if (!missing.length) return;
      missing[0].focus();
      missing[0].setCustomValidity('Please enter your vehicle year, make, and model.');
      missing[0].reportValidity();
      event.preventDefault();
      event.stopPropagation();
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

      const form = getForm(root);
      if (form) {
        form.addEventListener(
          'submit',
          function (event) {
            if (currentMode(root) !== 'certified') return;
            applyCertifiedOptions(root);
            hideSpecFields(true);
            toggleVariantPicker(root, true);
            validateCertified(root, event);
          },
          true
        );
      }

      // Short, finite retry only — safe finite retry.
      let tries = 0;
      const timer = window.setInterval(function () {
        tries += 1;
        try {
          if (currentMode(root) === 'certified') {
            applyCertifiedOptions(root);
            hideSpecFields(true);
            toggleVariantPicker(root, true);
          }
        } catch (e) {}

        const found =
          propertyFields('SIZE').length + propertyFields('WIDTH').length + propertyFields('OFFSET').length;
        if (found > 0 || tries >= 20) {
          window.clearInterval(timer);
          try {
            setMode(root, currentMode(root));
          } catch (e) {}
        }
      }, 300);

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
