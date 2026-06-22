/**
 * Optional central logging for static GitHub Pages builds.
 * POSTs JSON as text/plain (no-cors) to a URL you control (e.g. Google Apps Script web app).
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
   * Fire-and-forget POST. Uses no-cors so the browser will not expose the response body
   * (Google Apps Script and many loggers still receive the request).
   * @param {Record<string, unknown>} record
   */
  function submit(record) {
    if (!isOn()) return;
    const url = getEndpoint();
    const body = JSON.stringify({
      ...record,
      reviewerId: reviewerId(),
      clientTs: new Date().toISOString(),
    });
    fetch(url, {
      method: "POST",
      mode: "no-cors",
      cache: "no-cache",
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body,
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
          ? "Saved. Each vote is sent to your endpoint (browser cannot confirm delivery — check the sheet)."
          : "Saved. Turn on the checkbox and paste a valid Web app URL to enable logging.";
      }
    });
  }

  global.VoteCentral = { submit: submit, isOn: isOn, wireForm: wireForm };
})(window);
