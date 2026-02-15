/**
 * SQLite Database Module
 * Auto-creates database and tables on first run.
 * Stores visitor data with privacy-safe hashed IPs.
 */

const Database = require('better-sqlite3');
const path = require('path');

// Database file in backend/db/visitors.db
const DB_PATH = path.join(__dirname, 'visitors.db');

let db = null;

/**
 * Initialize database connection and create tables
 * @returns {object} Database instance
 */
function getDatabase() {
  if (db) return db;

  db = new Database(DB_PATH);

  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_hash TEXT NOT NULL,
      visit_count INTEGER DEFAULT 1,
      device_type TEXT,
      os TEXT,
      browser TEXT,
      screen_width INTEGER,
      screen_height INTEGER,
      page_url TEXT,
      referrer TEXT,
      country TEXT,
      region TEXT,
      city TEXT,
      created_at TEXT NOT NULL,
      last_visit_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_visitor_hash ON visitors(visitor_hash);
    CREATE INDEX IF NOT EXISTS idx_last_visit ON visitors(last_visit_at);
  `);

  return db;
}

/**
 * Insert or update visitor record
 * @param {object} visitor - Visitor data
 * @returns {object} Result with isNew flag
 */
function upsertVisitor(visitor) {
  const database = getDatabase();
  const existing = database.prepare(
    'SELECT id, visit_count FROM visitors WHERE visitor_hash = ?'
  ).get(visitor.visitorHash);

  const now = new Date().toISOString();

  if (existing) {
    database.prepare(`
      UPDATE visitors SET
        visit_count = visit_count + 1,
        last_visit_at = ?,
        page_url = ?,
        referrer = ?
      WHERE visitor_hash = ?
    `).run(now, visitor.pageUrl, visitor.referrer || '', visitor.visitorHash);

    return { isNew: false, visitCount: existing.visit_count + 1 };
  } else {
    database.prepare(`
      INSERT INTO visitors (
        visitor_hash, visit_count, device_type, os, browser,
        screen_width, screen_height, page_url, referrer,
        country, region, city, created_at, last_visit_at
      ) VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      visitor.visitorHash,
      visitor.deviceType || '',
      visitor.os || '',
      visitor.browser || '',
      visitor.screenWidth || null,
      visitor.screenHeight || null,
      visitor.pageUrl || '',
      visitor.referrer || '',
      visitor.country || '',
      visitor.region || '',
      visitor.city || '',
      now,
      now
    );

    return { isNew: true, visitCount: 1 };
  }
}

/**
 * Close database connection (for graceful shutdown)
 */
function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

module.exports = {
  getDatabase,
  upsertVisitor,
  closeDatabase,
};
