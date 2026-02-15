# WhoIsThat

Anonymous visitor analytics for websites. Track visits in real time and receive alerts via Telegram.

**100% zero-cost:** Free tiers only. No paid APIs, no credit cards required.

---

## Architecture

```
┌─────────────┐     POST /track-visit      ┌──────────────┐     ipapi.co      ┌─────────────┐
│  Frontend   │ ─────────────────────────► │   Backend    │ ◄────────────────► │  Geolocation│
│  (tracker)  │     pageUrl, referrer,     │  (Express)   │                   │     API     │
│             │     screen size, etc.      │              │                   └─────────────┘
└─────────────┘                            │  - Rate limit│
                                           │  - Hash IP   │     Telegram API  ┌─────────────┐
                                           │  - SQLite    │ ─────────────────►│   Telegram  │
                                           └──────────────┘    Send alert     │    Bot      │
                                                  │                           └─────────────┘
                                                  ▼
                                           ┌──────────────┐
                                           │   SQLite     │
                                           │   visitors   │
                                           └──────────────┘
```

- **Frontend:** Lightweight JS sends anonymized data to backend on page load.
- **Backend:** Validates, rate-limits, hashes IP, stores in SQLite, fetches geo, sends Telegram alert.
- **Database:** SQLite file, no external DB required.
- **APIs:** ipapi.co (geolocation, 1000 req/day free), Telegram Bot API (free).

---

## Project Structure

```
whoisthat/
├── backend/
│   ├── server.js           # Express server
│   ├── routes/
│   │   └── track.js        # POST /track-visit handler
│   ├── db/
│   │   └── database.js     # SQLite setup & upsert
│   ├── utils/
│   │   ├── geo.js          # IP → location (ipapi.co)
│   │   ├── telegram.js     # Send Telegram alerts
│   │   └── userAgent.js    # Parse UA (device, OS, browser)
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── tracker.js          # Tracking script
│   ├── styles.css
│   └── privacy.html
└── README.md
```

---

## Setup

### 1. Prerequisites

- Node.js 18+ (LTS)
- npm or yarn

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set:

- `TELEGRAM_BOT_TOKEN` – Your Telegram bot token
- `TELEGRAM_CHAT_ID` – Chat ID where alerts go

### 4. Create Telegram Bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot`
3. Choose a name (e.g. "WhoIsThat Alerts") and username (e.g. `whoisthat_alerts_bot`)
4. BotFather returns a token like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
5. Copy it into `.env` as `TELEGRAM_BOT_TOKEN`

### 5. Get Chat ID

1. Start a chat with your bot
2. Send any message (e.g. "hi")
3. Visit: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
4. Find `"chat":{"id":123456789}` and use `123456789` as `TELEGRAM_CHAT_ID`

Or use @userinfobot: message it and it returns your user ID (if sending to yourself).

### 6. Run Locally

```bash
cd backend
npm start
```

Server runs at `http://localhost:3000`.

- Demo page: `http://localhost:3000/index.html`
- Privacy notice: `http://localhost:3000/privacy.html`

---

## Run Commands

| Command       | Description                          |
|---------------|--------------------------------------|
| `npm start`   | Start server (port from `.env`)      |
| `npm run dev` | Same as `npm start`                  |

---

## Embedding the Tracker on Your Site

Include the script and init call:

```html
<script src="https://your-domain.com/tracker.js"></script>
<script>
  WhoIsThat.init({ endpoint: 'https://your-domain.com/track-visit' });
</script>
```

Change `endpoint` to your backend URL. For same-origin (e.g. backend serves frontend), use `/track-visit`.

---

## Sample Telegram Alert

**New visitor:**

```
🆕 New Visitor

📍 Location: New York, New York, United States
📱 Device: desktop | Windows 10
🌐 Browser: Chrome 120.0
📐 Screen: 1920×1080
🔗 Page: http://localhost:3000/
↩️ Referrer: Direct
⏰ Time: 2/15/2025, 3:45:22 PM
```

**Returning visitor:**

```
🔄 Returning Visitor
📊 Visit #3

📍 Location: New York, New York, United States
📱 Device: desktop | Windows 10
🌐 Browser: Chrome 120.0
🔗 Page: http://localhost:3000/
↩️ Referrer: Direct
⏰ Time: 2/15/2025, 3:48:01 PM
```

---

## Security & Privacy

- **IP hashing:** IPs are SHA-256 hashed before storage. Original IP cannot be recovered.
- **No fingerprinting:** Only standard browser data (screen, referrer, page URL).
- **Rate limiting:** 30 requests per IP per minute (configurable).
- **Validation:** Input sanitized; string length limits applied.
- **No PII:** No names, emails, phones, or other identifiers.
- **Geolocation:** Approximate only (country/region/city from IP).
- **Legal:** Use only on sites you control; disclose analytics in your privacy policy.

---

## Optional Future Upgrades

- **Redis rate limiting** – Persist rate limits across restarts.
- **Dashboard** – Web UI for analytics.
- **ipinfo.io fallback** – Alternate geo API when ipapi.co fails.
- **Export** – CSV/JSON export of visitor stats.
- **HTTPS** – Deploy behind reverse proxy (Nginx/Caddy) with SSL.
- **PM2** – Process manager for production.

---

## License

MIT.
