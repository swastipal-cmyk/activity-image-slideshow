# Central vote logging

Reviewers use the **optional** “Central vote log” block on each tool. When enabled, every vote is **POSTed** from their browser to a URL **you** provide. The static site has **no backend**; you host a tiny receiver (recommended: **Google Apps Script** + **Google Sheet**).

## What reviewers do

1. Open the slideshow or grid tool on GitHub Pages.
2. Expand **Central vote log (optional)**.
3. Paste the **Web app URL** you send them (see below).
4. Enter **Name / initials** (or leave blank — an anonymous id is used).
5. Turn on **Send each vote…** and click **Save logging settings**.

Votes are still saved locally as before; logging is **in addition** (fire-and-forget). Because of browser security (`no-cors`), the page **cannot** read the HTTP response — if something is wrong, rows simply won’t appear in the sheet.

## What you do (Google Sheet + Apps Script)

### 1. Create a Google Sheet

Create a blank spreadsheet. Copy its **ID** from the URL:

`https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`

### 2. Apps Script project

**Extensions → Apps Script**. Replace `YOUR_SHEET_ID_HERE` with the ID from step 1. Paste:

```javascript
var SHEET_ID = "YOUR_SHEET_ID_HERE";

function doPost(e) {
  if (!e.postData || !e.postData.contents) {
    return jsonOut({ ok: false, error: "no body" });
  }
  var o;
  try {
    o = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut({ ok: false, error: "invalid json" });
  }

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var sh = ss.getSheetByName("Votes");
  if (!sh) sh = ss.insertSheet("Votes");

  if (sh.getLastRow() === 0) {
    sh.appendRow([
      "timestamp",
      "reviewerId",
      "tool",
      "sourceFile",
      "activityId",
      "vote",
      "favouriteRank",
      "favouriteMatchesRank1",
      "imageUrl",
      "rank1ImageUrl",
      "qualityScore",
      "sheetRank",
      "slideIndex",
      "slideTotal",
      "payloadJson",
    ]);
  }

  sh.appendRow([
    new Date(),
    o.reviewerId || "",
    o.tool || "",
    o.sourceFile || "",
    o.activityId || "",
    o.vote !== undefined && o.vote !== null ? String(o.vote) : "",
    o.favouriteRank !== undefined && o.favouriteRank !== null ? o.favouriteRank : "",
    o.favouriteMatchesRank1 === true ? "TRUE" : o.favouriteMatchesRank1 === false ? "FALSE" : "",
    o.imageUrl || o.favouriteImageUrl || "",
    o.rank1ImageUrl || "",
    o.qualityScore !== undefined && o.qualityScore !== null ? o.qualityScore : "",
    o.sheetRank !== undefined && o.sheetRank !== null ? o.sheetRank : "",
    o.slideIndex !== undefined && o.slideIndex !== null ? o.slideIndex : "",
    o.slideTotal !== undefined && o.slideTotal !== null ? o.slideTotal : "",
    e.postData.contents,
  ]);

  return jsonOut({ ok: true });
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
```

Save the project (**Ctrl/Cmd+S**).

### 3. Deploy as Web app

**Deploy → New deployment** → type **Web app**.

- **Execute as:** Me  
- **Who has access:** *Anyone* (public internet) **or** *Anyone within &lt;your org&gt;* if you only want Agoda accounts — match how you share the Pages link.

**Deploy**, authorize, then copy the **Web app URL** (ends with `/exec`). That is what reviewers paste into **Web app URL**.

### 4. Share the sheet

Give yourself (and anyone who must **read** results) access to the spreadsheet. The script runs **as you**, so reviewers do **not** need edit access to the sheet.

## Payload fields (reference)

| Field | Slideshow | Grid |
|-------|-----------|------|
| `tool` | `slideshow` | `grid` |
| `sourceFile` | uploaded file name | uploaded file name |
| `activityId` | yes | yes |
| `vote` | `up` / `down` / `null` (skip/clear) | — |
| `favouriteRank` | — | number or empty on clear |
| `favouriteMatchesRank1` | — | boolean when applicable |
| `imageUrl` | rank-1 hero URL | favourite image URL |
| `rank1ImageUrl` | — | sheet rank-1 URL |
| `qualityScore` | optional | favourite’s score |
| `sheetRank` | rank from sheet | favourite’s rank (= sheet rank of pick) |
| `slideIndex` / `slideTotal` | 1-based position in queue | omitted |

All rows also include `reviewerId` and `clientTs` (set in the browser).

## Alternatives

Any HTTPS endpoint that accepts **POST** with **raw JSON body** and `Content-Type: text/plain` can work; you must allow **anonymous** POSTs from browsers if the tool is public (CORS does not apply to `no-cors`, but your server must accept the request).

## Privacy

- Reviewers should only paste URLs **you** gave them.
- The sheet will contain **activity IDs** and **image URLs**; treat the sheet like internal data.
