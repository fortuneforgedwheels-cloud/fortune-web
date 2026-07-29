/* STOREFRONT_FIX_BUILD 2026-07-29b */
(function () {
  if (window.__ffStorefrontFix) return;
  window.__ffStorefrontFix = true;

  var path = location.pathname || '';
  var onAbout = /\/pages\/about(?:-us)?\/?$/.test(path);
  var hasAboutView = /[?&]view=about(?:&|$)/.test(location.search || '');

  // Always serve the About template view so theme-editor copy/video is not stuck behind page cache.
  if (onAbout && !hasAboutView) {
    location.replace(location.pathname + '?view=about' + (location.hash || ''));
    return;
  }

  document.querySelectorAll('a[href*="/pages/about"]').forEach(function (a) {
    try {
      var url = new URL(a.getAttribute('href'), location.origin);
      if (!/\/pages\/about(?:-us)?\/?$/.test(url.pathname)) return;
      if (url.searchParams.get('view')) return;
      url.searchParams.set('view', 'about');
      a.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + url.hash);
    } catch (e) {}
  });
})();
