/**
 * Fortune Forged Build Quote → Meta Lead + QuoteSubmitted
 *
 * Fires ONLY after Shopify server-confirmed success:
 *   form.posted_successfully? → [data-ff-quote-success]
 *
 * Uses existing window.fbq from Shopify Facebook/Instagram (Web Pixels).
 * Does NOT init/reinstall the Pixel. Does NOT send value/revenue.
 */
(function () {
  if (window.__ffQuoteMetaBoot) return;
  window.__ffQuoteMetaBoot = true;

  var PENDING_KEY = 'ff_quote_meta_pending_v1';
  var FIRED_KEY = 'ff_quote_meta_fired_v1';
  var STALE_MS = 10 * 60 * 1000;
  var FBQ_RETRY_MS = 250;
  var FBQ_RETRY_MAX = 40;
  var FORM_NAME = 'Fortune Forged Build Quote';

  function safeGet(key) {
    try {
      return sessionStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function safeSet(key, value) {
    try {
      sessionStorage.setItem(key, value);
      return true;
    } catch (e) {
      return false;
    }
  }

  function safeRemove(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {}
  }

  function readJson(key) {
    try {
      var raw = safeGet(key);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function writeJson(key, value) {
    try {
      return safeSet(key, JSON.stringify(value));
    } catch (e) {
      return false;
    }
  }

  function isQuoteForm(form) {
    if (!form || form.tagName !== 'FORM') return false;
    if ((form.id || '').indexOf('FFQuoteForm-') === 0) return true;
    var nameInput = form.querySelector('input[name="contact[form_name]"]');
    return !!(nameInput && nameInput.value === FORM_NAME);
  }

  function formNearSuccess(successEl) {
    if (!successEl) return null;
    var form = successEl.closest('form');
    if (isQuoteForm(form)) return form;
    var root = successEl.closest('[data-ff-build]') || document;
    var candidate =
      root.querySelector('form.ff-quote[id^="FFQuoteForm-"]') ||
      root.querySelector('form.ff-quote');
    return isQuoteForm(candidate) ? candidate : null;
  }

  function hasServerConfirmedQuoteSuccess() {
    var nodes = document.querySelectorAll('[data-ff-quote-success]');
    for (var i = 0; i < nodes.length; i++) {
      if (formNearSuccess(nodes[i])) return true;
    }
    return false;
  }

  function newEventId() {
    var rand = '';
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return 'ffq_' + window.crypto.randomUUID();
      }
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(8);
        window.crypto.getRandomValues(buf);
        for (var i = 0; i < buf.length; i++) {
          rand += buf[i].toString(16).padStart(2, '0');
        }
        return 'ffq_' + Date.now().toString(36) + '_' + rand;
      }
    } catch (e) {}
    return 'ffq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
  }

  function canStageFromForm(form) {
    if (!isQuoteForm(form)) return false;
    try {
      if (typeof form.checkValidity === 'function' && !form.checkValidity()) return false;
    } catch (e) {}
    var timeline = form.querySelector('input[name="ff_timeline"]:checked');
    if (!timeline) return false;
    var intent = form.querySelector('[data-intent-check]');
    if (intent && !intent.checked) return false;
    return true;
  }

  function stagePending(form) {
    if (!canStageFromForm(form)) return;
    writeJson(PENDING_KEY, {
      eventId: newEventId(),
      at: Date.now(),
      formId: form.id || '',
    });
  }

  function getValidPending() {
    var pending = readJson(PENDING_KEY);
    if (!pending || !pending.eventId || !pending.at) return null;
    if (Date.now() - Number(pending.at) > STALE_MS) {
      safeRemove(PENDING_KEY);
      return null;
    }
    return pending;
  }

  function wasFired(eventId) {
    if (!eventId) return false;
    if (window.__ffQuoteMetaFiredId === eventId) return true;
    var fired = readJson(FIRED_KEY);
    return !!(fired && fired.eventId === eventId);
  }

  function markFired(eventId) {
    window.__ffQuoteMetaFiredId = eventId;
    writeJson(FIRED_KEY, { eventId: eventId, at: Date.now() });
    safeRemove(PENDING_KEY);
  }

  function fireMetaEvents(eventId) {
    if (typeof window.fbq !== 'function') return false;
    var payload = {
      content_name: 'Quote Request',
      form_name: FORM_NAME,
      lead_type: 'website_quote',
    };
    var options = { eventID: eventId };
    window.fbq('track', 'Lead', payload, options);
    window.fbq('trackCustom', 'QuoteSubmitted', payload, options);
    return true;
  }

  function tryFireFromServerSuccess() {
    if (!hasServerConfirmedQuoteSuccess()) return;

    var pending = getValidPending();
    if (!pending) return;

    if (wasFired(pending.eventId)) {
      safeRemove(PENDING_KEY);
      return;
    }

    var attempts = 0;
    function attempt() {
      attempts += 1;
      try {
        if (typeof window.fbq === 'function') {
          if (wasFired(pending.eventId)) {
            safeRemove(PENDING_KEY);
            return;
          }
          if (fireMetaEvents(pending.eventId)) {
            markFired(pending.eventId);
          }
          return;
        }
      } catch (e) {
        return;
      }
      if (attempts < FBQ_RETRY_MAX) {
        window.setTimeout(attempt, FBQ_RETRY_MS);
      }
    }
    attempt();
  }

  /* Stage event ID only — never fire conversion here */
  document.addEventListener(
    'submit',
    function (event) {
      try {
        var form = event.target;
        if (!form || form.tagName !== 'FORM') return;
        stagePending(form);
      } catch (e) {}
    },
    true
  );

  function boot() {
    try {
      tryFireFromServerSuccess();
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function () {
    try {
      tryFireFromServerSuccess();
    } catch (e) {}
  });
})();
