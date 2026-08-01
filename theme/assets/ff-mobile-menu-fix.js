(function () {
  try {
    function removeLoadingSkeleton(menuMobile) {
      if (!menuMobile) return;
      menuMobile.querySelectorAll('.list-menu-loading').forEach(function (node) {
        node.remove();
      });
    }

    function hasMenuItems(menuMobile) {
      return Boolean(
        menuMobile.querySelector('.menu-lv-item, .list-menu > .menu-lv-1, .list-menu > li.menu-lv-item')
      );
    }

    function moveDesktopNav(menuMobile) {
      var desktopNav = document.querySelector('#HeaderNavigation [data-navigation]');
      if (!desktopNav || !desktopNav.children.length) return false;

      Array.from(desktopNav.children).forEach(function (child) {
        menuMobile.appendChild(child);
      });
      return true;
    }

    function fetchMobileNav(menuMobile) {
      var root = window.routes && window.routes.root ? window.routes.root : '/';
      var url = root.replace(/\/$/, '') + '/search?view=ajax_mega_menu';

      return fetch(url)
        .then(function (response) {
          return response.text();
        })
        .then(function (text) {
          var html = document.createElement('div');
          html.innerHTML = text;
          var remoteNav = html.querySelector('#HeaderNavigation [data-navigation]');
          if (!remoteNav || !remoteNav.children.length) return;

          menuMobile.innerHTML = '';
          Array.from(remoteNav.children).forEach(function (child) {
            menuMobile.appendChild(child.cloneNode(true));
          });
        })
        .catch(function () {});
    }

    function populateMobileMenu() {
      var menuMobile = document.querySelector('[data-navigation-mobile]');
      if (!menuMobile) return;

      removeLoadingSkeleton(menuMobile);
      if (hasMenuItems(menuMobile)) return;

      if (window.mobile_menu === 'custom') return;
      if (moveDesktopNav(menuMobile)) return;

      fetchMobileNav(menuMobile);
    }

    function onMenuOpened() {
      if (!document.body.classList.contains('menu-open')) return;
      populateMobileMenu();
    }

    document.addEventListener(
      'click',
      function (event) {
        if (!event.target.closest('[data-mobile-menu], .mobileMenu-toggle')) return;
        window.setTimeout(onMenuOpened, 0);
        window.setTimeout(onMenuOpened, 150);
      },
      true
    );

    var observer = new MutationObserver(function () {
      onMenuOpened();
    });
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] });

    if (document.body.classList.contains('menu-open')) {
      onMenuOpened();
    }
  } catch (e) {
    // Never break the storefront.
  }
})();
