# Activity image review tools

Two static pages (same load / column mapping pattern):

| File | Purpose |
|------|--------|
| **`index.html`** | One **rank = 1** image per activity — thumbs up/down, auto-advance. |
| **`image-grid-compare.html`** | All **ranks 1–8** side by side — **green** = sheet Rank 1, click or **1–8** keys for your **favourite**, verdict vs Rank 1, JSON export. |

## Why not open the SharePoint link directly?

The workbook lives behind Agoda sign-in. These tools run **locally in your browser** and never upload your sheet anywhere.

## Get data out of Excel on the web (SharePoint)

1. Open your file in the browser.
2. **File → Save as → Download a copy** (`.xlsx`), **or** if you already have image URLs in cells, **File → Save as → Download as CSV** for the sheet that has the columns you need.

If images are **embedded pictures** (not URLs), you need a column with a **URL** for this viewer (e.g. from your pipeline or `IMAGE(url)` / hyperlink column). Export whatever format includes `activity id` + `image url` + **rank** (numeric).

## Run the viewers

Option A — double-click `index.html` or `image-grid-compare.html` (works if your browser allows loading the SheetJS script from the CDN).

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

**UI:** Rank 1 has a **green** border and badge. Your **favourite** gets a **purple** border; the text box states whether your pick is Rank 1 or not. **Keys 1–8** select that rank (if that slot has an image). Choosing a favourite **advances to the next activity** (not on the last one). Click the **same** image again to clear without advancing. **Clear favourite** clears without advancing.

### Export (`image-grid-compare.html`)

**Download picks (JSON)** — per activity: `favouriteRank`, `favouriteMatchesRank1`, `rank1ImageUrl`, and all eight slots. Picks cached in **localStorage** per file name.
