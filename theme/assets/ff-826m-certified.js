(function () {
  try {
    const COLOR_TITLES = ['FACE COLOR', 'RING COLOR', 'BOLT COLOR', 'HARDWARE COLOR'];
    const COLOR_ORDER = ['FACE COLOR', 'RING COLOR', 'BOLT COLOR', 'HARDWARE COLOR'];
    const HIDE_TITLES = ['SIZE', 'DIAMETER', 'WIDTH', 'OFFSET', 'LUG PATTERN'];

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

    function findOptionNodes(productView) {
      const results = [];
      const seen = new Set();

      function pushNode(node, title) {
        if (!node || seen.has(node)) return;
        // Prefer outermost unique wrappers — skip if an ancestor is already tracked
        for (let i = 0; i < results.length; i++) {
          if (results[i].wrapper.contains(node)) return;
          if (node.contains(results[i].wrapper)) {
            seen.delete(results[i].wrapper);
            results.splice(i, 1);
            i -= 1;
          }
        }
        seen.add(node);
        results.push({ wrapper: node, title: title || '' });
      }

      productView
        .querySelectorAll('.selector-wrapper, [class*="bcpo-option"], [class*="bcpo_option"], [id*="bcpo"], .line-item-property__field')
        .forEach((node) => {
          if (node.closest('[data-ff-826m-path]') && !node.closest('[data-ff-826m-color-slot]')) return;
          const titleEl = node.querySelector('.bcpo-title, .bcpo-label, label, legend, .form-label, .form__label');
          if (!titleEl) return;
          const key = optionKeyFromLabel(titleEl.textContent);
          if (!key) return;
          pushNode(node, key);
        });

      // Catch property inputs by name when wrappers are odd / late-injected
      HIDE_TITLES.concat(COLOR_TITLES).forEach((name) => {
        propertyFields(name).forEach((el) => {
          if (el.closest('[data-ff-826m-path]') && !el.closest('[data-ff-826m-color-slot]')) return;
          const wrapper =
            el.closest('.selector-wrapper') ||
            el.closest('[class*="bcpo"]') ||
            el.closest('.line-item-property__field') ||
            el.closest('.product-form__input') ||
            el.parentElement;
          pushNode(wrapper, name);
        });
      });

      return results;
    }

    function isColorTitle(title) {
      return COLOR_TITLES.indexOf(normalizeTitle(title)) !== -1;
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
        const form = getForm(root);
        const idInput = form && form.querySelector('input[name="id"], select[name="id"]');
        if (idInput && String(idInput.value) !== String(variantId)) {
          idInput.value = variantId;
          idInput.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }

    function rememberHome(wrapper) {
      if (wrapper.__ff826mHome) return;
      wrapper.__ff826mHome = {
        parent: wrapper.parentNode,
        next: wrapper.nextSibling,
      };
    }

    function restoreHome(wrapper) {
      const home = wrapper.__ff826mHome;
      if (!home || !home.parent) return;
      if (home.next && home.next.parentNode === home.parent) {
        home.parent.insertBefore(wrapper, home.next);
      } else {
        home.parent.appendChild(wrapper);
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
      });

      selectCertifiedSize(root);
    }

    function syncOptionVisibility(root, certified) {
      const productView = getProductView(root);
      const colorSlot = root.querySelector('[data-ff-826m-color-slot]');
      const nodes = findOptionNodes(productView);
      const colorNodes = [];

      nodes.forEach(({ wrapper, title }) => {
        const color = isColorTitle(title);
        rememberHome(wrapper);

        if (certified) {
          if (color) {
            colorNodes.push({ wrapper: wrapper, title: normalizeTitle(title) });
            wrapper.style.removeProperty('display');
            wrapper.setAttribute('aria-hidden', 'false');
            wrapper.setAttribute('data-ff-826m-color-field', '1');
          } else {
            wrapper.style.setProperty('display', 'none', 'important');
            wrapper.setAttribute('aria-hidden', 'true');
            wrapper.setAttribute('data-ff-826m-spec-field', '1');
            const field = wrapper.querySelector('select, input, textarea');
            if (field) {
              if (!field.hasAttribute('data-ff-826m-was-required')) {
                field.setAttribute('data-ff-826m-was-required', field.required ? '1' : '0');
              }
              field.required = false;
            }
          }
        } else {
          restoreHome(wrapper);
          wrapper.style.removeProperty('display');
          wrapper.setAttribute('aria-hidden', 'false');
          wrapper.removeAttribute('data-ff-826m-spec-field');
          wrapper.removeAttribute('data-ff-826m-color-field');
          const field = wrapper.querySelector('select, input, textarea');
          if (field && field.getAttribute('data-ff-826m-was-required') === '1') {
            field.required = true;
          }
        }
      });

      if (certified && colorSlot) {
        // Place colors in FACE → RING → BOLT order under certified panel
        COLOR_ORDER.forEach((wanted) => {
          colorNodes.forEach(({ wrapper, title }) => {
            if (title !== wanted) return;
            if (wrapper.parentNode !== colorSlot) colorSlot.appendChild(wrapper);
          });
        });
        // Any leftover color titles not in order list
        colorNodes.forEach(({ wrapper }) => {
          if (wrapper.parentNode !== colorSlot) colorSlot.appendChild(wrapper);
        });
      }
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
      syncOptionVisibility(root, certified);
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
            syncOptionVisibility(root, true);
            validateCertified(root, event);
          },
          true
        );
      }

      // Short, finite retry — BCPO may inject color fields after paint.
      let tries = 0;
      const timer = window.setInterval(function () {
        tries += 1;
        try {
          setMode(root, currentMode(root));
        } catch (e) {}

        const productView = getProductView(root);
        const colorsFound = findOptionNodes(productView).some(({ title }) => isColorTitle(title));
        if (colorsFound || tries >= 25) {
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
