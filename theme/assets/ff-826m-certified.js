(function () {
  try {
    const HIDE_TITLES = ['WIDTH', 'OFFSET', 'LUG PATTERN'];

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

      if (variantId) {
        const idInput = getForm(root) && getForm(root).querySelector('input[name="id"], select[name="id"]');
        if (idInput && String(idInput.value) !== String(variantId)) {
          idInput.value = variantId;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    function hideSpecFields() {
      findOptionWrappers().forEach(({ wrapper, field }) => {
        wrapper.setAttribute('data-ff-826m-spec-field', '1');
        wrapper.style.setProperty('display', 'none', 'important');
        wrapper.setAttribute('aria-hidden', 'true');

        if (!field) return;
        if (!field.hasAttribute('data-ff-826m-was-required')) {
          field.setAttribute('data-ff-826m-was-required', field.required ? '1' : '0');
        }
        field.required = false;
      });
    }

    function applyCertifiedOptions(root) {
      const map = {
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

    function setCertifiedMode(root) {
      const productView = getProductView(root);

      root.classList.add('is-certified');
      productView.classList.add('is-ff-826m-certified');
      document.body.classList.add('is-ff-826m-certified');

      root.querySelectorAll('[data-ff-826m-certified-prop]').forEach((el) => {
        el.disabled = false;
      });
      root.querySelectorAll('[data-ff-826m-required-certified]').forEach((input) => {
        input.required = true;
        input.disabled = false;
        input.setCustomValidity('');
      });

      applyCertifiedOptions(root);
      hideSpecFields();
    }

    function validateCertified(root, event) {
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
            applyCertifiedOptions(root);
            hideSpecFields();
            validateCertified(root, event);
          },
          true
        );
      }

      // Short, finite retry only — apps may inject WIDTH/OFFSET after paint.
      let tries = 0;
      const timer = window.setInterval(function () {
        tries += 1;
        try {
          applyCertifiedOptions(root);
          hideSpecFields();
        } catch (e) {}

        const found = propertyFields('WIDTH').length + propertyFields('OFFSET').length;
        if (found > 0 || tries >= 20) {
          window.clearInterval(timer);
          try {
            setCertifiedMode(root);
          } catch (e) {}
        }
      }, 300);

      setCertifiedMode(root);
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
