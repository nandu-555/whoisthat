/**
 * WhoIsThat - Lightweight Multi-Site Visitor Tracker
 * Vanilla JS, no frameworks. Async, non-blocking. No UI indicators.
 * Include on any page; calls POST /track-visit with siteId, siteName, domain, page, referrer.
 *
 * Usage on your website:
 *   <script src="https://whoisthat.onrender.com/tracker.js"></script>
 *   <script>
 *     initTracker({ siteId: "blog", siteName: "Tech Blog" });
 *   </script>
 * Optional: initTracker({ siteId: "blog", siteName: "Tech Blog", endpoint: "https://whoisthat.onrender.com" });
 */

(function (global) {
  'use strict';

  var SITE_ID = '';
  var SITE_NAME = '';
  var ENDPOINT = '';

  /**
   * Initialize tracker. Call once after loading the script.
   * @param {object} opts - { siteId: string, siteName: string, endpoint?: string }
   */
  function initTracker(opts) {
    if (!opts || typeof opts.siteId !== 'string' || !opts.siteId.trim()) {
      console.warn('[WhoIsThat] siteId is required');
      return;
    }
    SITE_ID = opts.siteId.trim();
    SITE_NAME = typeof opts.siteName === 'string' && opts.siteName.trim() ? opts.siteName.trim() : SITE_ID;
    if (opts.endpoint && typeof opts.endpoint === 'string') {
      ENDPOINT = opts.endpoint.replace(/\/$/, '');
    } else {
      var script = document.currentScript;
      if (script && script.src) {
        try {
          var u = new URL(script.src);
          ENDPOINT = u.origin;
        } catch (e) {
          ENDPOINT = '';
        }
      }
    }
    if (!ENDPOINT) {
      console.warn('[WhoIsThat] Could not determine endpoint; set endpoint in initTracker()');
      return;
    }
    track();
  }

  /**
   * Build payload: siteId, siteName, domain (origin), page (pathname), fullUrl, referrer, screen
   */
  function getPayload() {
    var origin = typeof window.location.origin !== 'undefined' ? window.location.origin : '';
    var pathname = window.location.pathname || '/';
    var fullUrl = window.location.href || '';
    return {
      siteId: SITE_ID,
      siteName: SITE_NAME,
      domain: origin,
      page: pathname,
      fullUrl: fullUrl,
      referrer: document.referrer || '',
      screenWidth: window.screen ? window.screen.width : null,
      screenHeight: window.screen ? window.screen.height : null,
    };
  }

  /**
   * Send beacon to backend (async, fire-and-forget). Fails silently on network error.
   */
  function track() {
    var payload = getPayload();
    var url = ENDPOINT + '/track-visit';

    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
      return;
    }

    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(function () {});
  }

  global.initTracker = initTracker;
})(typeof window !== 'undefined' ? window : this);
