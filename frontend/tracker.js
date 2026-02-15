/**
 * WhoIsThat - Lightweight Anonymous Visitor Tracker
 * Vanilla JS, no frameworks. Async, non-blocking. No UI indicators.
 * Include on any page; calls POST /track-visit with anonymized data.
 */

(function (global) {
  'use strict';

  const WhoIsThat = {
    endpoint: '/track-visit',
    initialized: false,

    /**
     * Initialize tracker with options
     * @param {object} opts - { endpoint: string }
     */
    init: function (opts) {
      if (this.initialized) return;
      this.initialized = true;
      if (opts && opts.endpoint) {
        this.endpoint = opts.endpoint;
      }
      this.track();
    },

    /**
     * Build tracking payload (no fingerprinting, only standard browser APIs)
     */
    getPayload: function () {
      return {
        pageUrl: window.location.href,
        referrer: document.referrer || '',
        screenWidth: window.screen ? window.screen.width : null,
        screenHeight: window.screen ? window.screen.height : null,
      };
    },

    /**
     * Send beacon to backend (async, fire-and-forget)
     */
    track: function () {
      const payload = this.getPayload();
      const url = this.endpoint.startsWith('http')
        ? this.endpoint
        : (window.location.origin + this.endpoint);

      // Use sendBeacon if available (better for page unload), else fetch
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        navigator.sendBeacon(url, blob);
        return;
      }

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(function () {
        // Silently fail if backend unreachable
      });
    },
  };

  global.WhoIsThat = WhoIsThat;
})(typeof window !== 'undefined' ? window : this);
