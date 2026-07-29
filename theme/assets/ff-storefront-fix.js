/* STOREFRONT_FIX_BUILD 2026-07-29c */
(function () {
  if (window.__ffStorefrontFix) return;
  window.__ffStorefrontFix = true;

  var path = location.pathname || '';
  var onAbout = /\/pages\/about(?:-us)?\/?$/.test(path);
  var hasFreshView = /[?&]view=ff-about(?:&|$)/.test(location.search || '');

  if (onAbout && !hasFreshView) {
    location.replace(location.pathname + '?view=ff-about' + (location.hash || ''));
    return;
  }

  document.querySelectorAll('a[href*="/pages/about"]').forEach(function (a) {
    try {
      var url = new URL(a.getAttribute('href'), location.origin);
      if (!/\/pages\/about(?:-us)?\/?$/.test(url.pathname)) return;
      if (url.searchParams.get('view') === 'ff-about') return;
      url.searchParams.set('view', 'ff-about');
      a.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + url.hash);
    } catch (e) {}
  });
})();
