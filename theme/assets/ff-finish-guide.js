(function () {
  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    var tabs = Array.prototype.slice.call(root.querySelectorAll('[data-ff-finishes-tab]'));
    var panels = Array.prototype.slice.call(root.querySelectorAll('[data-ff-finishes-panel]'));

    function setActive(id) {
      tabs.forEach(function (tab) {
        var active = tab.getAttribute('data-ff-finishes-tab') === id;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function (panel) {
        var active = panel.getAttribute('data-ff-finishes-panel') === id;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
      });
    }

    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        setActive(tab.getAttribute('data-ff-finishes-tab'));
      });
    });
  }

  document.querySelectorAll('[data-ff-finishes]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-finishes]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();
