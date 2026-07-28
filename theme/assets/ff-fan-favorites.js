(function () {
  function initVisual(modal) {
    var root = modal.querySelector('[data-ff-fan-visual]');
    if (!root) return null;

    var groups = {};
    Array.prototype.slice.call(root.querySelectorAll('[data-ff-fan-visual-group]')).forEach(function (group) {
      var key = group.getAttribute('data-ff-fan-visual-group');
      groups[key] = {
        el: group,
        slides: Array.prototype.slice.call(group.querySelectorAll('[data-ff-fan-visual-slide]')),
        index: 0
      };
    });

    var prev = root.querySelector('[data-ff-fan-visual-prev]');
    var next = root.querySelector('[data-ff-fan-visual-next]');
    var counter = root.querySelector('[data-ff-fan-visual-counter]');
    var groupKeys = Object.keys(groups);
    var activeKey = groupKeys.length ? groupKeys[0] : null;

    function render() {
      groupKeys.forEach(function (key) {
        var group = groups[key];
        var active = key === activeKey;
        group.el.hidden = !active;
        if (!active) return;
        group.slides.forEach(function (slide, i) {
          var isActive = i === group.index;
          slide.classList.toggle('is-active', isActive);
          slide.hidden = !isActive;
        });
      });

      var current = activeKey ? groups[activeKey] : null;
      var multiple = !!(current && current.slides.length > 1);
      if (prev) prev.hidden = !multiple;
      if (next) next.hidden = !multiple;
      if (counter) {
        counter.textContent = current && current.slides.length
          ? (current.index + 1) + ' / ' + current.slides.length
          : '';
      }
    }

    function go(step) {
      var current = activeKey ? groups[activeKey] : null;
      if (!current || !current.slides.length) return;
      current.index = (current.index + step + current.slides.length) % current.slides.length;
      render();
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    render();

    return {
      setMode: function (key) {
        if (!groups[key]) return;
        activeKey = key;
        groups[key].index = 0;
        render();
      },
      reset: function () {
        activeKey = groupKeys.length ? groupKeys[0] : null;
        groupKeys.forEach(function (key) { groups[key].index = 0; });
        render();
      }
    };
  }

  function initModal(modal) {
    var visual = initVisual(modal);
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
      if (visual) visual.setMode(mode);
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

    function frontLabel() {
      var setup = setups.full;
      if (!setup) return 'Front';
      var dt = setup.querySelector('.ff-fan__specs dt');
      return dt ? dt.textContent.trim() : 'Front';
    }

    function rearLabel() {
      var setup = setups.full;
      if (!setup) return 'Rear';
      var rows = setup.querySelectorAll('.ff-fan__specs dt');
      return rows.length > 1 ? rows[1].textContent.trim() : 'Rear';
    }

    function rearPairLabel() {
      var setup = setups.bead;
      if (!setup) return 'Rear pair';
      var dt = setup.querySelector('.ff-fan__specs dt');
      return dt ? dt.textContent.trim() : 'Rear pair';
    }

    if (addBtn) {
      var defaultLabel = addBtn.getAttribute('data-label-default') || addBtn.textContent.trim();
      var loadingLabel = addBtn.getAttribute('data-label-loading') || 'Adding…';

      addBtn.addEventListener('click', function () {
        var finish = selectedFinish();
        var items = [];
        var missingDesignMsg = errorEl ? errorEl.getAttribute('data-error-missing-design') : null;
        var cartFailedMsg = errorEl ? errorEl.getAttribute('data-error-cart-failed') : null;

        if (mode === 'full') {
          var design = selectedDesign('full');
          if (!design || !design.variantId) {
            if (errorEl) {
              errorEl.textContent = missingDesignMsg || 'Please choose a wheel design before adding to cart.';
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
              'Position': frontLabel(),
              'Size': specText(frontLabel(), 'full'),
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
              'Position': rearLabel(),
              'Size': specText(rearLabel(), 'full'),
              'Fitment': noteText('full')
            }
          });
        } else {
          var beadDesign = selectedDesign('bead');
          if (!beadDesign || !beadDesign.variantId) {
            if (errorEl) {
              errorEl.textContent = missingDesignMsg || 'Please choose a wheel design before adding to cart.';
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
              'Position': rearPairLabel() + ' (beadlock)',
              'Size': specText(rearPairLabel(), 'bead'),
              'Fitment': noteText('bead')
            }
          });
        }

        addBtn.disabled = true;
        addBtn.textContent = loadingLabel;
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
            addBtn.textContent = defaultLabel;
            if (errorEl) {
              errorEl.textContent = cartFailedMsg || 'Something went wrong adding this to your cart. Please try again.';
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
