/**
 * Telegram Bot Integration
 * Sends visitor alerts to a Telegram chat.
 * Uses environment variables for bot token and chat ID.
 */

const https = require('https');

/**
 * Send a message to Telegram
 * @param {string} message - Plain text or Markdown message
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
 * Format and send a new visitor alert
 */
async function sendNewVisitorAlert(visitor) {
  const lines = [
    '🆕 <b>New Visitor</b>',
    '',
    `📍 <b>Location:</b> ${[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || 'Unknown'}`,
    `📱 <b>Device:</b> ${visitor.deviceType} | ${visitor.os}`,
    `🌐 <b>Browser:</b> ${visitor.browser}`,
    `📐 <b>Screen:</b> ${visitor.screenWidth || '?'}×${visitor.screenHeight || '?'}`,
    `🔗 <b>Page:</b> ${visitor.pageUrl || '-'}`,
    `↩️ <b>Referrer:</b> ${visitor.referrer || 'Direct'}`,
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,
  ];
  return sendTelegramMessage(lines.join('\n'));
}

/**
 * Format and send a returning visitor alert
 */
async function sendReturningVisitorAlert(visitor, visitCount) {
  const lines = [
    '🔄 <b>Returning Visitor</b>',
    `📊 <b>Visit #${visitCount}</b>`,
    '',
    `📍 <b>Location:</b> ${[visitor.city, visitor.region, visitor.country].filter(Boolean).join(', ') || 'Unknown'}`,
    `📱 <b>Device:</b> ${visitor.deviceType} | ${visitor.os}`,
    `🌐 <b>Browser:</b> ${visitor.browser}`,
    `🔗 <b>Page:</b> ${visitor.pageUrl || '-'}`,
    `↩️ <b>Referrer:</b> ${visitor.referrer || 'Direct'}`,
    `⏰ <b>Time:</b> ${new Date().toLocaleString()}`,
  ];
  return sendTelegramMessage(lines.join('\n'));
}

module.exports = {
  sendTelegramMessage,
  sendNewVisitorAlert,
  sendReturningVisitorAlert,
};
