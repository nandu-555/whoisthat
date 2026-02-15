/**
 * IP Geolocation Utility
 * Uses ipapi.co free tier (1000 requests/day).
 * Gracefully handles API failures.
 */

const https = require('https');

const GEO_API_BASE = 'https://ipapi.co';

/**
 * Fetch geolocation data for an IP address
 * ipapi.co: free, no API key needed, 1000 req/day
 * @param {string} ip - IP address (not hashed)
 * @returns {Promise<{country: string, region: string, city: string}>}
 */
async function getGeoFromIP(ip) {
  if (!ip || ip === '127.0.0.1' || ip === '::1') {
    return { country: 'Local', region: '', city: '' };
  }

  return new Promise((resolve) => {
    const url = `${GEO_API_BASE}/${ip}/json/`;
    const req = https.get(url, { timeout: 5000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.error) {
            resolve({ country: 'Unknown', region: '', city: '' });
          } else {
            resolve({
              country: json.country_name || 'Unknown',
              region: json.region || '',
              city: json.city || '',
            });
          }
        } catch {
          resolve({ country: 'Unknown', region: '', city: '' });
        }
      });
    });

    req.on('error', () => {
      resolve({ country: 'Unknown', region: '', city: '' });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({ country: 'Unknown', region: '', city: '' });
    });
  });
}

module.exports = { getGeoFromIP };
