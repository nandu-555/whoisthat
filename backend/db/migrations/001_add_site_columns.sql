-- Migration: Add multi-site columns to visitors table
-- Run this only if you are applying migrations manually (the app auto-runs migration in database.js).
-- For new installs, the CREATE TABLE in database.js already includes these columns.

-- Add site columns if they don't exist (SQLite does not support IF NOT EXISTS for columns).
-- Run each statement; ignore errors if the column already exists.

-- SQLite 3.35.0+ supports: ALTER TABLE visitors ADD COLUMN site_id TEXT NOT NULL DEFAULT 'main';
-- For older SQLite, you may need to recreate the table or use a separate migration script.

ALTER TABLE visitors ADD COLUMN site_id TEXT NOT NULL DEFAULT 'main';
ALTER TABLE visitors ADD COLUMN site_name TEXT NOT NULL DEFAULT 'WhoIsThat Demo';
ALTER TABLE visitors ADD COLUMN domain TEXT NOT NULL DEFAULT '';

-- Unique index for per-site visitor lookup (visitor_hash + site_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_site ON visitors(visitor_hash, site_id);
