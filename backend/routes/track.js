/**
 * Track Visit Route
 * POST /track-visit
 * Validates input, rate limits, stores in SQLite, sends Telegram alert.
 */

const crypto = require('crypto');
const { upsertVisitor } = require('../db/database');
const { getGeoFromIP } = require('../utils/geo');
const { sendNewVisitorAlert, sendReturningVisitorAlert } = require('../utils/telegram');
const { parseUserAgent } = require('../utils/userAgent');

// In-memory rate limit: IP -> { count, resetAt }
const rateLimitMap = new Map();

const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '30', 10);

/**
 * Hash IP for privacy-safe storage (irreversible)
 */
function hashIP(ip) {
  if (!ip) return '';
  return crypto.createHash('sha256').update(ip.trim()).digest('hex');
}

/**
 * Simple in-memory rate limiter
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
 * Validate and sanitize input
 */
function validateInput(body) {
  const pageUrl = typeof body.pageUrl === 'string' ? body.pageUrl.trim().slice(0, 2000) : '';
  const referrer = typeof body.referrer === 'string' ? body.referrer.trim().slice(0, 2000) : '';
  const screenWidth = typeof body.screenWidth === 'number' ? Math.min(Math.max(0, body.screenWidth), 99999) : null;
  const screenHeight = typeof body.screenHeight === 'number' ? Math.min(Math.max(0, body.screenHeight), 99999) : null;

  return { pageUrl, referrer, screenWidth, screenHeight };
}

async function trackVisitHandler(req, res) {
  try {
    const ip = req.ip || req.connection?.remoteAddress || '';
    const userAgent = req.headers['user-agent'] || '';

    // Rate limit
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ ok: false, error: 'Too many requests' });
    }

    const { pageUrl, referrer, screenWidth, screenHeight } = validateInput(req.body || {});

    // Parse UA
    const { deviceType, os, browser } = parseUserAgent(userAgent);

    // Geolocation (non-blocking, don't fail on error)
    let geo = { country: 'Unknown', region: '', city: '' };
    try {
      geo = await getGeoFromIP(ip);
    } catch (err) {
      // Keep default geo
    }

    const visitorHash = hashIP(ip);

    const visitor = {
      visitorHash,
      deviceType,
      os,
      browser,
      screenWidth,
      screenHeight,
      pageUrl: pageUrl || req.headers['referer'] || '',
      referrer,
      country: geo.country,
      region: geo.region,
      city: geo.city,
    };

    const result = upsertVisitor(visitor);

    // Send Telegram (fire-and-forget, don't block response)
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
