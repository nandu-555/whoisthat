# Embed WhoIsThat on Another Site (e.g. GitHub Pages)

Use this to track visitors on **https://nandu-555.github.io/portfolio/** or any site you control.

---

## 1. Deploy your backend publicly

GitHub Pages cannot reach `localhost`. Deploy the WhoIsThat backend to a **public URL**. Free options (no credit card):

| Service   | Notes                    |
|----------|---------------------------|
| **Render** | Free tier, deploy from GitHub |
| **Railway** | Free tier, easy Node deploy   |
| **Fly.io**  | Free tier, global regions    |
| **Glitch**  | Free, remix and run          |

After deployment you’ll have a URL like:

- `https://whoisthat-xxxx.onrender.com`
- or `https://your-app.fly.dev`

Use that as your **backend URL** below.

---

## 2. Add the tracker to the portfolio

In the **repository** that builds https://nandu-555.github.io/portfolio/, open the main HTML file (often `index.html`).

Add this **right before** `</body>` (replace `YOUR_BACKEND_URL` with your real backend URL, no trailing slash):

```html
  <!-- WhoIsThat visitor tracking -->
  <script src="YOUR_BACKEND_URL/tracker.js"></script>
  <script>
    WhoIsThat.init({ endpoint: 'YOUR_BACKEND_URL/track-visit' });
  </script>
</body>
```

**Example** (if your backend is `https://whoisthat-abc123.onrender.com`):

```html
  <!-- WhoIsThat visitor tracking -->
  <script src="https://whoisthat-abc123.onrender.com/tracker.js"></script>
  <script>
    WhoIsThat.init({ endpoint: 'https://whoisthat-abc123.onrender.com/track-visit' });
  </script>
</body>
```

Commit, push, and wait for GitHub Pages to update. Visits to the portfolio will be sent to your backend and you’ll get Telegram alerts.

---

## 3. CORS

The backend uses `CORS_ORIGIN=*` in `.env.example`, so requests from `https://nandu-555.github.io` are allowed. If you later restrict origins, add:

```env
CORS_ORIGIN=https://nandu-555.github.io
```

---

## 4. Privacy

Add a short note to your portfolio’s privacy or footer (e.g. “This site uses anonymous visit analytics; no personal data is collected.”) and link to your privacy page if you have one.
