/**
 * Optional central logging for static GitHub Pages builds.
 * POSTs votes as application/x-www-form-urlencoded (`payload` = JSON) for Google Apps Script.
 */
(function (global) {
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
   * POST vote to your endpoint. Uses application/x-www-form-urlencoded + `payload`
   * (JSON string) so Google Apps Script reliably fills `e.parameter.payload`.
   *
   * Prefer `sendBeacon` for cross-origin POSTs: `fetch` + `no-cors` with a manual
   * Content-Type can be rewritten to `text/plain`, which breaks form parsing on the server.
   * When using `fetch`, pass a URLSearchParams object as `body` and omit Content-Type so
   * the browser sets a CORS-safelisted `application/x-www-form-urlencoded` value.
   *
   * @param {Record<string, unknown>} record
   */
  function submit(record) {
    if (!isOn()) return;
    const url = getEndpoint();
    if (!url) return;
    const body = JSON.stringify({
      ...record,
      reviewerId: reviewerId(),
      clientTs: new Date().toISOString(),
    });
    const params = new URLSearchParams();
    params.set("payload", body);

    try {
      if (typeof navigator.sendBeacon === "function" && navigator.sendBeacon(url, params)) {
        return;
      }
    } catch {
      /* fall through to fetch */
    }

    fetch(url, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      body: params,
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
          ? "Saved. Each vote is sent to your endpoint (browser cannot confirm delivery — check the sheet and Apps Script → Executions)."
          : "Saved. Turn on the checkbox and paste a valid Web app URL to enable logging.";
      }
    });

    const testBtn = document.getElementById("btnTestCentral");
    if (testBtn) {
      testBtn.addEventListener("click", function () {
        if (!getEndpoint().trim()) {
          if (st) st.textContent = "Paste a Web app URL first.";
          return;
        }
        if (!isOn()) {
          if (st) st.textContent = "Turn on “Send each…” and click Save logging settings first.";
          return;
        }
        submit({ tool: "ping", note: "manual test from activity-image-slideshow" });
        if (st) {
          st.textContent =
            "Test event sent. Open Apps Script → Executions (clock icon) within 1–2 minutes. If you see no run, the Web app URL or deployment access is wrong. If the run is red, open it and read the error.";
        }
      });
    }
  }

  global.VoteCentral = { submit: submit, isOn: isOn, wireForm: wireForm };
})(window);
