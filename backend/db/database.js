/**
 * SQLite Database Module
 * Multi-site visitor tracking. Auto-creates tables and runs migrations.
 * Stores visitor data with privacy-safe hashed IPs, keyed by (visitor_hash, site_id).
 */

// Database file in backend/db/visitors.db
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'visitors.db');

let db = null;

/**
 * Run migration: add site columns if they don't exist (for existing DBs)
 */
function runSiteColumnsMigration(database) {
  const columns = database.prepare("PRAGMA table_info(visitors)").all();
  const names = columns.map((c) => c.name);

  if (!names.includes('site_id')) {
    database.exec(`ALTER TABLE visitors ADD COLUMN site_id TEXT NOT NULL DEFAULT 'main'`);
  }
  if (!names.includes('site_name')) {
    database.exec(`ALTER TABLE visitors ADD COLUMN site_name TEXT NOT NULL DEFAULT 'WhoIsThat Demo'`);
  }
  if (!names.includes('domain')) {
    database.exec(`ALTER TABLE visitors ADD COLUMN domain TEXT NOT NULL DEFAULT ''`);
  }
  // Note: Unique index is created AFTER this migration completes
}

/**
 * Initialize database connection, create tables, and run migrations
 * @returns {object} Database instance
 */
function getDatabase() {
  if (db) return db;


  // Enable WAL mode for better concurrent access
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');

  db.exec(`
    CREATE TABLE IF NOT EXISTS visitors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      visitor_hash TEXT NOT NULL,
      site_id TEXT NOT NULL,
      site_name TEXT NOT NULL,
      domain TEXT NOT NULL,
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

  // Run migration FIRST to add columns if they don't exist
  runSiteColumnsMigration(db);
  
  // Then create the unique index (after columns are guaranteed to exist)
  db.exec(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_site ON visitors(visitor_hash, site_id);
  `);

  return db;
}

/**
 * Insert or update visitor record (per site)
 * @param {object} visitor - Must include visitorHash, siteId, siteName, domain, and other fields
 * @returns {object} { isNew: boolean, visitCount: number }
 */
function upsertVisitor(visitor) {
  const database = getDatabase();
  const existing = database.prepare(
    'SELECT id, visit_count FROM visitors WHERE visitor_hash = ? AND site_id = ?'
  ).get(visitor.visitorHash, visitor.siteId);

  const now = new Date().toISOString();

  if (existing) {
    database.prepare(`
      UPDATE visitors SET
        visit_count = visit_count + 1,
        last_visit_at = ?,
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
        page_url = ?,
        referrer = ?,
        site_name = ?,
        domain = ?
      WHERE visitor_hash = ? AND site_id = ?
    `).run(
      now,
      visitor.pageUrl,
      visitor.referrer || '',
      visitor.siteName || '',
      visitor.domain || '',
      visitor.visitorHash,
      visitor.siteId
    );

    return { isNew: false, visitCount: existing.visit_count + 1 };
  }

  database.prepare(`
    INSERT INTO visitors (
      visitor_hash, site_id, site_name, domain, visit_count, device_type, os, browser,
      screen_width, screen_height, page_url, referrer,
      country, region, city, created_at, last_visit_at
    ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    visitor.visitorHash,
    visitor.siteId,
    visitor.siteName || '',
    visitor.domain || '',
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
