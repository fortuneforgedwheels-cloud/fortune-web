/* ABOUT_JS_BUILD 2026-07-29a */
(() => {
  // Hide stale editor hints left in sticky page-cache HTML
  try {
    const style = document.createElement('style');
    style.setAttribute('data-ff-about-hint-hide', '1');
    style.textContent =
      '.ff-about__story-video-hint{display:none!important}' +
      '.ff-about__story-video--poster .ff-about__story-video-hint{display:none!important}';
    document.head.appendChild(style);
  } catch (e) {}

  const path = location.pathname || '';
  const onAbout = /\/pages\/about(?:-us)?\/?$/.test(path);
  if (onAbout) {
    const main = document.getElementById('MainContent');
    const stale =
      !!document.querySelector('.ff-about__story-video-hint') ||
      /Add a video in Theme settings/i.test(main ? main.textContent : '');
    if (stale && main && !window.__ffAboutUpgrading) {
      window.__ffAboutUpgrading = true;
      fetch(location.pathname + '?view=about', {
        credentials: 'same-origin',
        headers: { Accept: 'text/html' }
      })
        .then((res) => (res.ok ? res.text() : Promise.reject()))
        .then((html) => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          const next = doc.getElementById('MainContent');
          if (!next || !next.querySelector('.ff-about__hero, .ff-about')) return;
          if (/Add a video in Theme settings/i.test(next.textContent || '')) return;
          const css = doc.querySelector('link[href*="ff-about"]');
          if (css && !document.querySelector('link[href*="ff-about-page"], link[href*="ff-about.css"]')) {
            document.head.appendChild(css.cloneNode(true));
          }
          main.replaceWith(next);
          document.documentElement.classList.add('ff-about-upgraded');
        })
        .catch(() => {});
    }
  }

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
