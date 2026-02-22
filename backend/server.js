/**
 * WhoIsThat Backend Server (Multi-Site)
 * Express API for anonymous visitor tracking with Telegram alerts.
 * Serves tracker.js and accepts /track-visit from whitelisted origins only.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { trackVisitHandler } = require('./routes/track');
const { getDatabase, closeDatabase } = require('./db/database');
const { getAllowedOrigins } = require('./config/allowedSites');

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
// Trust proxy for correct client IP (e.g. behind Nginx)

const app = express();
// Body parser

app.set('trust proxy', 1);

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const allowedOriginsSet = getAllowedOrigins();

app.use((req, res, next) => {
  const origin = (req.headers.origin || '').trim();
  const isTrackVisit = req.path === '/track-visit';
  let allowOrigin = CORS_ORIGIN;
  if (isTrackVisit && origin) {
    const normalized = origin.toLowerCase().replace(/\/$/, '');
    if (allowedOriginsSet.has(normalized)) {
      allowOrigin = origin;
    }
  }
  res.setHeader('Access-Control-Allow-Origin', allowOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
// Routes
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
// Health check
  next();
});

app.post('/track-visit', trackVisitHandler);

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'whoisthat-backend' });
});

// 404
// Serve tracker.js (and other public assets) from backend/public
app.use(express.static(path.join(__dirname, 'public')));
// Error handler

// Serve frontend (demo site)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// Initialize DB and start
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

getDatabase();
// Graceful shutdown

app.listen(PORT, () => {
  console.log(`[WhoIsThat] Server running on http://localhost:${PORT}`);
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('[WhoIsThat] Telegram alerts enabled');
  } else {
    console.log('[WhoIsThat] Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
  }
});

process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
