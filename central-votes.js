/**
 * Optional central logging for static GitHub Pages builds.
 * POSTs votes to a Google Form (no-cors, anonymous — no Apps Script auth required).
 *
 * Form submit URL: https://docs.google.com/forms/d/e/1FAIpQLScS6dPM03tl8tBi353khzTqYb9LBc_pwhLqA1Edz2AUnTURkw/formResponse
 * Paste that URL into the "Form URL" field in the tool.
 * If you recreate the form, update FORM_ENTRY below to match the new entry ID.
 */
(function (global) {
  /** Google Form entry field ID for the single "payload" question. */
  const FORM_ENTRY = "entry.1845975560";

  const K = {
    endpoint: "vote-central-endpoint-v1",
    reviewer: "vote-central-reviewer-v1",
    enable: "vote-central-enable-v1",
    anon: "vote-central-anon-v1",
  };

  function anonId() {
    let id = "";
    try {
      id = localStorage.getItem(K.anon) || "";
    } catch {
      /* ignore */
    }
    if (!id) {
      id = "anon_" + Math.random().toString(36).slice(2, 14);
      try {
        localStorage.setItem(K.anon, id);
      } catch {
        /* ignore */
      }
    }
    return id;
  }

  function reviewerId() {
    let r = "";
    try {
      r = (localStorage.getItem(K.reviewer) || "").trim();
    } catch {
      /* ignore */
    }
    return r || anonId();
  }

  function getEndpoint() {
    try {
      return (localStorage.getItem(K.endpoint) || "").trim();
    } catch {
      return "";
    }
  }

  function isOn() {
    let en = false;
    try {
      en = localStorage.getItem(K.enable) === "1";
    } catch {
      /* ignore */
    }
    return en && !!getEndpoint();
  }

  /**
   * Build URLSearchParams for a Google Form POST.
   * The single form field (FORM_ENTRY) receives the full JSON payload as text.
   * Passing URLSearchParams as fetch body (no custom Content-Type) produces a
   * CORS-safelisted simple request — Google Forms accept this without authentication.
   */
  function makeParams(record) {
    const params = new URLSearchParams();
    params.set(
      FORM_ENTRY,
      JSON.stringify({
        ...record,
        reviewerId: reviewerId(),
        clientTs: new Date().toISOString(),
      }),
    );
    // Hidden fields Google Forms expects for the submission to be recorded.
    params.set("fvv", "1");
    params.set("pageHistory", "0");
    return params;
  }

  /**
   * Fire-and-forget POST to Google Form for real votes.
   * no-cors: response is opaque but the submission reaches the form.
   * @param {Record<string, unknown>} record
   */
  function submit(record) {
    if (!isOn()) return;
    const url = getEndpoint();
    if (!url) return;
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      body: makeParams(record),
    }).catch(function () {});
  }

  function wireForm() {
    const ep = document.getElementById("centralEndpoint");
    const rv = document.getElementById("centralReviewer");
    const en = document.getElementById("centralEnabled");
    const btn = document.getElementById("btnSaveCentral");
    const st = document.getElementById("centralStatus");
    if (!ep || !btn) return;
    try {
      ep.value = localStorage.getItem(K.endpoint) || "";
    } catch {
      ep.value = "";
    }
    try {
      rv.value = localStorage.getItem(K.reviewer) || "";
    } catch {
      rv.value = "";
    }
    try {
      en.checked = localStorage.getItem(K.enable) === "1";
    } catch {
      en.checked = false;
    }
    btn.addEventListener("click", function () {
      try {
        localStorage.setItem(K.endpoint, ep.value.trim());
        localStorage.setItem(K.reviewer, (rv.value || "").trim());
        localStorage.setItem(K.enable, en.checked ? "1" : "0");
      } catch {
        /* ignore */
      }
      if (st) {
        st.textContent = isOn()
          ? "Saved. Each vote will be posted to your Google Form."
          : "Saved. Turn on the checkbox and paste the form URL to enable logging.";
      }
    });

    const testBtn = document.getElementById("btnTestCentral");
    if (testBtn) {
      testBtn.addEventListener("click", function () {
        const url = getEndpoint().trim();
        if (!url) {
          if (st) st.textContent = "Paste the Google Form formResponse URL first.";
          return;
        }
        if (!isOn()) {
          if (st) st.textContent = "Turn on \u201cSend each\u2026\u201d and click Save logging settings first.";
          return;
        }
        fetch(url, {
          method: "POST",
          mode: "no-cors",
          cache: "no-cache",
          body: makeParams({ tool: "ping", note: "manual test from activity-image-slideshow" }),
        }).catch(function () {});
        if (st) {
          st.textContent =
            "Test ping sent (no-cors \u2014 browser cannot confirm delivery). " +
            "Open your linked Google Sheet: you should see a new row with tool: ping within a few seconds. " +
            "If nothing appears, the URL is wrong \u2014 it must end with /formResponse, not /viewform.";
        }
      });
    }
  }

  global.VoteCentral = { submit: submit, isOn: isOn, wireForm: wireForm };
})(window);
