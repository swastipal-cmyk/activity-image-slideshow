# Central vote logging

Reviewers use the **optional** "Central vote log" block at the **top of the page** (it stays visible while reviewing). When enabled, every vote/pick is **POSTed** from their browser directly to a **Google Form** — no Apps Script, no backend auth required.

## What reviewers do

1. Open the slideshow or grid tool on GitHub Pages.
2. In the **Central vote log** block, paste the **Form URL** (ends with `/formResponse`).
3. Enter **Name / initials** (or leave blank — an anonymous id is used).
4. Turn on **Send each vote…**, click **Save logging settings**.
5. Click **Test send** — open your linked Google Sheet within a few seconds; a new row with `tool: ping` should appear.

## What you do (one-time setup)

### 1. Create the Google Form

1. Go to [forms.google.com](https://forms.google.com) → **Blank form**.
2. Add one question, type **Paragraph**, titled `payload`.
3. **Responses tab** → click the Google Sheets icon → **Create a new spreadsheet**. All submissions land there automatically.

### 2. Get the submit URL

In the form editor → **⋮ → Pre-fill form** → type anything in the payload box → **Get link**.

The link looks like:
```
https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.XXXXXXXXX=test
```

The submit URL is the same path with `formResponse` instead of `viewform`:
```
https://docs.google.com/forms/d/e/FORM_ID/formResponse
```

Share that URL with reviewers (and paste it into the **Form URL** field yourself).

### 3. If you recreate the form

The entry field ID (`entry.XXXXXXXXX`) is hardcoded in `central-votes.js` as `FORM_ENTRY`. Update that constant to match the new form's entry ID, then commit and push.

## Current form details

| Field | Value |
|-------|-------|
| Form submit URL | `https://docs.google.com/forms/d/e/1FAIpQLScS6dPM03tl8tBi353khzTqYb9LBc_pwhLqA1Edz2AUnTURkw/formResponse` |
| Entry field ID | `entry.1845975560` |

## Payload fields (in the JSON stored in each form response)

| Field | Slideshow | Grid |
|-------|-----------|------|
| `tool` | `slideshow` | `grid` |
| `sourceFile` | uploaded file name | uploaded file name |
| `activityId` | yes | yes |
| `activityTitle` | optional (from `activity_title` column) | optional (same) |
| `vote` | `up` / `down` / `null` (skip/clear) | — |
| `favouriteRank` | — | number or empty on clear |
| `favouriteMatchesRank1` | — | boolean when applicable |
| `imageUrl` | rank-1 hero URL | favourite image URL |
| `rank1ImageUrl` | — | sheet rank-1 URL |
| `qualityScore` | optional | favourite's score |
| `sheetRank` | rank from sheet | favourite's rank |
| `slideIndex` / `slideTotal` | 1-based position in queue | omitted |
| `reviewerId` | name/initials or auto anon id | same |
| `clientTs` | ISO timestamp | same |

## Troubleshooting

**No row appears after Test send:**
1. The URL must end with `/formResponse`, not `/viewform`. Re-check what you pasted.
2. Make sure **Save logging settings** was clicked after pasting the URL and turning the checkbox on.
3. Google Form responses can take a few seconds — wait 10–15 s and refresh the Sheet.
4. Open DevTools → **Network**, filter `google.com`, click **Test send** — you should see a POST to the `formResponse` URL. If there is no POST, the page may still be serving the old cached JS — hard-refresh (Cmd/Ctrl + Shift + R).

## Privacy

- The sheet is owned by whoever created the form. Share it as internal data.
- Each row contains the full JSON payload including activity IDs, titles, and image URLs.
