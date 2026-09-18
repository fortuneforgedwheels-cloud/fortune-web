/**
 * Fitment & Specs: show only dotted <ul> list by default.
 * Other description paragraphs collapse behind "More details".
 */
(function () {
  function enhance(root) {
    if (!root || root.getAttribute('data-ff-specs-ready') === '1') return;
    var body = root.querySelector('.ff-product-specs__body');
    if (!body) return;

    var children = Array.prototype.slice.call(body.children);
    if (!children.length) return;

    var lists = children.filter(function (el) {
      return el.tagName === 'UL';
    });
    var extras = children.filter(function (el) {
      return el.tagName !== 'UL';
    });

    // Nothing to collapse
    if (!extras.length) {
      root.setAttribute('data-ff-specs-ready', '1');
      return;
    }

    // If there is no list, keep everything visible
    if (!lists.length) {
      root.setAttribute('data-ff-specs-ready', '1');
      return;
    }

    var extraWrap = document.createElement('div');
    extraWrap.className = 'ff-product-specs__extra';
    extras.forEach(function (el) {
      extraWrap.appendChild(el);
    });
    body.appendChild(extraWrap);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ff-product-specs__toggle';
    btn.setAttribute('aria-expanded', 'false');
    btn.textContent = 'More details';
    root.appendChild(btn);

    btn.addEventListener('click', function () {
      var open = root.classList.toggle('is-expanded');
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.textContent = open ? 'Less details' : 'More details';
    });

    root.setAttribute('data-ff-specs-ready', '1');
  }

  function run() {
    document.querySelectorAll('[data-ff-product-specs]').forEach(enhance);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }
  window.addEventListener('load', run);
  setTimeout(run, 50);
  setTimeout(run, 400);
})();
