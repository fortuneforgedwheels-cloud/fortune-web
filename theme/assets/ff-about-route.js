/* STOREFRONT_FIX_BUILD 2026-07-29f-no-editor-redirect */
(function () {
  if (window.__ffStorefrontFix) return;
  window.__ffStorefrontFix = true;

  // Never redirect inside the Shopify theme editor
  if (window.Shopify && (Shopify.designMode || Shopify.editorAssets)) return;

  var ABOUT_VIEW = 'ff-about-copy';
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
