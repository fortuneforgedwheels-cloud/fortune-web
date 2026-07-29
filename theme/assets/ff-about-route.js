/* STOREFRONT_FIX_BUILD 2026-07-29e-preserve-copy */
(function () {
  if (window.__ffStorefrontFix) return;
  window.__ffStorefrontFix = true;

  var ABOUT_VIEW = 'ff-about-now';
  var path = location.pathname || '';
  var onAbout = /\/pages\/about(?:-us)?\/?$/.test(path);
  var hasFreshView = new RegExp('[?&]view=' + ABOUT_VIEW + '(?:&|$)').test(location.search || '');

  if (onAbout && !hasFreshView) {
    location.replace(location.pathname + '?view=' + ABOUT_VIEW + (location.hash || ''));
    return;
  }

  document.querySelectorAll('a[href*="/pages/about"]').forEach(function (a) {
    try {
      var url = new URL(a.getAttribute('href'), location.origin);
      if (!/\/pages\/about(?:-us)?\/?$/.test(url.pathname)) return;
      if (url.searchParams.get('view') === ABOUT_VIEW) return;
      url.searchParams.set('view', ABOUT_VIEW);
      a.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + url.hash);
    } catch (e) {}
  });
})();
