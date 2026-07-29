(function () {
  if (window.__ffOfferBootV3) return;
  var probe = document.querySelector("script[src*='/cdn/shop/t/'][src*='/assets/']");
  var src = "/cdn/shop/t/13/assets/ff-offer-boot.js?v=sbv1";
  if (probe) {
    src = probe.getAttribute("src").replace(/\/assets\/[^?]+.*/, "/assets/ff-offer-boot.js?v=sbv1");
  }
  var s = document.createElement("script");
  s.src = src;
  s.defer = true;
  document.head.appendChild(s);
})();
