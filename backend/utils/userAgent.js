/**
 * User-Agent Parser Utility
 * Extracts device type, OS, and browser from User-Agent string.
 * Privacy-safe: no fingerprinting, only standard UA parsing.
 */

const UAParser = require('ua-parser-js');

/**
 * Parse User-Agent and return device type, OS, browser
 * @param {string} userAgent - Raw User-Agent string
 * @returns {object} { deviceType, os, browser }
 */
function parseUserAgent(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') {
    return { deviceType: 'unknown', os: 'unknown', browser: 'unknown' };
  }

  const parser = new UAParser(userAgent);
  const device = parser.getDevice();
  const os = parser.getOS();
  const browser = parser.getBrowser();

  // Device type: mobile, tablet, or desktop
  let deviceType = 'desktop';
  if (device.type === 'mobile' && !device.vendor) {
    deviceType = 'mobile';
  } else if (device.type === 'tablet' || device.vendor === 'iPad' || device.vendor === 'Kindle') {
    deviceType = 'tablet';
  } else if (device.type === 'mobile') {
    deviceType = 'mobile';
  }

  return {
    deviceType,
    os: os.name && os.version ? `${os.name} ${os.version}` : (os.name || 'unknown'),
    browser: browser.name && browser.version ? `${browser.name} ${browser.version}` : (browser.name || 'unknown'),
  };
}

module.exports = { parseUserAgent };
