/**
 * WhoIsThat Backend Server
 * Express API for anonymous visitor tracking with Telegram alerts.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const { trackVisitHandler } = require('./routes/track');
const { getDatabase, closeDatabase } = require('./db/database');

const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

const app = express();

// Trust proxy for correct client IP (e.g. behind Nginx)
app.set('trust proxy', 1);

// Body parser
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// CORS
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Routes
app.post('/track-visit', trackVisitHandler);

// Health check
app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'whoisthat-backend' });
});

// Serve static frontend (optional, for demo)
app.use(express.static(path.join(__dirname, '..', 'frontend')));

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize DB and start
getDatabase();

app.listen(PORT, () => {
  console.log(`[WhoIsThat] Server running on http://localhost:${PORT}`);
  if (process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID) {
    console.log('[WhoIsThat] Telegram alerts enabled');
  } else {
    console.log('[WhoIsThat] Telegram not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env');
  }
});

// Graceful shutdown
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
