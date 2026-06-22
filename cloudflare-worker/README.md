# Cloudflare Worker — live results CSV proxy

The [results dashboard](../results.html) on GitHub Pages cannot `fetch` Google Sheets directly (browser CORS). This Worker fetches your **published CSV URL** server-side and returns it with `Access-Control-Allow-Origin` for GitHub Pages.

## Prerequisites

- A [Cloudflare](https://dash.cloudflare.com/sign-up) account (free tier is enough)
- Node.js 18+ (for `npx wrangler`)

## 1. Publish the sheet (important)

In Google Sheets: **File → Share → Publish to web**

- Sheet: **Form Responses 1**
- Format: **Comma-separated values (.csv)**
- Copy the published link

**Uncheck “Restrict access to Agoda…”** if you want the Worker to read the CSV without Google sign-in. If that box stays checked, the Worker will get a login page (HTML) instead of CSV — same as the browser.

Paste the full `…/pub?…&output=csv` URL into `wrangler.toml` → `[vars]` → `SHEET_CSV_URL`.

## 2. Deploy the Worker

```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
```

Note the URL printed at the end, e.g.:

`https://activity-votes-results-proxy.<your-subdomain>.workers.dev`

Test:

```bash
curl -s "https://activity-votes-results-proxy.<your-subdomain>.workers.dev/health"
curl -s "https://activity-votes-results-proxy.<your-subdomain>.workers.dev/" | head -3
```

You should see CSV text (timestamp + payload header), not HTML.

## 3. Wire the results page

Open [results.html](https://swastipal-cmyk.github.io/activity-image-slideshow/results.html):

1. Expand **Live load via Cloudflare Worker**
2. Paste your Worker URL (no trailing path needed)
3. Click **Load live**
4. Click **Save Worker URL** so it auto-loads next time

Or set the default in `results.html` → `DEFAULT_WORKER_URL` and push to GitHub Pages.

## Update the sheet URL later

Either edit `SHEET_CSV_URL` in `wrangler.toml` and run `npx wrangler deploy`, or in Cloudflare dashboard: **Workers → your worker → Settings → Variables**.

## Troubleshooting

| Symptom | Fix |
|--------|-----|
| `Received HTML instead of CSV` | Uncheck org restriction on Publish to web, or use CSV upload on results page |
| `HTTP 401/403` from upstream | Same — publish must be readable without login |
| CORS error on results page | Worker URL wrong, or origin not in `ALLOWED_ORIGINS` in `src/index.js` |
| Empty table after load | CSV has no `payload` column or no `grid` picks yet |
