/**
 * Fortune Forged Build Quote → QuoteSubmitted (Meta custom event)
 *
 * Stages a per-submission eventId only when a valid quote POST is proceeding.
 * Fires fbq('track', 'QuoteSubmitted', ...) ONLY after Shopify renders [data-ff-quote-success]
 * and only marks fired once browser Meta fbq succeeds (Shopify.analytics.publish is best-effort).
 *
 * Does NOT touch QuoteStarted / gate unlock.
 * Does NOT init Meta Pixel (uses existing window.fbq).
 * Does NOT fire Lead.
 * Does NOT require purchase timeline or other optional fields.
 */
(function () {
  if (window.__ffQuoteSubmittedBoot) return;
  window.__ffQuoteSubmittedBoot = true;

  var PENDING_KEY = 'ff_quote_submitted_pending_v2';
  var FIRED_KEY = 'ff_quote_submitted_fired_v2';
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
    if ((form.id || '').indexOf('FFQuoteForm-') !== 0) return false;
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

  function getServerConfirmedQuoteForm() {
    var nodes = document.querySelectorAll('[data-ff-quote-success]');
    for (var i = 0; i < nodes.length; i++) {
      var form = formNearSuccess(nodes[i]);
      if (form) return form;
    }
    return null;
  }

  function newEventId() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return 'ffq_' + window.crypto.randomUUID();
      }
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(8);
        window.crypto.getRandomValues(buf);
        var rand = '';
        for (var i = 0; i < buf.length; i++) {
          rand += buf[i].toString(16).padStart(2, '0');
        }
        return 'ffq_' + Date.now().toString(36) + '_' + rand;
      }
    } catch (e) {}
    return 'ffq_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 12);
  }

  function stagePending(form) {
    writeJson(PENDING_KEY, {
      eventId: newEventId(),
      at: Date.now(),
      formId: form.id || ''
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
    if (window.__ffQuoteSubmittedFiredId === eventId) return true;
    var fired = readJson(FIRED_KEY);
    return !!(fired && fired.eventId === eventId);
  }

  function markFired(eventId) {
    window.__ffQuoteSubmittedFiredId = eventId;
    writeJson(FIRED_KEY, { eventId: eventId, at: Date.now() });
    safeRemove(PENDING_KEY);
  }

  function buildPayload() {
    return {
      content_name: 'Quote Request',
      form_name: FORM_NAME
    };
  }

  function publishShopify(eventId, payload) {
    try {
      if (
        !window.Shopify ||
        !window.Shopify.analytics ||
        typeof window.Shopify.analytics.publish !== 'function'
      ) {
        return false;
      }
      window.Shopify.analytics.publish('QuoteSubmitted', {
        content_name: payload.content_name,
        form_name: payload.form_name,
        event_id: eventId
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  function fireFbq(eventId, payload) {
    if (typeof window.fbq !== 'function') return false;
    // Mirror QuoteStarted: track() + custom event name (not trackCustom).
    window.fbq('track', 'QuoteSubmitted', payload, { eventID: eventId });
    return true;
  }

  function tryFireFromServerSuccess() {
    var confirmedForm = getServerConfirmedQuoteForm();
    if (!confirmedForm) return;

    var pending = getValidPending();
    if (!pending) return;

    if (!pending.formId || pending.formId !== confirmedForm.id) {
      safeRemove(PENDING_KEY);
      return;
    }

    var eventId = pending.eventId;
    if (wasFired(eventId)) {
      safeRemove(PENDING_KEY);
      return;
    }

    var attempts = 0;
    var publishedOnce = false;
    function attempt() {
      attempts += 1;
      try {
        if (wasFired(eventId)) {
          safeRemove(PENDING_KEY);
          return;
        }
        // Success node remains mandatory; only fbq may be late.
        if (!getServerConfirmedQuoteForm()) return;

        var payload = buildPayload();
        if (!publishedOnce) {
          try {
            publishedOnce = !!publishShopify(eventId, payload);
          } catch (e) {
            publishedOnce = false;
          }
        }

        var tracked = false;
        try {
          tracked = fireFbq(eventId, payload);
        } catch (e) {
          tracked = false;
        }

        // Only consume pending after browser Meta fbq succeeds.
        if (tracked) {
          markFired(eventId);
          return;
        }
      } catch (e) {
        // Keep pending; retry while fbq may still be loading.
      }
      if (attempts < FBQ_RETRY_MAX) {
        window.setTimeout(attempt, FBQ_RETRY_MS);
      }
    }
    attempt();
  }

  /**
   * Bubble-phase submit listener registered AFTER ff-simple-build.js (script order).
   * That handler may call preventDefault() for Custom Design URL / missing vehicle.
   * We only stage when defaultPrevented is false so validation failures never leave a token.
   */
  function onQuoteSubmit(event) {
    try {
      if (event.defaultPrevented) return;
      var form = event.target;
      if (!isQuoteForm(form)) return;
      try {
        if (typeof form.checkValidity === 'function' && !form.checkValidity()) return;
      } catch (e) {}
      stagePending(form);
    } catch (e) {}
  }

  function bindSubmitListeners() {
    document.querySelectorAll('form.ff-quote[id^="FFQuoteForm-"]').forEach(function (form) {
      if (form.dataset.ffQuoteSubmittedBound === '1') return;
      form.dataset.ffQuoteSubmittedBound = '1';
      form.addEventListener('submit', onQuoteSubmit, false);
    });
  }

  function boot() {
    bindSubmitListeners();
    tryFireFromServerSuccess();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('shopify:section:load', function () {
    bindSubmitListeners();
    tryFireFromServerSuccess();
  });
})();
