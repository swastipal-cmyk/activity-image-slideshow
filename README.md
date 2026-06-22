# Activity image review tools

Two static pages (same load / column mapping pattern), plus optional central logging:

| File | Purpose |
|------|--------|
| **`index.html`** | One **rank = 1** image per activity — thumbs up/down, auto-advance. |
| **`image-grid-compare.html`** | All **ranks 1–8** side by side — **green** = sheet Rank 1, click or **1–8** keys for your **favourite**, verdict vs Rank 1, JSON export. |
| **`central-votes.js`** | Shared helper: optional **POST to your Web app** so votes land in one place (e.g. Google Sheet). |
| **`CENTRAL-LOGGING.md`** | Step-by-step: **Google Apps Script + Sheet** receiver (or any HTTPS POST endpoint). |
| **`data/all-activities-web.csv`** | Bundled **All Activities** export (~8.5k rows, URLs only) — **auto-loaded** on GitHub Pages. |
| **`scripts/export-all-activities-web-csv.py`** | Regenerate that CSV from your full `.xlsx` (see below). |

### Bundled dataset (default on GitHub Pages)

Both tools **`fetch`** `data/all-activities-web.csv` on load and **open the viewer automatically** (column mapping is pre-filled). Activities are **shuffled into a random order** on every build so partial sessions still spread across activities. The CSV is built from the **All Activities** tab: `activity_id`, `master_code`, `pix_url`, **`rank`** (same as `image_number`), `quality_score`, etc.

The full **`flagship-activities_hero_images_all.xlsx` (~190MB)** cannot ship in-browser or in-repo: it is mostly embedded images. Browsers also **cannot** read `file:///Users/...` paths for security reasons.

**Refresh the bundled CSV** after you update the master workbook:

```bash
python3 scripts/export-all-activities-web-csv.py "/path/to/flagship-activities_hero_images_all.xlsx"
```

Then commit and push `data/all-activities-web.csv`.

**Local `file://`:** auto-load usually **fails** (no HTTP origin). Run `python3 -m http.server` from this folder or use the **GitHub Pages** URL.

**Other sheets:** click **Upload a different file…** and use **Parse** as before.

### Central vote log (many reviewers)

Both HTML tools include **Central vote log (optional)** at the top: reviewers paste your **Apps Script Web app URL**, enter **name / initials** (or stay anonymous), enable **Send each vote…**, and click **Save logging settings**. Votes are still stored locally; when logging is on, each action is also **POSTed** to your URL. Full setup: **`CENTRAL-LOGGING.md`**.

## Why not open the SharePoint link directly?

The workbook lives behind Agoda sign-in. These tools run **locally in your browser** and never upload your sheet anywhere.

## Get data out of Excel on the web (SharePoint)

1. Open your file in the browser.
2. **File → Save as → Download a copy** (`.xlsx`), **or** if you already have image URLs in cells, **File → Save as → Download as CSV** for the sheet that has the columns you need.

If images are **embedded pictures** (not URLs), you need a column with a **URL** for this viewer (e.g. from your pipeline or `IMAGE(url)` / hyperlink column). Export whatever format includes `activity id` + `image url` + **rank** (numeric).

## Run the viewers

Option A — open `index.html` or `image-grid-compare.html` via **http://** (e.g. `python3 -m http.server`) so the bundled CSV can load. Plain `file://` usually skips auto-load.

Option B — from this folder:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

---

## Slideshow (`index.html`) — columns

- **Activity ID** — unique activity identifier.
- **Image URL** — must be `http(s)://...` (or the cell text is a URL).
- **Quality score** (optional) — if more than one row has rank = 1 for the same activity (unusual), the row with the **higher** score is kept.
- **Rank** (required) — only rows where this column’s numeric value is **exactly 1** are included.

After you click **Build slideshow**, activities are shown in a **random order** (new shuffle each build) so partial sessions still cover a spread of activities.

### Keyboard (`index.html`)

| Key | Action |
|-----|--------|
| ← / A | Thumbs down (then auto-advance) |
| → / D | Thumbs up (then auto-advance) |
| ↓ / S | Skip (clear vote; stays on slide) |

### Export (`index.html`)

**Download votes (JSON)** — votes cached in **localStorage** per file name.

---

## Grid compare (`image-grid-compare.html`) — columns

- **Activity ID**, **Image URL**, **Rank** (required) — only ranks **1 through 8** are used; other ranks ignored.
- **Quality score** (optional) — if two rows share the same activity + rank, the higher score wins that slot.

After **Build grid view**, activities are in **random order** (new shuffle each build).

**UI:** Rank 1 has a **green** border and badge. Your **favourite** gets a **purple** border; the text box states whether your pick is Rank 1 or not. **Keys 1–8** select that rank (if that slot has an image). Choosing a favourite **advances to the next activity** (not on the last one). Click the **same** image again to clear without advancing. **Clear favourite** clears without advancing.

### Export (`image-grid-compare.html`)

**Download picks (JSON)** — per activity: `favouriteRank`, `favouriteMatchesRank1`, `rank1ImageUrl`, and all eight slots. Picks cached in **localStorage** per file name.
