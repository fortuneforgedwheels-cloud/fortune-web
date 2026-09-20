(function () {
  if (window.__ffFeaturedSpecsRail) return;
  window.__ffFeaturedSpecsRail = true;

  function init(root) {
    var rail = root.querySelector('[data-ff-specs-rail]');
    var prev = root.querySelector('[data-ff-specs-prev]');
    var next = root.querySelector('[data-ff-specs-next]');
    if (!rail || !prev || !next) return;

    function cardStep() {
      var card = rail.querySelector('.ff-specs__card');
      if (!card) return 280;
      var styles = window.getComputedStyle(rail);
      var gap = parseFloat(styles.columnGap || styles.gap || '24') || 24;
      return card.getBoundingClientRect().width + gap;
    }

    function updateNav() {
      var max = rail.scrollWidth - rail.clientWidth - 2;
      var canScroll = max > 2;
      prev.disabled = !canScroll || rail.scrollLeft <= 2;
      next.disabled = !canScroll || rail.scrollLeft >= max;
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
    document.querySelectorAll('[data-ff-specs]').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
