/**
 * Allowed Sites Configuration
 * Only requests with siteId and origin matching these entries are accepted.
 * Add new websites here when onboarding a new site.
 */

const allowedSites = [
  {
    siteId: 'main',
    siteName: 'WhoIsThat Demo',
    domains: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'https://whoisthat.onrender.com',
      'https://github.com/nandu-555/VD-surprise',
      'https://whoisthat-35n9.onrender.com/', // Replace with your Render frontend URL if different
    ],
  },
  // Example: add more sites like this:
  // {
  //   siteId: 'portfolio',
  //   siteName: 'Portfolio Website',
  //   domains: ['https://myportfolio.com', 'https://www.myportfolio.com'],
  // },
  // {
  //   siteId: 'blog',
  //   siteName: 'Tech Blog',
  //   domains: ['https://myblog.com'],
  // },
];

/**
 * Get allowed site config by siteId
 * @param {string} siteId
 * @returns {object|null} { siteId, siteName, domains } or null
 */
function getAllowedSite(siteId) {
  if (!siteId || typeof siteId !== 'string') return null;
  const id = siteId.trim().toLowerCase();
  return allowedSites.find((s) => s.siteId.toLowerCase() === id) || null;
}

/**
 * Check if origin is allowed for the given siteId
 * @param {string} siteId
 * @param {string} origin - req.headers.origin (e.g. https://myportfolio.com)
 * @returns {boolean}
 */
function isOriginAllowed(siteId, origin) {
  const site = getAllowedSite(siteId);
  if (!site || !origin || typeof origin !== 'string') return false;
  const normalizedOrigin = origin.trim().toLowerCase().replace(/\/$/, '');
  return site.domains.some(
    (d) => d.trim().toLowerCase().replace(/\/$/, '') === normalizedOrigin
  );
}

/**
 * Check if siteId is in the allowed list (for validation before origin check)
 * @param {string} siteId
 * @returns {boolean}
 */
function isSiteIdAllowed(siteId) {
  return getAllowedSite(siteId) !== null;
}

/**
 * Get all allowed origins (for CORS). Normalized to lowercase, no trailing slash.
 * @returns {Set<string>}
 */
function getAllowedOrigins() {
  const set = new Set();
  allowedSites.forEach((s) => {
    (s.domains || []).forEach((d) => {
      const n = d.trim().toLowerCase().replace(/\/$/, '');
      if (n) set.add(n);
    });
  });
  return set;
}

module.exports = {
  allowedSites,
  getAllowedSite,
  isOriginAllowed,
  isSiteIdAllowed,
  getAllowedOrigins,
};
