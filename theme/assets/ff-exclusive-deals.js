(function () {
  function selectedFinish(root) {
    var active = root.querySelector('[data-ff-xd-finish].is-selected');
    return active ? active.getAttribute('data-ff-xd-finish') || '' : '';
  }

  function selectedHelpMode(root) {
    var active = root.querySelector('[data-ff-xd-help-mode].is-selected');
    return active ? active.getAttribute('data-ff-xd-help-mode') || 'specialist' : 'specialist';
  }

  function setHelpMode(root, mode) {
    var specialist = mode === 'specialist';
    var specsWrap = root.querySelector('[data-ff-xd-specs-wrap]');
    var specsInput = root.querySelector('[data-ff-xd-specs]');
    var assist = root.querySelector('[data-ff-xd-assist]');
    var helpPreference = root.querySelector('[data-ff-xd-help-preference]');
    var submitBtn = root.querySelector('[data-ff-xd-submit]');
    var subject = root.querySelector('[data-ff-xd-subject]');

    root.querySelectorAll('[data-ff-xd-help-mode]').forEach(function (btn) {
      var active = btn.getAttribute('data-ff-xd-help-mode') === mode;
      btn.classList.toggle('is-selected', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (specsWrap) specsWrap.hidden = specialist;
    if (specsInput) {
      specsInput.required = !specialist;
      if (specialist) specsInput.value = '';
    }
    if (assist) assist.hidden = !specialist;
    if (helpPreference) {
      helpPreference.value = specialist
        ? 'Let a specialist handle it'
        : 'I know my specs';
    }
    if (subject) {
      subject.value = specialist
        ? 'Exclusive Deals — specialist fitment request'
        : 'Exclusive Deals — customer specs';
    }
    if (submitBtn) {
      submitBtn.textContent = specialist
        ? (submitBtn.getAttribute('data-label-specialist') || 'Request specialist email')
        : (submitBtn.getAttribute('data-label-specs') || 'Submit my specs');
    }
  }

  function syncFinish(root) {
    var finishInput = root.querySelector('[data-ff-xd-finish-input]');
    if (finishInput) finishInput.value = selectedFinish(root);
  }

  function openModal(root, card) {
    var modal = root.querySelector('[data-ff-xd-modal]');
    if (!modal) return;

    var design = card.getAttribute('data-design') || 'Design';
    var image = card.getAttribute('data-image') || '';
    var productId = card.getAttribute('data-product-id') || '';

    var titleEl = modal.querySelector('[data-ff-xd-dialog-title]');
    var designInput = modal.querySelector('[data-ff-xd-design-input]');
    var productInput = modal.querySelector('[data-ff-xd-product-id]');
    var img = modal.querySelector('[data-ff-xd-dialog-img]');
    var imgEmpty = modal.querySelector('[data-ff-xd-dialog-img-empty]');
    var errorEl = modal.querySelector('[data-ff-xd-error]');

    if (titleEl) titleEl.textContent = design;
    if (designInput) designInput.value = design;
    if (productInput) productInput.value = productId;
    if (errorEl) errorEl.hidden = true;

    if (img) {
      if (image) {
        img.src = image;
        img.alt = design;
        img.hidden = false;
        if (imgEmpty) imgEmpty.hidden = true;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
        if (imgEmpty) imgEmpty.hidden = false;
      }
    }

    setHelpMode(modal, 'specialist');
    syncFinish(modal);
    modal.hidden = false;
    document.documentElement.classList.add('ff-xd-modal-open');

    var focusTarget = modal.querySelector('[data-ff-xd-help-mode].is-selected') || modal.querySelector('[data-ff-xd-close]');
    if (focusTarget) {
      try { focusTarget.focus(); } catch (e) {}
    }
  }

  function closeModal(root) {
    var modal = root.querySelector('[data-ff-xd-modal]');
    if (!modal) return;
    modal.hidden = true;
    document.documentElement.classList.remove('ff-xd-modal-open');
  }

  function init(root) {
    var modal = root.querySelector('[data-ff-xd-modal]');
    if (!modal) return;

    var submitBtn = modal.querySelector('[data-ff-xd-submit]');
    if (submitBtn) {
      var specialistLabel = modal.getAttribute('data-submit-specialist-label');
      var specsLabel = modal.getAttribute('data-submit-specs-label');
      if (specialistLabel) submitBtn.setAttribute('data-label-specialist', specialistLabel);
      if (specsLabel) submitBtn.setAttribute('data-label-specs', specsLabel);
    }

    root.querySelectorAll('[data-ff-xd-open]').forEach(function (card) {
      card.addEventListener('click', function () {
        openModal(root, card);
      });
      card.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openModal(root, card);
        }
      });
    });

    modal.querySelectorAll('[data-ff-xd-close]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        closeModal(root);
      });
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) closeModal(root);
    });

    modal.querySelectorAll('[data-ff-xd-help-mode]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        setHelpMode(modal, btn.getAttribute('data-ff-xd-help-mode') || 'specialist');
      });
    });

    modal.querySelectorAll('[data-ff-xd-finish]').forEach(function (chip) {
      chip.addEventListener('click', function () {
        modal.querySelectorAll('[data-ff-xd-finish]').forEach(function (other) {
          var active = other === chip;
          other.classList.toggle('is-selected', active);
          other.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        syncFinish(modal);
      });
    });

    var form = modal.querySelector('form');
    if (form) {
      form.addEventListener('submit', function (event) {
        var errorEl = modal.querySelector('[data-ff-xd-error]');
        syncFinish(modal);

        var finish = selectedFinish(modal);
        var mode = selectedHelpMode(modal);
        var ymm = modal.querySelector('[data-ff-xd-ymm]');
        var specs = modal.querySelector('[data-ff-xd-specs]');

        if (!finish) {
          event.preventDefault();
          if (errorEl) {
            errorEl.textContent = 'Please select a wheel finish.';
            errorEl.hidden = false;
          }
          return;
        }

        if (ymm && !String(ymm.value || '').trim()) {
          event.preventDefault();
          if (errorEl) {
            errorEl.textContent = 'Please enter year, make, and model.';
            errorEl.hidden = false;
          }
          return;
        }

        if (mode === 'specs' && specs && !String(specs.value || '').trim()) {
          event.preventDefault();
          if (errorEl) {
            errorEl.textContent = 'Please enter your wheel specs.';
            errorEl.hidden = false;
          }
          return;
        }

        if (errorEl) errorEl.hidden = true;
      });
    }

    setHelpMode(modal, selectedHelpMode(modal));
    syncFinish(modal);

    if (modal.querySelector('[data-ff-xd-success]')) {
      modal.hidden = false;
      document.documentElement.classList.add('ff-xd-modal-open');
    }
  }

  function boot() {
    document.querySelectorAll('[data-ff-exclusive-deals]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target && event.target.querySelector
      ? event.target.querySelector('[data-ff-exclusive-deals]')
      : null;
    if (root) init(root);
    else if (event.target && event.target.matches && event.target.matches('[data-ff-exclusive-deals]')) {
      init(event.target);
    }
  });
})();
