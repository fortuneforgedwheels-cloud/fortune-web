(function () {
  const HIDE_TITLES = ['WIDTH', 'OFFSET', 'LUG PATTERN'];
  const HIDE_PROPERTY_NAMES = ['WIDTH', 'OFFSET', 'LUG PATTERN'];

  function normalizeTitle(text) {
    return String(text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function optionKeyFromLabel(text) {
    const normalized = normalizeTitle(text);
    // BCPO labels often look like "WIDTH: PLUG N' PLAY || KEEP OEM SPECS"
    const beforeColon = normalized.split(':')[0].trim();
    return beforeColon;
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

  function findOptionWrappers() {
    const nodes = Array.from(
      document.querySelectorAll(
        '.selector-wrapper, .bcpo-dropdown, .bcpo-default, [class*="bcpo-front-dd"], .product-form__input'
      )
    );

    const seen = new Set();
    const results = [];

    nodes.forEach((node) => {
      if (seen.has(node)) return;

      const titleEl = node.querySelector('.bcpo-title, .bcpo-label, label, .form__label, legend, span');
      let key = optionKeyFromLabel(titleEl ? titleEl.textContent : '');

      if (!HIDE_TITLES.includes(key)) {
        const named = node.querySelector('select[name^="properties["], input[name^="properties["]');
        if (named) {
          const match = String(named.getAttribute('name') || '').match(/properties\[([^\]]+)\]/i);
          if (match) key = normalizeTitle(match[1]);
        }
      }

      if (!HIDE_TITLES.includes(key) && !HIDE_PROPERTY_NAMES.includes(key)) return;

      // Prefer the closest BCPO wrapper so we hide the whole control, not just an inner input.
      const wrapper =
        node.closest('.selector-wrapper') ||
        node.closest('.bcpo-dropdown') ||
        node.closest('.bcpo-default') ||
        node;

      if (seen.has(wrapper)) return;
      seen.add(wrapper);
      results.push({ wrapper, title: key });
    });

    // Fallback: locate by property name even if wrappers use unexpected markup.
    HIDE_PROPERTY_NAMES.forEach((name) => {
      document.querySelectorAll(`[name="properties[${name}]"], [name^="properties[${name}]"]`).forEach((el) => {
        const wrapper =
          el.closest('.selector-wrapper') ||
          el.closest('.bcpo-dropdown') ||
          el.closest('.bcpo-default') ||
          el.closest('.product-form__input') ||
          el.parentElement;
        if (!wrapper || seen.has(wrapper)) return;
        seen.add(wrapper);
        results.push({ wrapper, title: name });
      });
    });

    return results;
  }

  function setSelectValue(wrapper, desired) {
    if (!wrapper || desired == null) return false;
    const select = wrapper.querySelector('select');
    if (select) {
      const wanted = String(desired).trim();
      const options = Array.from(select.options);
      let match = options.find((opt) => opt.value === wanted || opt.text.trim() === wanted);
      if (!match) {
        match = options.find((opt) => opt.value.includes(wanted) || opt.text.includes(wanted));
      }
      if (match) {
        select.value = match.value;
        select.dispatchEvent(new Event('input', { bubbles: true }));
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }

    const inputs = Array.from(wrapper.querySelectorAll('input[type="radio"], input[type="checkbox"]'));
    const wanted = String(desired).trim().toUpperCase();
    const match = inputs.find((input) => String(input.value).trim().toUpperCase() === wanted);
    if (match) {
      match.checked = true;
      match.dispatchEvent(new Event('change', { bubbles: true }));
      match.dispatchEvent(new Event('click', { bubbles: true }));
      return true;
    }
    return false;
  }

  function selectCertifiedSize(root) {
    const size = root.getAttribute('data-certified-size') || '18X11';
    const variantId = root.getAttribute('data-certified-variant-id');
    const productView = getProductView(root);

    const radios = productView.querySelectorAll(
      '.productView-variants input.product-form__radio, variant-radios input.product-form__radio'
    );
    let matched = null;
    radios.forEach((radio) => {
      const value = String(radio.value || '').replace(/\s+/g, '').toUpperCase();
      if (value === String(size).replace(/\s+/g, '').toUpperCase()) matched = radio;
    });

    if (matched && !matched.checked) {
      matched.click();
    } else if (matched) {
      matched.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (variantId) {
      const idInput = getForm(root)?.querySelector('input[name="id"], select[name="id"]');
      if (idInput) {
        idInput.value = variantId;
        idInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  }

  function hideSpecFields(certified) {
    findOptionWrappers().forEach(({ wrapper, title }) => {
      wrapper.setAttribute('data-ff-826m-spec-field', title);
      wrapper.style.display = certified ? 'none' : '';
      wrapper.setAttribute('aria-hidden', certified ? 'true' : 'false');

      wrapper.querySelectorAll('select, input, textarea').forEach((field) => {
        if (certified) {
          field.setAttribute('data-ff-826m-was-required', field.required ? '1' : '0');
          field.required = false;
        } else if (field.getAttribute('data-ff-826m-was-required') === '1') {
          field.required = true;
        }
      });
    });
  }

  function applyCertifiedOptions(root) {
    const map = {
      WIDTH: root.getAttribute('data-certified-width'),
      OFFSET: root.getAttribute('data-certified-offset'),
      'LUG PATTERN': root.getAttribute('data-certified-lug'),
    };

    findOptionWrappers().forEach(({ wrapper, title }) => {
      if (map[title] != null) setSelectValue(wrapper, map[title]);
    });

    // Also set by property name in case wrappers were missed.
    Object.keys(map).forEach((name) => {
      document.querySelectorAll(`[name="properties[${name}]"]`).forEach((el) => {
        if (el.tagName === 'SELECT') {
          const wanted = String(map[name]).trim();
          const options = Array.from(el.options);
          const match =
            options.find((opt) => opt.value === wanted || opt.text.trim() === wanted) ||
            options.find((opt) => opt.value.includes(wanted) || opt.text.includes(wanted));
          if (match) {
            el.value = match.value;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
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

    if (certified) {
      applyCertifiedOptions(root);
    }
    hideSpecFields(certified);
  }

  function currentMode(root) {
    const checked = root.querySelector('input[type="radio"]:checked');
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
      radio.addEventListener('change', () => setMode(root, radio.value));
    });

    root.querySelectorAll('[data-ff-826m-required-certified]').forEach((input) => {
      input.addEventListener('input', () => input.setCustomValidity(''));
    });

    const form = getForm(root);
    if (form) {
      form.addEventListener(
        'submit',
        (event) => {
          if (currentMode(root) === 'certified') {
            applyCertifiedOptions(root);
            hideSpecFields(true);
            validateCertified(root, event);
          }
        },
        true
      );
    }

    // Keep re-applying while BCPO paints / re-renders options.
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      if (currentMode(root) === 'certified') {
        applyCertifiedOptions(root);
        hideSpecFields(true);
      }
      const found = document.querySelectorAll('[name="properties[WIDTH]"], [name="properties[OFFSET]"], [name="properties[LUG PATTERN]"]').length;
      if ((found > 0 && tries > 4) || tries > 48) {
        window.clearInterval(timer);
        setMode(root, currentMode(root));
      }
    }, 250);

    const observer = new MutationObserver(() => {
      if (currentMode(root) !== 'certified') return;
      applyCertifiedOptions(root);
      hideSpecFields(true);
    });
    observer.observe(document.body, { childList: true, subtree: true });
    root._ff826mObserver = observer;

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
})();
