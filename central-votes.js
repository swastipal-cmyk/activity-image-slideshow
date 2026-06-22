/**
 * Central logging for static GitHub Pages builds.
 * Always-on: POSTs every vote/pick to a Google Form anonymously (no-cors).
 *
 * To update the form: change FORM_URL and FORM_ENTRY below, then commit + push.
 */
(function (global) {
  /** Google Form submit URL and entry field ID for the single "payload" question. */
  const FORM_URL =
    "https://docs.google.com/forms/d/e/1FAIpQLScS6dPM03tl8tBi353khzTqYb9LBc_pwhLqA1Edz2AUnTURkw/formResponse";
  const FORM_ENTRY = "entry.1845975560";

  const K = {
    reviewer: "vote-central-reviewer-v1",
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

  /** Always on — logging is not optional. */
  function isOn() {
    return true;
  }

  /**
   * Build URLSearchParams for the Google Form POST.
   * Passing URLSearchParams as fetch body (no custom Content-Type header) produces a
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
    params.set("fvv", "1");
    params.set("pageHistory", "0");
    return params;
  }

  /**
   * Fire-and-forget POST to Google Form.
   * @param {Record<string, unknown>} record
   */
  function submit(record) {
    fetch(FORM_URL, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      body: makeParams(record),
    }).catch(function () {});
  }

  function wireForm() {
    const rv = document.getElementById("centralReviewer");
    const btn = document.getElementById("btnSaveCentral");
    const st = document.getElementById("centralStatus");
    if (!rv || !btn) return;
    try {
      rv.value = localStorage.getItem(K.reviewer) || "";
    } catch {
      rv.value = "";
    }
    btn.addEventListener("click", function () {
      try {
        localStorage.setItem(K.reviewer, (rv.value || "").trim());
      } catch {
        /* ignore */
      }
      if (st) {
        st.textContent = rv.value.trim()
          ? "Name saved \u2014 your votes will be logged as \u201c" + rv.value.trim() + "\u201d."
          : "Saved (no name \u2014 an anonymous ID will be used).";
      }
    });

    const testBtn = document.getElementById("btnTestCentral");
    if (testBtn) {
      testBtn.addEventListener("click", function () {
        const testParams = makeParams({ tool: "ping", note: "manual test from activity-image-slideshow" });
        console.log("[VoteCentral] POST to:", FORM_URL);
        console.log("[VoteCentral] body:", testParams.toString());
        if (st) st.textContent = "Sending\u2026";
        fetch(FORM_URL, {
          method: "POST",
          mode: "no-cors",
          cache: "no-cache",
          body: testParams,
        })
          .then(function () {
            if (st)
              st.textContent =
                "Sent! Check the linked Google Sheet for a new row with tool:ping within a few seconds.";
          })
          .catch(function (err) {
            console.error("[VoteCentral] fetch error:", err);
            if (st) st.textContent = "Error: " + String(err && err.message ? err.message : err);
          });
      });
    }
  }

  global.VoteCentral = { submit: submit, isOn: isOn, wireForm: wireForm };
})(window);
