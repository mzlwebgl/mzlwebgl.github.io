(function () {
    if (window.__mzl_analytics_initialized__) {
    return;
  }
  window.__mzl_analytics_initialized__ = true;
  
  const ENDPOINT = "https://api.minzl.com/v1/collect/home";

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
    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "omit"
    }).catch(() => {});
  }

  const enterTime = Date.now();
  let viewSent = false;
  let exitSent = false;

  function basePayload() {
    return {
      visitor_id,
      session_id,
      page_url: location.href,
      page_path: location.pathname,
      referrer: document.referrer || ""
    };
  }

  window.addEventListener("load", () => {
    if (viewSent) return;
    viewSent = true;

    send({
      event_type: "page_view",
      ...basePayload()
    });
  });

  function reportExitOnce() {
    if (exitSent) return;
    exitSent = true;

    send({
      event_type: "page_exit",
      ...basePayload(),
      dwell_time_ms: Date.now() - enterTime
    });
  }

  window.addEventListener("beforeunload", reportExitOnce);

  function classifyClick(a) {
    const tagged = a.getAttribute("data-track");
    if (tagged) return tagged;

    const hrefAttr = a.getAttribute("href") || "";
    const href = a.href || "";

    if (hrefAttr.startsWith("#")) return null;
    if (hrefAttr.startsWith("mailto:") || hrefAttr.startsWith("tel:")) return "contact";
    if (hrefAttr.toLowerCase().endsWith(".pdf") || href.toLowerCase().includes(".pdf")) return "download.pdf";
    if (href.includes("/projects/")) return "project.card";

    try {
      const u = new URL(href, location.href);
      if (u.origin !== location.origin) return "outbound";
    } catch (_) {}

    return null;
  }

  document.addEventListener(
    "click",
    (e) => {
      const a = e.target.closest("a");
      if (!a) return;
      if (e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      const module = classifyClick(a);
      if (!module) return;

      send({
        event_type: "click",
        ...basePayload(),
        module,
        label: (a.textContent || "").trim().slice(0, 100),
        target_url: a.href
      });
    },
    true
  );
})();





