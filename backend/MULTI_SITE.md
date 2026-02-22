# WhoIsThat Multi-Site Tracking

## Architecture change

- **Before:** One global visitor table; all visits were treated as one site.
- **After:** Each visit is tied to a **site** via `site_id`, `site_name`, and `domain`. The same backend serves multiple websites; each site is validated via `config/allowedSites.js` and `Origin` header. Visits are stored and grouped by `(visitor_hash, site_id)`.

## Folder structure

```
backend/
  config/
    allowedSites.js      # Whitelist of siteId + domains (edit to add sites)
  db/
    database.js         # SQLite + migration for site columns
    migrations/
      001_add_site_columns.sql
    visitors.db          # (created at runtime)
  public/
    tracker.js          # Script served at /tracker.js
  routes/
    track.js            # POST /track-visit (validates site + origin)
  utils/
    geo.js
    telegram.js         # Alerts include Site, Site ID, Domain
    userAgent.js
  server.js
  .env
  .env.example
```

## SQL changes

**New installs:** `database.js` creates `visitors` with:

- `site_id TEXT NOT NULL`
- `site_name TEXT NOT NULL`
- `domain TEXT NOT NULL`
- Unique index: `(visitor_hash, site_id)`

**Existing DBs:** On startup, `runSiteColumnsMigration()` in `database.js` runs:

- `ALTER TABLE visitors ADD COLUMN site_id TEXT NOT NULL DEFAULT 'main'`
- `ALTER TABLE visitors ADD COLUMN site_name TEXT NOT NULL DEFAULT 'WhoIsThat Demo'`
- `ALTER TABLE visitors ADD COLUMN domain TEXT NOT NULL DEFAULT ''`
- `CREATE UNIQUE INDEX IF NOT EXISTS idx_visitor_site ON visitors(visitor_hash, site_id)`

Manual migration (optional) is in `db/migrations/001_add_site_columns.sql`.

---

## How to add a new website (step-by-step)

1. **Edit `backend/config/allowedSites.js`**
   - Add an entry, e.g.:
   ```js
   {
     siteId: 'blog',
     siteName: 'Tech Blog',
     domains: ['https://myblog.com', 'https://www.myblog.com'],
   },
   ```
   - Use the exact origins visitors will use (scheme + host, no path). Add both `https://myblog.com` and `https://www.myblog.com` if both are used.

2. **Redeploy the backend** (e.g. push to Git so Render redeploys).

3. **On the client site**, add:
   ```html
   <script src="https://whoisthat.onrender.com/tracker.js"></script>
   <script>
     initTracker({ siteId: 'blog', siteName: 'Tech Blog' });
   </script>
   ```
   Replace `whoisthat.onrender.com` with your backend URL if different. The script infers the endpoint from its own `src` if you don’t pass `endpoint`.

4. **Optional:** If the script is not loaded from your backend URL (e.g. self-hosted script), pass the backend URL:
   ```js
   initTracker({
     siteId: 'blog',
     siteName: 'Tech Blog',
     endpoint: 'https://whoisthat.onrender.com'
   });
   ```

5. **Verify:** Open the site, trigger a visit. You should get a Telegram alert with “Site: Tech Blog”, “Site ID: blog”, “Domain: https://myblog.com”.

---

## Deployment note (Render)

- No new env vars are required; existing `PORT`, `TELEGRAM_*`, `CORS_ORIGIN`, rate limit vars still apply.
- After deploy, the app runs the DB migration on startup (adds site columns if missing).
- To add a new site, update `allowedSites.js` and redeploy; no DB console access needed.
- Ensure Render’s “Start Command” runs the backend (e.g. `npm start` / `node server.js`).

---

## Testing steps

1. **Local**
   - `cd backend && npm start`
   - Open `http://localhost:3000` (frontend). Check browser Network: POST to `/track-visit` with `siteId: 'main'`, `siteName: 'WhoIsThat Demo'`, `domain: 'http://localhost:3000'`.
   - Check Telegram: alert shows “WhoIsThat Alert”, Site, Site ID, Domain, Page, Location, Device, Browser, Visit Count.

2. **403 for unknown site**
   - In browser console:  
     `fetch('http://localhost:3000/track-visit', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ siteId: 'fake', siteName: 'Fake', domain: 'http://localhost:3000' }) })`
   - Expect 403 and body `{ ok: false, error: 'Site not allowed' }`.

3. **403 for wrong origin**
   - From a page on another origin (or by spoofing `Origin` in a tool), send a valid `siteId` but an origin not in `allowedSites` for that site. Expect 403 “Origin not allowed for this site”.

4. **Tracker script**
   - Open `http://localhost:3000/tracker.js`. Should return the script. On a whitelisted site, include it and call `initTracker({ siteId: 'main', siteName: 'WhoIsThat Demo' })` and confirm a visit is recorded and alerted.

5. **Rate limit**
   - Send many POSTs from the same IP in a short time. Expect 429 “Too many requests” after the configured limit.

6. **Deploy on Render**
   - Deploy, then open your Render backend URL. Add that URL (and your frontend URL if different) to `allowedSites.js` for `main`, redeploy, and repeat the checks above against the live URL.
