/**
 * Track Visit Route (Multi-Site)
 * POST /track-visit
 * Validates siteId/origin, rate limits, stores in SQLite, sends Telegram alert.
 */

const crypto = require('crypto');
const { upsertVisitor } = require('../db/database');
const { getGeoFromIP } = require('../utils/geo');
const { sendNewVisitorAlert, sendReturningVisitorAlert } = require('../utils/telegram');
const { parseUserAgent } = require('../utils/userAgent');
const { getAllowedSite, isOriginAllowed, isSiteIdAllowed } = require('../config/allowedSites');
// In-memory rate limit: IP -> { count, resetAt }

const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10);
const MAX_BODY_LENGTH = 20 * 1024; // 20kb (express.json limit is separate; this is extra safety)

/**
 * Hash IP for privacy-safe storage (irreversible)
 */
function hashIP(ip) {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip.trim()).digest('hex');
}

/**
 * Simple in-memory rate limiter per IP
 */
function checkRateLimit(ip) {
  const now = Date.now();
  let entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  entry.count++;
  if (entry.count > RATE_LIMIT_MAX) {
    return false;
  }
  return true;
}

/**
 * Validate and sanitize body: siteId, siteName, domain, page, fullUrl, referrer
 * Returns null if invalid (caller should respond 400/403).
 */
function validateInput(body) {
  if (!body || typeof body !== 'object') return null;

  const siteId = typeof body.siteId === 'string' ? body.siteId.trim().slice(0, 64) : '';
  const siteName = typeof body.siteName === 'string' ? body.siteName.trim().slice(0, 200) : '';
  const domain = typeof body.domain === 'string' ? body.domain.trim().slice(0, 500) : '';
  const fullUrl = typeof body.fullUrl === 'string' ? body.fullUrl.trim().slice(0, 2000) : '';
  const page = typeof body.page === 'string' ? body.page.trim().slice(0, 2000) : '';
  const referrer = typeof body.referrer === 'string' ? body.referrer.trim().slice(0, 2000) : '';
  const screenWidth = typeof body.screenWidth === 'number' ? Math.min(Math.max(0, body.screenWidth), 99999) : null;
  const screenHeight = typeof body.screenHeight === 'number' ? Math.min(Math.max(0, body.screenHeight), 99999) : null;

  if (!siteId) return null;

  const pageUrl = fullUrl || (domain && page ? domain.replace(/\/$/, '') + (page.startsWith('/') ? page : '/' + page) : '');

  return {
    siteId: siteId.toLowerCase(),
    siteName: siteName || siteId,
    domain,
    pageUrl: pageUrl || fullUrl,
    referrer,
    screenWidth,
    screenHeight,
  };
}

async function trackVisitHandler(req, res) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';
    const origin = req.headers.origin || req.headers.referer ? (req.headers.referer || '').replace(/\/[^/]*$/, '') : '';

    // Body size guard (express.json already limits; this is for content-length abuse)
    const contentLength = parseInt(req.headers['content-length'], 10);
    if (!isNaN(contentLength) && contentLength > MAX_BODY_LENGTH) {
      return res.status(413).json({ ok: false, error: 'Payload too large' });
    }

    const parsed = validateInput(req.body || {});
    if (!parsed) {
      return res.status(400).json({ ok: false, error: 'Missing or invalid siteId' });
    }

    // Reject unknown siteId (prevent fake siteId abuse)
    if (!isSiteIdAllowed(parsed.siteId)) {
      return res.status(403).json({ ok: false, error: 'Site not allowed' });
    }

    // Domain / origin validation: origin must match an allowed domain for this siteId
    if (!isOriginAllowed(parsed.siteId, origin)) {
      return res.status(403).json({ ok: false, error: 'Origin not allowed for this site' });
    }

    // Optional: enforce that body.domain matches allowed domains for this siteId
    const allowed = getAllowedSite(parsed.siteId);
    const domainAllowed = allowed && allowed.domains.some(
      (d) => d.trim().toLowerCase().replace(/\/$/, '') === parsed.domain.trim().toLowerCase().replace(/\/$/, '')
    );
    if (!domainAllowed && parsed.domain) {
      return res.status(403).json({ ok: false, error: 'Domain not allowed for this site' });
    }

    const { pageUrl, referrer, screenWidth, screenHeight } = validateInput(req.body || {});

    // Parse UA
    // Geolocation (non-blocking, don't fail on error)
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }

    const { deviceType, os, browser } = parseUserAgent(userAgent);

    let geo = { country: 'Unknown', region: '', city: '' };
    try {
      geo = await getGeoFromIP(ip);
    } catch (err) {
      // keep default
    }

    const visitorHash = hashIP(ip);

    const visitor = {
      visitorHash,
      siteId: parsed.siteId,
      siteName: parsed.siteName,
      domain: parsed.domain,
      deviceType,
      os,
      browser,
      screenWidth: parsed.screenWidth,
      screenHeight: parsed.screenHeight,
      pageUrl: parsed.pageUrl,
      referrer: parsed.referrer,
      country: geo.country,
      region: geo.region,
    // Send Telegram (fire-and-forget, don't block response)
      city: geo.city,
    };

    const result = upsertVisitor(visitor);
    visitor.visitCount = result.visitCount;

    (async () => {
      try {
        if (result.isNew) {
          await sendNewVisitorAlert(visitor);
        } else {
          await sendReturningVisitorAlert(visitor, result.visitCount);
        }
      } catch (e) {
        console.error('[Telegram] Error:', e.message);
      }
    })();

    return res.status(200).json({ ok: true, visitCount: result.visitCount });
  } catch (err) {
    console.error('[Track] Error:', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

module.exports = { trackVisitHandler };
