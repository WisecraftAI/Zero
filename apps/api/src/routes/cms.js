"use strict";

const express = require("express");

function stationSlugFromCmsUrl(url) {
  const m = String(url).match(/\/gm\/([^/]+)\//i);
  return m ? m[1].toLowerCase().replace(/[^a-z0-9-_]/g, "_") : "station";
}

module.exports = function registerCmsRoutes(app, ctx) {
  app.post("/api/capture-cms-screenshot", express.json({ limit: "32kb" }), async (req, res) => {
    const url = String(req.body?.url || "").trim();
    if (!url || !/^https?:\/\//i.test(url)) {
      return res.status(400).json({ error: "Provide a valid http(s) URL (e.g. Gray CMS LiveOps playout page)." });
    }
    const stationLabel = String(req.body?.stationLabel || stationSlugFromCmsUrl(url) || "cms")
      .replace(/[^a-zA-Z0-9-_]/g, "_")
      .slice(0, 48) || "cms";
    const waitMs = Math.min(45000, Math.max(3000, Number(req.body?.waitMs) || 8000));
    const fullPage = req.body?.fullPage !== false;
    const showBrowser = Boolean(req.body?.showBrowser);
    const streamTab = req.body?.streamTab !== false;

    try {
      const result = await ctx.requestExecution(
        ctx.cloud.queue,
        {
          runId: `cms-${Date.now()}`,
          kind: "cms-screenshot",
          url,
          stationLabel,
          waitMs,
          fullPage,
          showBrowser,
          streamTab
        },
        { timeoutMs: 180000 }
      );
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message || "Screenshot failed" });
    }
  });

  app.post("/api/capture-cms-signal-bulk", express.json({ limit: "1mb" }), async (req, res) => {
    let urls = [];
    if (typeof req.body?.urls === "string") {
      urls = req.body.urls.split(/\r?\n/).map((s) => s.trim()).filter((u) => /^https?:\/\//i.test(u));
    } else if (Array.isArray(req.body?.urls)) {
      urls = req.body.urls.map((u) => String(u).trim()).filter((u) => /^https?:\/\//i.test(u));
    }
    if (!urls.length) {
      return res.status(400).json({ error: "Paste one Gray CMS URL per line (each station’s playout URL)." });
    }
    if (urls.length > 80) {
      return res.status(400).json({ error: "Maximum 80 URLs per batch." });
    }
    const waitMs = Math.min(45000, Math.max(3000, Number(req.body?.waitMs) || 6000));
    const showBrowser = Boolean(req.body?.showBrowser);
    const streamTab = req.body?.streamTab !== false;

    try {
      const result = await ctx.requestExecution(
        ctx.cloud.queue,
        {
          runId: `cms-bulk-${Date.now()}`,
          kind: "cms-bulk",
          urls,
          waitMs,
          showBrowser,
          streamTab
        },
        { timeoutMs: 600000 }
      );
      return res.json(result);
    } catch (e) {
      return res.status(500).json({ error: e.message || "Bulk capture failed" });
    }
  });
};
