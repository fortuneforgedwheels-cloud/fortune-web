(function () {
  function initModal(modal) {
    var config = modal.querySelector('[data-ff-fan-config]');
    var modeButtons = Array.prototype.slice.call(modal.querySelectorAll('[data-ff-fan-mode]'));
    var setups = {
      full: modal.querySelector('[data-ff-fan-setup="full"]'),
      bead: modal.querySelector('[data-ff-fan-setup="bead"]')
    };
    var addBtn = modal.querySelector('[data-ff-fan-add]');
    var errorEl = modal.querySelector('[data-ff-fan-error]');
    var vehicle = addBtn ? addBtn.getAttribute('data-vehicle') || '' : '';
    var mode = setups.full ? 'full' : 'bead';

    function setMode(next) {
      if (!setups[next]) return;
      mode = next;
      modeButtons.forEach(function (btn) {
        btn.classList.toggle('is-selected', btn.getAttribute('data-ff-fan-mode') === mode);
      });
      Object.keys(setups).forEach(function (key) {
        if (setups[key]) setups[key].hidden = key !== mode;
      });
      if (errorEl) errorEl.hidden = true;
    }

    modeButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        setMode(btn.getAttribute('data-ff-fan-mode'));
      });
    });

    if (config) {
      config.querySelectorAll('[data-ff-fan-designs]').forEach(function (group) {
        var buttons = Array.prototype.slice.call(group.querySelectorAll('[data-ff-fan-design]'));
        buttons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            buttons.forEach(function (b) { b.classList.toggle('is-selected', b === btn); });
          });
        });
      });

      var finishGroup = config.querySelector('[data-ff-fan-finishes]');
      if (finishGroup) {
        var finishButtons = Array.prototype.slice.call(finishGroup.querySelectorAll('[data-ff-fan-finish]'));
        finishButtons.forEach(function (btn) {
          btn.addEventListener('click', function () {
            finishButtons.forEach(function (b) { b.classList.toggle('is-selected', b === btn); });
          });
        });
      }
    }

    function selectedDesign(setupKey) {
      var group = modal.querySelector('[data-ff-fan-designs="' + setupKey + '"]');
      if (!group) return null;
      var selected = group.querySelector('.ff-fan__design.is-selected') || group.querySelector('[data-ff-fan-design]');
      if (!selected) return null;
      return {
        variantId: selected.getAttribute('data-variant-id'),
        title: selected.getAttribute('data-title'),
        price: selected.getAttribute('data-price')
      };
    }

    function selectedFinish() {
      var group = modal.querySelector('[data-ff-fan-finishes]');
      if (!group) return '';
      var selected = group.querySelector('.ff-fan__finish.is-selected') || group.querySelector('[data-ff-fan-finish]');
      return selected ? selected.getAttribute('data-ff-fan-finish') : '';
    }

    function specText(dtLabel, setupKey) {
      var setup = setups[setupKey];
      if (!setup) return '';
      var rows = Array.prototype.slice.call(setup.querySelectorAll('.ff-fan__specs dt'));
      for (var i = 0; i < rows.length; i++) {
        if (rows[i].textContent.trim().toLowerCase() === dtLabel.toLowerCase()) {
          var dd = rows[i].nextElementSibling;
          return dd ? dd.textContent.trim() : '';
        }
      }
      return '';
    }

    function noteText(setupKey) {
      var setup = setups[setupKey];
      if (!setup) return '';
      var note = setup.querySelector('.ff-fan__note');
      return note ? note.textContent.trim() : '';
    }

    if (addBtn) {
      addBtn.addEventListener('click', function () {
        var finish = selectedFinish();
        var items = [];

        if (mode === 'full') {
          var design = selectedDesign('full');
          if (!design || !design.variantId) {
            if (errorEl) {
              errorEl.textContent = 'Please choose a wheel design before adding to cart.';
              errorEl.hidden = false;
            }
            return;
          }
          items.push({
            id: Number(design.variantId),
            quantity: 2,
            properties: {
              'Vehicle': vehicle,
              'Wheel Design': design.title,
              'Finish': finish,
              'Position': 'Front',
              'Size': specText('Front', 'full'),
              'Fitment': noteText('full')
            }
          });
          items.push({
            id: Number(design.variantId),
            quantity: 2,
            properties: {
              'Vehicle': vehicle,
              'Wheel Design': design.title,
              'Finish': finish,
              'Position': 'Rear',
              'Size': specText('Rear', 'full'),
              'Fitment': noteText('full')
            }
          });
        } else {
          var beadDesign = selectedDesign('bead');
          if (!beadDesign || !beadDesign.variantId) {
            if (errorEl) {
              errorEl.textContent = 'Please choose a wheel design before adding to cart.';
              errorEl.hidden = false;
            }
            return;
          }
          items.push({
            id: Number(beadDesign.variantId),
            quantity: 2,
            properties: {
              'Vehicle': vehicle,
              'Wheel Design': beadDesign.title,
              'Finish': finish,
              'Position': 'Rear pair (beadlock)',
              'Size': specText('Rear pair', 'bead'),
              'Fitment': noteText('bead')
            }
          });
        }

        addBtn.disabled = true;
        addBtn.textContent = 'Adding…';
        if (errorEl) errorEl.hidden = true;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ items: items })
        })
          .then(function (response) {
            if (!response.ok) throw new Error('cart-add-failed');
            return response.json();
          })
          .then(function () {
            window.location.href = '/cart';
          })
          .catch(function () {
            addBtn.disabled = false;
            addBtn.textContent = 'Add My Setup to Cart';
            if (errorEl) {
              errorEl.textContent = 'Something went wrong adding this to your cart. Please try again.';
              errorEl.hidden = false;
            }
          });
      });
    }

    setMode(mode);
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var lastFocus = null;

    root.querySelectorAll('[data-ff-fan-modal]').forEach(function (modal) {
      initModal(modal);
    });

    function closeAll() {
      root.querySelectorAll('[data-ff-fan-modal]').forEach(function (modal) {
        modal.hidden = true;
      });
      document.documentElement.classList.remove('ff-fan-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    root.querySelectorAll('[data-ff-fan-open]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-ff-fan-open');
        var modal = root.querySelector('[data-ff-fan-modal="' + id + '"]');
        if (!modal) return;
        lastFocus = card;
        closeAll();
        modal.hidden = false;
        document.documentElement.classList.add('ff-fan-open');
        var dialog = modal.querySelector('[data-ff-fan-dialog]');
        if (dialog) dialog.focus();
      });
    });

    root.querySelectorAll('[data-ff-fan-close]').forEach(function (el) {
      el.addEventListener('click', closeAll);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var open = root.querySelector('[data-ff-fan-modal]:not([hidden])');
      if (open) closeAll();
    });
  }

  document.querySelectorAll('[data-ff-fan]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-fan]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
