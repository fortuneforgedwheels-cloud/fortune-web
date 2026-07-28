(function () {
  function initModal(modal) {
    var slides = Array.prototype.slice.call(modal.querySelectorAll('[data-ff-project-slide]'));
    var counter = modal.querySelector('[data-ff-project-counter]');
    var prev = modal.querySelector('[data-ff-project-prev]');
    var next = modal.querySelector('[data-ff-project-next]');
    var index = 0;

    function render() {
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.hidden = !active;
      });
      if (counter) {
        counter.textContent = slides.length ? index + 1 + ' / ' + slides.length : '';
      }
      var multiple = slides.length > 1;
      if (prev) prev.hidden = !multiple;
      if (next) next.hidden = !multiple;
    }

    function go(step) {
      if (!slides.length) return;
      index = (index + step + slides.length) % slides.length;
      render();
    }

    if (prev) prev.addEventListener('click', function () { go(-1); });
    if (next) next.addEventListener('click', function () { go(1); });

    modal.addEventListener('keydown', function (event) {
      if (event.key === 'ArrowLeft') go(-1);
      if (event.key === 'ArrowRight') go(1);
    });

    render();
    return {
      reset: function () {
        index = 0;
        render();
      }
    };
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var controllers = {};
    var lastFocus = null;

    root.querySelectorAll('[data-ff-project-modal]').forEach(function (modal) {
      controllers[modal.getAttribute('data-ff-project-modal')] = initModal(modal);
    });

    function closeAll() {
      root.querySelectorAll('[data-ff-project-modal]').forEach(function (modal) {
        modal.hidden = true;
      });
      document.documentElement.classList.remove('ff-projects-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    root.querySelectorAll('[data-ff-project-open]').forEach(function (card) {
      card.addEventListener('click', function () {
        var id = card.getAttribute('data-ff-project-open');
        var modal = root.querySelector('[data-ff-project-modal="' + id + '"]');
        if (!modal) return;
        lastFocus = card;
        closeAll();
        modal.hidden = false;
        document.documentElement.classList.add('ff-projects-open');
        if (controllers[id]) controllers[id].reset();
        var dialog = modal.querySelector('[data-ff-project-dialog]');
        if (dialog) dialog.focus();
      });
    });

    root.querySelectorAll('[data-ff-project-close]').forEach(function (el) {
      el.addEventListener('click', closeAll);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape') return;
      var open = root.querySelector('[data-ff-project-modal]:not([hidden])');
      if (open) closeAll();
    });
  }

  document.querySelectorAll('[data-ff-projects]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-projects]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
