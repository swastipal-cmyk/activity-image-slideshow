# Central vote logging

Reviewers use the **optional** “Central vote log” block at the **top of the page** (it stays visible after you start reviewing). When enabled, every vote is **POSTed** from their browser to a URL **you** provide. The static site has **no backend**; you host a tiny receiver (recommended: **Google Apps Script** + **Google Sheet**).

## What reviewers do

1. Open the slideshow or grid tool on GitHub Pages.
2. Expand **Central vote log (optional)**.
3. Paste the **Web app URL** you send them (see below).
4. Enter **Name / initials** (or leave blank — an anonymous id is used).
5. Turn on **Send each vote…** / **Send each pick…**, click **Save logging settings**, then use **Test send** once. In Apps Script open **Executions** — you should see a run. If it’s red, open it for the error message.

Votes are still saved locally as before; logging is **in addition** (fire-and-forget). The tools use **`navigator.sendBeacon`** when possible, then **`fetch`** with `no-cors` as a fallback — the page **cannot** read the HTTP response, so if something is wrong, rows simply won’t appear in the sheet.

### If Apps Script → Executions shows nothing

1. **Confirm the Web app URL with GET** — paste the `/exec` URL in a **new browser tab**. You should see plain text from `doGet` (“Web app is reachable…”). If you get 404, sign-in, or wrong page, the deployment URL or **Who has access** is wrong — **fix that before** looking at POSTs.

2. **Open the correct script project** — Executions are logged on the **Apps Script project that owns the deployment** (usually **Extensions → Apps Script** on the bound Sheet). They do **not** appear in Google Cloud Console “Executions” for a different project.

3. **In the Apps Script editor**, use the **left sidebar** (clock / list icon, labeled **Executions** or **Runs** depending on UI). Filter “All executions”, not only “My runs” if such a filter exists.

4. **After changing the checkbox or URL**, click **Save logging settings** again — settings are in `localStorage` per browser profile.

5. **Browser check** — DevTools → **Network**, filter `script.google`, click **Test send**. You should see a **POST** to your `/exec` URL (not blocked / cancelled). If there is no POST, an extension, strict mode, or the page not loading `central-votes.js` is likely.

6. **Older bug (fixed in repo)** — `fetch` + `no-cors` + a manual `Content-Type` with `charset` could cause the body not to parse as form data on the server. Current `central-votes.js` uses **sendBeacon** and **URLSearchParams as `fetch` body** without a custom header. Redeploy the **static site** after pulling the fix, or paste the updated script into your fork.

## What you do (Google Sheet + Apps Script)

### 1. Create a Google Sheet

Create a blank spreadsheet. Copy its **ID** from the URL:

`https://docs.google.com/spreadsheets/d/`**`THIS_PART_IS_THE_ID`**`/edit`

### 2. Apps Script project

**Extensions → Apps Script**. Replace `YOUR_SHEET_ID_HERE` with the ID from step 1. Paste:

```javascript
var SHEET_ID = "YOUR_SHEET_ID_HERE";

/** Prefer form field `payload` (browser sends urlencoded); fall back to raw post body. */
function getPayloadText_(e) {
  if (e.parameter && e.parameter.payload) {
    return String(e.parameter.payload);
  }
  if (e.postData && e.postData.contents) {
    return String(e.postData.contents);
  }
  return "";
}

function logError_(err) {
  try {
    var ss = SpreadsheetApp.openById(SHEET_ID);
    var sh = ss.getSheetByName("_voteLogErrors");
    if (!sh) sh = ss.insertSheet("_voteLogErrors");
    if (sh.getLastRow() === 0) {
      sh.appendRow(["timestamp", "message", "stack"]);
    }
    sh.appendRow([new Date(), String(err && err.message ? err.message : err), String(err && err.stack ? err.stack : "")]);
  } catch (x) {
    /* ignore */
  }
}

function doGet() {
  return ContentService.createTextOutput(
    "Web app is reachable. Use POST from the image tools, or add ?ping=1 (you are GETting now).",
  ).setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var raw = getPayloadText_(e);
    if (!raw) {
      return jsonOut({ ok: false, error: "no payload — use form field `payload` or raw JSON body" });
    }
    var o;
    try {
      o = JSON.parse(raw);
    } catch (err) {
      logError_(err);
      return jsonOut({ ok: false, error: "invalid json in payload" });
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
      raw,
    ]);

    return jsonOut({ ok: true });
  } catch (err) {
    logError_(err);
    return jsonOut({ ok: false, error: String(err && err.message ? err.message : err) });
  }
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

### 5. After you change the script

**Deploy → Manage deployments → Edit (pencil) → Version: New version → Deploy.**  
Otherwise the live `/exec` URL may still run old code.

### 6. Troubleshooting (no rows in `Votes`)

1. **Apps Script → Executions** (clock icon, left sidebar in the script editor). After you vote or click **Test send**, a **Completed** or **Failed** run should appear within ~1–2 minutes.
   - **No run at all:** wrong Web app URL, logging not saved in the tool (checkbox + **Save**), or an extension/ad-blocker blocking `script.google.com`.
   - **Failed (red):** open the run — common causes: wrong `SHEET_ID`, spreadsheet deleted, or first-time authorization not completed.

2. **Paste the Web app URL in a new browser tab** — you should see plain text: “Web app is reachable…”. If you get 404 or Google sign-in errors, the deployment URL or **Who has access** is wrong.

3. **You must click “Save logging settings”** after pasting the URL and turning the checkbox on (settings are stored in the browser).

4. **Update the Apps Script** to the latest version in this repo’s `CENTRAL-LOGGING.md` (it reads `payload` from form posts). The tools now POST as **`application/x-www-form-urlencoded`**, which Google handles reliably.

5. Check tab **`_voteLogErrors`** in the same spreadsheet — script errors are appended there when possible.

## Payload fields (reference)

| Field | Slideshow | Grid |
|-------|-----------|------|
| `tool` | `slideshow` | `grid` |
| `sourceFile` | uploaded file name | uploaded file name |
| `activityId` | yes | yes |
| `activityTitle` | optional (detected from e.g. `activity_title`) | optional (same) |
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

Any HTTPS endpoint that accepts **POST** with either **`application/x-www-form-urlencoded`** body containing a **`payload`** field (JSON string), or a raw JSON **body**, can work; you must allow **anonymous** POSTs from browsers if the tool is public.

## Privacy

- Reviewers should only paste URLs **you** gave them.
- The sheet will contain **activity IDs**, optional **titles** (when the sheet has a title column), and **image URLs**; treat the sheet like internal data.
