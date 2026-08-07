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
    if (assist) assist.hidden = false;
    if (helpPreference) {
      helpPreference.value = specialist
        ? 'Let a specialist handle it'
        : 'I know my specs';
    }
    if (submitBtn) {
      submitBtn.textContent = specialist
        ? (submitBtn.getAttribute('data-label-specialist') || 'Add full set to cart')
        : (submitBtn.getAttribute('data-label-specs') || 'Add full set to cart');
    }
  }

  function syncFinish(root) {
    var finishInput = root.querySelector('[data-ff-xd-finish-input]');
    if (finishInput) finishInput.value = selectedFinish(root);
  }

  function openCartDrawer() {
    if (window.Shopify && typeof Shopify.getCart === 'function') {
      try {
        Shopify.getCart(function () {
          document.body.classList.add('cart-sidebar-show');
        });
        return;
      } catch (e) {
        /* fall through */
      }
    }
    window.location.href = '/cart';
  }

  function openModal(root, card) {
    var modal = root.querySelector('[data-ff-xd-modal]');
    if (!modal) return;

    var design = card.getAttribute('data-design') || 'Design';
    var image = card.getAttribute('data-image') || '';
    var productId = card.getAttribute('data-product-id') || '';
    var variantId = card.getAttribute('data-variant-id') || '';

    var titleEl = modal.querySelector('[data-ff-xd-dialog-title]');
    var designInput = modal.querySelector('[data-ff-xd-design-input]');
    var productInput = modal.querySelector('[data-ff-xd-product-id]');
    var variantInput = modal.querySelector('[data-ff-xd-variant-id]');
    var img = modal.querySelector('[data-ff-xd-dialog-img]');
    var imgEmpty = modal.querySelector('[data-ff-xd-dialog-img-empty]');
    var errorEl = modal.querySelector('[data-ff-xd-error]');

    if (titleEl) titleEl.textContent = design;
    if (designInput) designInput.value = design;
    if (productInput) productInput.value = productId;
    if (variantInput && variantId) variantInput.value = variantId;
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

  function nudgeHeroVideo(root) {
    var video = root.querySelector('.ff-xd__hero-media video, video.ff-xd__hero-video');
    if (!video) return;
    try {
      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute('muted', '');
      video.setAttribute('playsinline', 'true');
      video.autoplay = true;
      video.setAttribute('autoplay', '');
      if (video.paused) {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {});
        }
      }
    } catch (e) {}
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

    var form = modal.querySelector('[data-ff-xd-form]');
    if (form) {
      form.addEventListener('submit', function (event) {
        event.preventDefault();

        var errorEl = modal.querySelector('[data-ff-xd-error]');
        syncFinish(modal);

        var finish = selectedFinish(modal);
        var mode = selectedHelpMode(modal);
        var ymm = modal.querySelector('[data-ff-xd-ymm]');
        var specs = modal.querySelector('[data-ff-xd-specs]');
        var notes = modal.querySelector('[data-ff-xd-notes]');
        var designInput = modal.querySelector('[data-ff-xd-design-input]');
        var variantInput = modal.querySelector('[data-ff-xd-variant-id]');
        var helpPreference = modal.querySelector('[data-ff-xd-help-preference]');
        var atcBtn = modal.querySelector('[data-ff-xd-submit]');
        var fullSetLabel = root.getAttribute('data-full-set-label') || 'Full set';

        if (!finish) {
          if (errorEl) {
            errorEl.textContent = 'Please select a wheel finish.';
            errorEl.hidden = false;
          }
          return;
        }

        if (ymm && !String(ymm.value || '').trim()) {
          if (errorEl) {
            errorEl.textContent = 'Please enter year, make, and model.';
            errorEl.hidden = false;
          }
          return;
        }

        if (mode === 'specs' && specs && !String(specs.value || '').trim()) {
          if (errorEl) {
            errorEl.textContent = 'Please enter your wheel specs.';
            errorEl.hidden = false;
          }
          return;
        }

        var variantId = variantInput ? Number(variantInput.value) : 0;
        if (!variantId) {
          if (errorEl) {
            errorEl.textContent = 'Checkout product unavailable. Please refresh and try again.';
            errorEl.hidden = false;
          }
          return;
        }

        if (errorEl) errorEl.hidden = true;

        var properties = {
          'Package': fullSetLabel,
          'Wheel Design': designInput ? designInput.value : '',
          'Finish': finish,
          'Vehicle': ymm ? String(ymm.value || '').trim() : '',
          'Fitment path': helpPreference ? helpPreference.value : ''
        };

        if (mode === 'specs' && specs) {
          properties['Wheel specs'] = String(specs.value || '').trim();
        }
        if (notes && String(notes.value || '').trim()) {
          properties['Notes'] = String(notes.value || '').trim();
        }

        var defaultLabel = atcBtn
          ? (atcBtn.getAttribute('data-label-specialist') || atcBtn.textContent.trim() || 'Add full set to cart')
          : 'Add full set to cart';

        if (atcBtn) {
          atcBtn.disabled = true;
          atcBtn.textContent = 'Adding…';
        }

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            items: [{
              id: variantId,
              quantity: 1,
              properties: properties
            }]
          })
        })
          .then(function (response) {
            if (!response.ok) throw new Error('cart-add-failed');
            return response.json();
          })
          .then(function () {
            if (atcBtn) {
              atcBtn.disabled = false;
              atcBtn.textContent = defaultLabel;
            }
            closeModal(root);
            openCartDrawer();
          })
          .catch(function () {
            if (atcBtn) {
              atcBtn.disabled = false;
              atcBtn.textContent = defaultLabel;
            }
            if (errorEl) {
              errorEl.textContent = 'Could not add to cart. Make sure the exclusive full-set product is available on the Online Store.';
              errorEl.hidden = false;
            }
          });
      });
    }

    setHelpMode(modal, selectedHelpMode(modal));
    syncFinish(modal);
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
