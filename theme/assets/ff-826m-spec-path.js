(function () {
  const HIDE_TITLES = ['WIDTH', 'OFFSET', 'LUG PATTERN'];
  const KEEP_VISIBLE = ['FACE COLOR', 'RING COLOR', 'BOLT COLOR', 'LEAD TIME PREFERENCE'];

  function normalizeTitle(text) {
    return String(text || '')
      .replace(/:$/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toUpperCase();
  }

  function getRoot() {
    return document.querySelector('[data-ff-826m-path]');
  }

  function getProductView(root) {
    return root.closest('.productView') || document.querySelector('.productView') || document.body;
  }

  function getForm(root) {
    const formId = root.getAttribute('data-form-id');
    return (formId && document.getElementById(formId)) || root.closest('form') || document.querySelector('form[data-type="add-to-cart-form"]');
  }

  function findOptionWrappers() {
    const wrappers = Array.from(document.querySelectorAll('.selector-wrapper'));
    return wrappers
      .map((wrapper) => {
        const titleEl = wrapper.querySelector('.bcpo-title, label, .form__label, legend');
        const title = normalizeTitle(titleEl ? titleEl.textContent : '');
        return { wrapper, title };
      })
      .filter((item) => item.title);
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

    const radios = productView.querySelectorAll('.productView-variants input.product-form__radio, variant-radios input.product-form__radio');
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

  function markSpecFields() {
    findOptionWrappers().forEach(({ wrapper, title }) => {
      if (HIDE_TITLES.includes(title)) {
        wrapper.setAttribute('data-ff-826m-spec-field', title);
      } else if (KEEP_VISIBLE.includes(title)) {
        wrapper.removeAttribute('data-ff-826m-spec-field');
      }
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
      if (!certified) {
        // Keep values out of cart when switching away from certified.
        input.disabled = true;
      } else {
        input.disabled = false;
      }
    });

    markSpecFields();

    if (certified) {
      applyCertifiedOptions(root);
    }
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
            validateCertified(root, event);
          }
        },
        true
      );
    }

    // Re-apply after BCPO paints options.
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      markSpecFields();
      if (currentMode(root) === 'certified') applyCertifiedOptions(root);
      if (document.querySelectorAll('.selector-wrapper').length > 0 || tries > 40) {
        window.clearInterval(timer);
        setMode(root, currentMode(root));
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
})();
