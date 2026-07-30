(function () {
  if (window.__ffNewProductsRail) return;
  window.__ffNewProductsRail = true;

  function init(root) {
    var rail = root.querySelector('[data-ff-new-rail]');
    var prev = root.querySelector('[data-ff-new-prev]');
    var next = root.querySelector('[data-ff-new-next]');
    if (!rail || !prev || !next) return;

    function cardStep() {
      var card = rail.querySelector('.ff-new__card');
      if (!card) return 260;
      var styles = window.getComputedStyle(rail);
      var gap = parseFloat(styles.columnGap || styles.gap || '16') || 16;
      return card.getBoundingClientRect().width + gap;
    }

    function updateNav() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      prev.disabled = rail.scrollLeft <= 2;
      next.disabled = rail.scrollLeft >= max;
    }

    prev.addEventListener('click', function () {
      rail.scrollBy({ left: -cardStep(), behavior: 'smooth' });
    });
    next.addEventListener('click', function () {
      rail.scrollBy({ left: cardStep(), behavior: 'smooth' });
    });
    rail.addEventListener('scroll', updateNav, { passive: true });
    window.addEventListener('resize', updateNav);
    updateNav();
  }

  function boot() {
    document.querySelectorAll('[data-ff-new]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
