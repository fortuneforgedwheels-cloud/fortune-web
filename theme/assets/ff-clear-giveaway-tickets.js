/**
 * Clears leftover giveaway ticket cart notes / attributes from older ATC flows
 * so they do not show under Additional Comments at checkout.
 */
(function () {
  'use strict';

  var NOTE_MARKERS = [
    'GIVEAWAY ENTRY TICKETS',
    'giveaway entry tickets',
    'IDs = your order number',
    'Your entry tickets',
    'Invasion bonus tickets',
    'Invasion Bonus Entries'
  ];

  var ATTR_KEYS = [
    'Giveaway ticket count',
    'Giveaway ticket IDs',
    'Invasion Bonus Entries',
    'Your entry tickets',
    'Drawing note'
  ];

  function noteLooksLikeTickets(note) {
    if (!note || typeof note !== 'string') return false;
    for (var i = 0; i < NOTE_MARKERS.length; i++) {
      if (note.indexOf(NOTE_MARKERS[i]) !== -1) return true;
    }
    return false;
  }

  function clearTicketResidue(cart) {
    if (!cart) return null;
    var payload = {};
    var changed = false;

    if (noteLooksLikeTickets(cart.note)) {
      payload.note = '';
      changed = true;
    }

    var attrs = cart.attributes || {};
    var nextAttrs = null;
    for (var i = 0; i < ATTR_KEYS.length; i++) {
      var key = ATTR_KEYS[i];
      if (attrs[key] != null && String(attrs[key]).length) {
        if (!nextAttrs) nextAttrs = {};
        nextAttrs[key] = '';
        changed = true;
      }
    }
    if (nextAttrs) payload.attributes = nextAttrs;
    if (!changed) return null;

    return fetch('/cart/update.js', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(function (updated) {
        if (!updated) return;
        var ta = document.getElementById('Cart-note');
        if (ta && noteLooksLikeTickets(ta.value)) {
          ta.value = updated.note || '';
        }
      })
      .catch(function () {});
  }

  function boot() {
    fetch('/cart.js', {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' }
    })
      .then(function (res) {
        return res.ok ? res.json() : null;
      })
      .then(clearTicketResidue)
      .catch(function () {});
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
