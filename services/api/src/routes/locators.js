"use strict";

module.exports = function registerLocatorRoutes(app, ctx) {
  app.post("/element-log", async (req, res) => {
    if (!ctx.dbEnabled || !ctx.dbPool) {
      return res.status(503).json({ error: "PostgreSQL required for element logging. Set DATABASE_URL or PGHOST." });
    }
    try {
      const payload = req.body || {};
      const runId = payload.runId || null;
      const result = await ctx.elementLogger.processElementLog(ctx.dbPool, payload, runId);
      if (!result.ok) return res.status(400).json(result);
      return res.status(201).json(result);
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.get("/locators", async (req, res) => {
    const host = String(req.query.host || "").trim().toLowerCase();
    if (!host) return res.status(400).json({ error: "Query 'host' is required (e.g. ?host=app.example.com)" });
    if (!ctx.dbEnabled || !ctx.dbPool) {
      return res.json({ source: "memory", host, locators: {} });
    }
    try {
      const locators = await ctx.dbHelpers.getLocatorsByHost(ctx.dbPool, host);
      return res.json({ source: "postgres", host, locators });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
};
