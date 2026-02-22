/**
 * Telegram Bot Integration
 * Sends multi-site visitor alerts to a Telegram chat.
 * Uses environment variables for bot token and chat ID.
 */

const https = require('https');

/**
 * Send a message to Telegram
 * @param {string} message - Plain text or HTML message
 * @returns {Promise<boolean>} Success
 */
async function sendTelegramMessage(message) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId) {
    console.warn('[Telegram] Skipped: TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID not set');
    return false;
  }

  const body = JSON.stringify({
    chat_id: chatId,
    text: message,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.ok === true);
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.write(body);
    req.end();
  });
}

/**
 * Format location line for alerts
 */
function formatLocation(visitor) {
  const parts = [visitor.city, visitor.region, visitor.country].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown';
}

/**
 * Get page path for display (e.g. /projects from full URL)
 */
function getPagePath(pageUrl) {
  if (!pageUrl) return '-';
  try {
    return new URL(pageUrl).pathname || pageUrl;
  } catch {
    return pageUrl;
  }
}

/**
 * WhoIsThat alert header and site block (multi-site format)
 * Example: Site, Site ID, Domain, Page, Location, Device, Browser, Visit Count
 */
function formatSiteBlock(visitor) {
  return [
    '🌐 <b>WhoIsThat Alert</b>',
    '',
    `🏷 <b>Site:</b> ${visitor.siteName || 'Unknown'}`,
    `🔑 <b>Site ID:</b> ${visitor.siteId || '-'}`,
    `🌍 <b>Domain:</b> ${visitor.domain || '-'}`,
    `📄 <b>Page:</b> ${getPagePath(visitor.pageUrl)}`,
    `📍 <b>Location:</b> ${formatLocation(visitor)}`,
    `📱 <b>Device:</b> ${visitor.deviceType || 'Unknown'}`,
    `🌐 <b>Browser:</b> ${visitor.browser || 'Unknown'}`,
    `🔁 <b>Visit Count:</b> ${visitor.visitCount ?? 1}`,
    '',
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,
  ].join('\n');
}

/**
 * Format and send a new visitor alert (multi-site)
 */
async function sendNewVisitorAlert(visitor) {
  const message = [
    `📊 <b>Visit #${visitCount}</b>`,
    '🆕 <b>New Visitor</b>',
    '',
    ...formatSiteBlock(visitor).split('\n').slice(2),
  ].join('\n');
  return sendTelegramMessage(message);
}

/**
 * Format and send a returning visitor alert (multi-site)
 */
async function sendReturningVisitorAlert(visitor, visitCount) {
  const v = { ...visitor, visitCount };
  const message = [
    '🔄 <b>Returning Visitor</b>',
    '',
    ...formatSiteBlock(v).split('\n').slice(2),
  ].join('\n');
  return sendTelegramMessage(message);
}

module.exports = {
  sendTelegramMessage,
  sendNewVisitorAlert,
  sendReturningVisitorAlert,
};
