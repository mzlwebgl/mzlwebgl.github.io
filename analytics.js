(function () {
  const ENDPOINT = "https://api.minzl.com/v1/analytics/home";

  function getOrCreate(key, gen) {
    let v = localStorage.getItem(key);
    if (!v) {
      v = gen();
      localStorage.setItem(key, v);
    }
    return v;
  }

  const visitor_id = getOrCreate("mzl_visitor_id", () => crypto.randomUUID());
  const session_id = getOrCreate("mzl_session_id", () => crypto.randomUUID());

  function send(payload) {
    const data = JSON.stringify(payload);
    try {
      navigator.sendBeacon(
        ENDPOINT,
        new Blob([data], { type: "application/json" })
      );
    } catch {
      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true
      }).catch(() => { });
    }
  }

  const enterTime = Date.now();

  send({
    event_type: "page_view",
    visitor_id,
    session_id,
    page_url: location.href,
    page_path: location.pathname,
    referrer: document.referrer || ""
  });

  function reportDwell() {
    send({
      event_type: "page_view",
      visitor_id,
      session_id,
      page_url: location.href,
      page_path: location.pathname,
      referrer: document.referrer || "",
      dwell_time_ms: Date.now() - enterTime
    });
  }

  window.addEventListener("pagehide", reportDwell);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") reportDwell();
  });

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!a) return;

      let module = "link";
      const href = a.getAttribute("href") || "";

      if (href.startsWith("#")) module = "anchor";
      else if (href.includes("/projects/")) module = "project.card";
      else if (href.endsWith(".pdf")) module = "download.pdf";

      send({
        event_type: "click",
        visitor_id,
        session_id,
        page_url: location.href,
        page_path: location.pathname,
        module,
        label: (a.textContent || "").trim().slice(0, 100),
        target_url: a.href
      });
    },
    true
  );
})();
