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
   * Build URLSearchParams containing the JSON payload.
   * Passing URLSearchParams as the fetch `body` (with no custom Content-Type header)
   * makes the browser set `application/x-www-form-urlencoded` automatically — a
   * CORS-safelisted simple request, so no preflight fires and GAS doPost receives
   * the body as e.parameter.payload.
   */
  function makeParams(record) {
    const params = new URLSearchParams();
    params.set(
      "payload",
      JSON.stringify({
        ...record,
        reviewerId: reviewerId(),
        clientTs: new Date().toISOString(),
      }),
    );
    return params;
  }

  /**
   * Fire-and-forget POST for real votes (no-cors — response is opaque but body is sent).
   * sendBeacon is NOT used: GAS /exec URLs redirect internally and sendBeacon does not
   * follow redirects, so the POST would never reach doPost.
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

  /**
   * Diagnostic POST for the Test send button.
   * Uses regular cors mode so we can read the response and show it in the UI.
   * @param {string} url
   * @returns {Promise<string>}
   */
  function testPost(url) {
    return fetch(url, {
      method: "POST",
      cache: "no-cache",
      body: makeParams({ tool: "ping", note: "manual test from activity-image-slideshow" }),
    })
      .then(function (res) {
        return res.text().then(function (text) {
          return "HTTP " + res.status + ": " + text.slice(0, 300);
        });
      })
      .catch(function (err) {
        return "Error: " + String(err && err.message ? err.message : err);
      });
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
          ? "Saved. Each vote is sent to your endpoint (use Test send to verify)."
          : "Saved. Turn on the checkbox and paste a valid Web app URL to enable logging.";
      }
    });

    const testBtn = document.getElementById("btnTestCentral");
    if (testBtn) {
      testBtn.addEventListener("click", function () {
        const url = getEndpoint().trim();
        if (!url) {
          if (st) st.textContent = "Paste a Web app URL first.";
          return;
        }
        if (!isOn()) {
          if (st) st.textContent = "Turn on \u201cSend each\u2026\u201d and click Save logging settings first.";
          return;
        }
        if (st) st.textContent = "Sending\u2026";
        testPost(url).then(function (result) {
          if (!st) return;
          if (result.includes('"ok":true')) {
            st.textContent =
              "\u2713 Success \u2014 " +
              result +
              " \u00b7 Check Apps Script \u2192 Executions and your Votes sheet.";
          } else if (result.startsWith("Error:")) {
            st.textContent =
              result +
              " \u00b7 Likely cause: wrong Web app URL, or \u201cWho has access\u201d is not set to Anyone in the Apps Script deployment.";
          } else {
            st.textContent =
              result +
              " \u00b7 Unexpected response \u2014 check Apps Script \u2192 Executions for the error.";
          }
        });
      });
    }
  }

  global.VoteCentral = { submit: submit, isOn: isOn, wireForm: wireForm };
})(window);
