# Activity image review slideshow

Small static page to review **one image per activity** for rows where **rank = 1** in your sheet, with **thumbs up / thumbs down**, and export your labels. **Thumbs up or down** saves the vote and **advances to the next slide** automatically (Skip does not advance).

## Why not open the SharePoint link directly?

The workbook lives behind Agoda sign-in. This tool runs **locally in your browser** and never uploads your sheet anywhere.

## Get data out of Excel on the web (SharePoint)

1. Open your file in the browser.
2. **File → Save as → Download a copy** (`.xlsx`), **or** if you already have image URLs in cells, **File → Save as → Download as CSV** for the sheet that has the columns you need.

If images are **embedded pictures** (not URLs), you need a column with a **URL** for this viewer (e.g. from your pipeline or `IMAGE(url)` / hyperlink column). Export whatever format includes `activity id` + `image url` + **rank** (numeric).

## Run the viewer

Option A — double-click `index.html` (works if your browser allows loading the SheetJS script from the CDN).

Option B — from this folder:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

## Columns

After you load a file, map:

- **Activity ID** — unique activity identifier.
- **Image URL** — must be `http(s)://...` (or the cell text is a URL).
- **Quality score** (optional) — if more than one row has rank = 1 for the same activity (unusual), the row with the **higher** score is kept.
- **Rank** (required) — only rows where this column’s numeric value is **exactly 1** are included.

The queue is **one slide per activity** after filtering to rank 1.

## Keyboard

| Key | Action |
|-----|--------|
| ← / A | Thumbs down (then auto-advance) |
| → / D | Thumbs up (then auto-advance) |
| ↓ / S | Skip (clear vote; stays on slide) |

## Export

**Download votes (JSON)** saves `{ activityId, vote, imageUrl, qualityScore?, rank? }` for every slide in the current queue (including skips as `null`).

Votes are also cached in **localStorage** so a refresh does not lose progress for the same file name.
