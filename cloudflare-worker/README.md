# Cloudflare Worker — live results for org-restricted Google Sheets

Agoda Google Workspace often **cannot** uncheck “Restrict access” on **Publish to web**. Anonymous CSV URLs then return a login page — browsers and Workers both fail.

**Fix:** use the **Google Sheets API** with a **service account**. You share the spreadsheet with that robot account as **Viewer** (allowed inside Agoda). The Worker reads the sheet with an API token.

## Prerequisites

- [Cloudflare](https://dash.cloudflare.com/sign-up) account (free)
- Node.js 18+
- Permission to **share** the Form Responses spreadsheet

## 1. Google Cloud service account

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project.
2. **APIs & Services → Library** → enable **Google Sheets API**.
3. **APIs & Services → Credentials → Create credentials → Service account**.
4. Create the account → **Keys → Add key → JSON** → download the file.

From the JSON file you need:

- `client_email` → e.g. `results-reader@my-project.iam.gserviceaccount.com`
- `private_key` → the long `-----BEGIN PRIVATE KEY-----` block

## 2. Share the spreadsheet

1. Open your Form Responses sheet:
   `https://docs.google.com/spreadsheets/d/1EFAdD7fzORvoyjDnL2fZ6fCnn36RQKgg74HumpkHva0/edit`
2. **Share** → add the **service account email** (`client_email`) as **Viewer**.
3. Confirm the tab name is **Form Responses 1** (or update `SHEET_RANGE` in `wrangler.toml`).

You do **not** need to change Publish to web or remove Agoda restriction.

## 3. Configure the Worker

```bash
cd cloudflare-worker

# Paste client_email when prompted
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL

# Paste the full private_key line from JSON (including -----BEGIN...-----)
npx wrangler secret put GOOGLE_PRIVATE_KEY
```

`SPREADSHEET_ID` and `SHEET_RANGE` are already set in `wrangler.toml`.

## 4. Deploy

```bash
npx wrangler login
npx wrangler deploy
```

Test:

```bash
curl -s "https://activity-votes-results-proxy.<subdomain>.workers.dev/health"
# → {"ok":true,"mode":"sheets-api"}

curl -s "https://activity-votes-results-proxy.<subdomain>.workers.dev/" | head -2
# → Timestamp,payload,...  (CSV header row)
```

## 5. Results page

1. Open [results.html](https://swastipal-cmyk.github.io/activity-image-slideshow/results.html)
2. Paste Worker URL → **Save Worker URL** → **Load live**

## Troubleshooting

| Error | Fix |
|-------|-----|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL ... not set` | Run both `wrangler secret put` commands |
| `The caller does not have permission` | Share the sheet with the service account email |
| `Unable to parse range` | Fix `SHEET_RANGE` tab name (e.g. `Form Responses 1!A:Z`) |
| `invalid_grant` / JWT errors | Re-paste `private_key` with `\n` newlines intact |
| Still using `published-url` mode | Remove `SHEET_CSV_URL` from vars; ensure secrets are set |

## Fallback

**File → Download → CSV** on the results page always works without Cloudflare.
