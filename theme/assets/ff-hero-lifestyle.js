(function () {
  function setViewport(root) {
    var width = root.getBoundingClientRect().width || window.innerWidth || 1200;
    var mobile = width <= 749.98;
    root.setAttribute('data-ff-viewport', mobile ? 'mobile' : 'desktop');
    root.classList.toggle('is-mobile-viewport', mobile);

    root.querySelectorAll('[data-ff-desktop-layer]').forEach(function (el) {
      el.setAttribute('aria-hidden', mobile ? 'true' : 'false');
    });
    root.querySelectorAll('[data-ff-mobile-layer]').forEach(function (el) {
      el.setAttribute('aria-hidden', mobile ? 'false' : 'true');
    });
  }

  function init(root) {
    if (!root || root.dataset.ffReady === '1') return;
    root.dataset.ffReady = '1';

    setViewport(root);
    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () {
        setViewport(root);
      });
      ro.observe(root);
    } else {
      window.addEventListener('resize', function () {
        setViewport(root);
      });
    }

    var slides = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-slide]'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('[data-ff-hero-dot]'));
    if (slides.length < 2) return;

    var index = Math.max(
      0,
      slides.findIndex(function (slide) {
        return slide.classList.contains('is-active');
      })
    );
    var timer = null;
    var delay = 6000;

    function show(next) {
      index = (next + slides.length) % slides.length;
      slides.forEach(function (slide, i) {
        var active = i === index;
        slide.classList.toggle('is-active', active);
        slide.hidden = !active;
      });
      dots.forEach(function (dot, i) {
        dot.classList.toggle('is-active', i === index);
      });
      setViewport(root);
    }

    function start() {
      stop();
      timer = window.setInterval(function () {
        show(index + 1);
      }, delay);
    }

    function stop() {
      if (timer) window.clearInterval(timer);
      timer = null;
    }

    var prev = root.querySelector('[data-ff-hero-prev]');
    var next = root.querySelector('[data-ff-hero-next]');
    if (prev) {
      prev.addEventListener('click', function () {
        show(index - 1);
        start();
      });
    }
    if (next) {
      next.addEventListener('click', function () {
        show(index + 1);
        start();
      });
    }
    dots.forEach(function (dot) {
      dot.addEventListener('click', function () {
        show(Number(dot.getAttribute('data-ff-hero-dot')) || 0);
        start();
      });
    });

    root.addEventListener('mouseenter', stop);
    root.addEventListener('mouseleave', start);
    document.addEventListener('shopify:section:reorder', function () {
      setViewport(root);
    });
    start();
  }

  document.querySelectorAll('[data-ff-hero]').forEach(init);
  document.addEventListener('shopify:section:load', function (event) {
    var root = event.target.querySelector('[data-ff-hero]');
    if (root) {
      delete root.dataset.ffReady;
      init(root);
    }
  });
})();


/* FF_OFFER_EMBED_V2 */
(function(){
  if (window.__ffOfferEmbedLoaded) return;
  window.__ffOfferEmbedLoaded = true;
  function hideForms(){
    ['#shopify-block-forms','[id*="shopify-forms"]','[id*="13768625480086291342"]','[class*="shopify-forms"]','iframe[src*="forms.shopify"]','iframe[src*="shopify-forms"]','div[data-forms-id]','shopify-forms'].forEach(function(sel){
      document.querySelectorAll(sel).forEach(function(el){
        el.style.setProperty('display','none','important');
        el.style.setProperty('visibility','hidden','important');
        el.style.setProperty('pointer-events','none','important');
      });
    });
  }
  hideForms();
  setInterval(hideForms, 1000);
  if (document.querySelector('[data-ff-offer]')) return;
  var css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = "https://fortuneforgedwheels.com/cdn/shop/t/13/assets/ff-offer-popup.css";
  document.head.appendChild(css);
  var root = document.createElement('div');
  root.innerHTML = '<div class="ff-offer" id="ff-offer-popup" data-ff-offer data-ff-offer-delay="5000" data-ff-offer-expire="14" hidden aria-hidden="true"><div class="ff-offer__backdrop" data-ff-offer-close tabindex="-1"></div><div class="ff-offer__dialog" role="dialog" aria-modal="true" aria-labelledby="ff-offer-title"><button type="button" class="ff-offer__close" data-ff-offer-close aria-label="Close offer"><span aria-hidden="true">&times;</span></button><div class="ff-offer__media" aria-hidden="true"><img class="ff-offer__fallback-img" src="https://fortuneforgedwheels.com/cdn/shop/files/BMW_F80_25MP_HighQuality.jpg?v=1785232100&width=1200" alt="" loading="lazy" width="800" height="1000"></div><div class="ff-offer__panel"><h2 class="ff-offer__title" id="ff-offer-title">Get $100 Off Your Entire Order</h2><p class="ff-offer__sub">Limited time offer for first-time customers. Premium mods, fast support and zero regrets. Built for real enthusiasts.</p><form method="post" action="/contact#contact_form" id="ff-offer-contact" accept-charset="UTF-8" class="ff-offer__form"><input type="hidden" name="form_type" value="customer" /><input type="hidden" name="utf8" value="✓" /><input type="hidden" name="contact[tags]" value="newsletter, first-time-100-off"><input class="ff-offer__input" type="text" name="contact[first_name]" placeholder="First name" autocomplete="given-name"><input class="ff-offer__input" type="email" name="contact[email]" placeholder="Email" autocomplete="email" required><button type="submit" class="ff-offer__submit">Claim Offer</button></form><p class="ff-offer__disclaimer">By signing up, you agree to receive marketing emails. View our privacy policy and terms of service for more info.</p><p class="ff-offer__success" data-ff-offer-success hidden>You\'re in - check your email for your $100 off code.</p></div></div></div>';
  document.body.appendChild(root);
  var s = document.createElement('script');
  s.src = "https://fortuneforgedwheels.com/cdn/shop/t/13/assets/ff-offer-popup.js";
  s.defer = true;
  document.body.appendChild(s);
})();
