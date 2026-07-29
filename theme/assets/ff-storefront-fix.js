/* STOREFRONT_FIX_BUILD 2026-07-29a */
(function () {
  if (window.__ffStorefrontFix) return;
  window.__ffStorefrontFix = true;

  function hideAboutHints() {
    try {
      var style = document.createElement('style');
      style.setAttribute('data-ff-storefront-fix', '1');
      style.textContent =
        '.ff-about__story-video-hint{display:none!important}' +
        '.ff-about__story-video--poster .ff-about__story-video-hint{display:none!important}';
      document.head.appendChild(style);
    } catch (e) {}
  }

  function rewriteAboutLinks() {
    document.querySelectorAll('a[href*="/pages/about"]').forEach(function (a) {
      try {
        var url = new URL(a.getAttribute('href'), location.origin);
        if (!/\/pages\/about(?:-us)?\/?$/.test(url.pathname)) return;
        if (url.searchParams.get('view')) return;
        url.searchParams.set('view', 'about');
        a.setAttribute('href', url.pathname + '?' + url.searchParams.toString() + url.hash);
      } catch (e) {}
    });
  }

  function upgradeAboutPage() {
    var path = location.pathname || '';
    if (!/\/pages\/about(?:-us)?\/?$/.test(path)) return;
    if (/[?&]view=about(?:&|$)/.test(location.search || '')) return;

    var main = document.getElementById('MainContent');
    if (!main) return;
    var stale =
      !!main.querySelector('.ff-about__story-video-hint') ||
      /Add a video in Theme settings/i.test(main.textContent || '') ||
      !main.querySelector('.ff-about__hero, .ff-about');
    if (!stale) return;

    // Prefer a clean template view over sticky default page cache
    location.replace(location.pathname + '?view=about' + (location.hash || ''));
  }

  hideAboutHints();

  function run() {
    rewriteAboutLinks();
    upgradeAboutPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
})();
