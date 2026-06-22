/**
 * Proxies a published Google Sheets CSV for the results dashboard.
 * Browsers on GitHub Pages cannot fetch docs.google.com directly (CORS).
 *
 * Set SHEET_CSV_URL in wrangler.toml [vars] or as a Worker variable in the dashboard.
 * For org-restricted publish URLs, uncheck "Restrict access" on Publish to web,
 * or share the sheet with a service account and use the Sheets API path (see README).
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
    headers: {
      ...corsHeaders(origin),
      "Content-Type": "application/json",
    },
  });
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
      return new Response(JSON.stringify({ ok: true, service: "activity-votes-results-proxy" }), {
        headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
      });
    }

    const sheetUrl = (env.SHEET_CSV_URL || "").trim();
    if (!sheetUrl) {
      return jsonError("SHEET_CSV_URL is not configured on the Worker", 500, origin);
    }

    try {
      const upstream = await fetch(sheetUrl, {
        redirect: "follow",
        headers: {
          "User-Agent": "activity-image-slideshow-results-proxy/1.0",
          Accept: "text/csv,text/plain,*/*",
        },
      });

      const body = await upstream.text();

      if (!upstream.ok) {
        return jsonError(
          "Google Sheets returned HTTP " +
            upstream.status +
            ". If the sheet is org-restricted, uncheck Restrict access on Publish to web.",
          502,
          origin,
        );
      }

      if (body.trim().startsWith("<!DOCTYPE") || body.trim().startsWith("<html")) {
        return jsonError(
          "Received HTML instead of CSV — publish may require sign-in. Uncheck Restrict access on Publish to web.",
          502,
          origin,
        );
      }

      return new Response(body, {
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
