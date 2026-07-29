(() => {
  const points = document.querySelectorAll('[data-ff-about-point]');
  if (!points.length) return;

  if (!('IntersectionObserver' in window)) {
    points.forEach((el) => el.classList.add('is-in'));
    return;
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.25, rootMargin: '0px 0px -8% 0px' }
  );

  points.forEach((el, i) => {
    el.style.transitionDelay = `${i * 90}ms`;
    io.observe(el);
  });
})();
