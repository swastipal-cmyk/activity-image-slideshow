/**
 * Results CSV proxy for GitHub Pages.
 *
 * Mode A (org-restricted sheets): Google Sheets API + service account secrets.
 *   Share the spreadsheet with the service account email as Viewer.
 *
 * Mode B (public publish): set SHEET_CSV_URL in [vars] — simple HTTP proxy.
 */

const ALLOWED_ORIGINS = [
  "https://swastipal-cmyk.github.io",
  "http://localhost:8787",
  "http://127.0.0.1:8787",
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

function jsonError(message, status, origin) {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function base64UrlEncode(bytes) {
  let binary = "";
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlEncodeString(str) {
  return base64UrlEncode(new TextEncoder().encode(str));
}

async function importPrivateKey(pem) {
  const normalized = pem.replace(/\\n/g, "\n");
  const pemContents = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const binary = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  return crypto.subtle.importKey(
    "pkcs8",
    binary,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function getGoogleAccessToken(env) {
  const email = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim();
  const pem = (env.GOOGLE_PRIVATE_KEY || "").trim();
  if (!email || !pem) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY secrets are not set");
  }

  const key = await importPrivateKey(pem);
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncodeString(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncodeString(
    JSON.stringify({
      iss: email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    }),
  );
  const unsigned = header + "." + payload;
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned),
  );
  const jwt = unsigned + "." + base64UrlEncode(signature);

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const tokenBody = await tokenRes.json();
  if (!tokenRes.ok || !tokenBody.access_token) {
    throw new Error(tokenBody.error_description || tokenBody.error || "Failed to get Google access token");
  }
  return tokenBody.access_token;
}

function valuesToCsv(rows) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const s = cell == null ? "" : String(cell);
          if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
          return s;
        })
        .join(","),
    )
    .join("\n");
}

async function fetchViaSheetsApi(env) {
  const spreadsheetId = (env.SPREADSHEET_ID || "").trim();
  const range = (env.SHEET_RANGE || "Form Responses 1!A:Z").trim();
  if (!spreadsheetId) {
    throw new Error("SPREADSHEET_ID is not configured on the Worker");
  }

  const token = await getGoogleAccessToken(env);
  const url =
    "https://sheets.googleapis.com/v4/spreadsheets/" +
    encodeURIComponent(spreadsheetId) +
    "/values/" +
    encodeURIComponent(range);

  const res = await fetch(url, {
    headers: { Authorization: "Bearer " + token },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error?.message || "Sheets API HTTP " + res.status);
  }
  const values = data.values || [];
  if (!values.length) {
    throw new Error("Sheet range is empty — check SHEET_RANGE matches your tab name");
  }
  return valuesToCsv(values);
}

async function fetchViaPublishedUrl(env) {
  const sheetUrl = (env.SHEET_CSV_URL || "").trim();
  if (!sheetUrl) {
    throw new Error("SHEET_CSV_URL is not configured");
  }
  const upstream = await fetch(sheetUrl, {
    redirect: "follow",
    headers: {
      "User-Agent": "activity-image-slideshow-results-proxy/1.0",
      Accept: "text/csv,text/plain,*/*",
    },
  });
  const body = await upstream.text();
  if (!upstream.ok) {
    throw new Error("Published CSV returned HTTP " + upstream.status);
  }
  if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html")) {
    throw new Error("Published URL returned HTML (org-restricted). Use Sheets API + service account instead.");
  }
  return body;
}

async function fetchSheetCsv(env) {
  const hasServiceAccount =
    (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim() && (env.GOOGLE_PRIVATE_KEY || "").trim();

  if (hasServiceAccount) {
    return fetchViaSheetsApi(env);
  }
  if ((env.SHEET_CSV_URL || "").trim()) {
    return fetchViaPublishedUrl(env);
  }
  throw new Error(
    "Configure either service account secrets (recommended for Agoda-restricted sheets) or SHEET_CSV_URL",
  );
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(origin) });
    }

    if (request.method !== "GET") {
      return jsonError("Method not allowed", 405, origin);
    }

    const url = new URL(request.url);
    if (url.pathname === "/health" || url.pathname === "/health/") {
      const mode = (env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "").trim() ? "sheets-api" : "published-url";
      return new Response(
        JSON.stringify({ ok: true, service: "activity-votes-results-proxy", mode }),
        { headers: { ...corsHeaders(origin), "Content-Type": "application/json" } },
      );
    }

    try {
      const csv = await fetchSheetCsv(env);
      return new Response(csv, {
        headers: {
          ...corsHeaders(origin),
          "Content-Type": "text/csv; charset=utf-8",
          "Cache-Control": "public, max-age=60",
        },
      });
    } catch (err) {
      return jsonError(String(err && err.message ? err.message : err), 502, origin);
    }
  },
};
