"use strict";

module.exports = function registerHealthRoutes(app, ctx) {
  // ============== HEALTH & SYSTEM ENDPOINTS ==============

  /**
   * @swagger
   * /health:
   *   get:
   *     summary: Basic health check
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Service is healthy
   */
  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "ZER0", storage: ctx.dbEnabled ? "postgres+memory" : "memory" });
  });

  /**
   * @swagger
   * /health/detailed:
   *   get:
   *     summary: Detailed health check with system metrics
   *     tags: [Health]
   */
  app.get("/health/detailed", ctx.cacheMiddleware(30), (_req, res) => {
    const memUsage = process.memoryUsage();
    res.json({
      ok: true,
      service: "ZER0 QA Orchestrator",
      version: "2.0.0",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      storage: ctx.dbEnabled ? "postgres+memory" : "memory",
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024) + "MB",
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024) + "MB",
        rss: Math.round(memUsage.rss / 1024 / 1024) + "MB"
      },
      activeRuns: ctx.runs.size,
      features: {
        urlAnalyzerPro: true,
        domainDetection: true,
        brdGeneration: true,
        apiKeyManagement: true,
        rateLimiting: true
      }
    });
  });
};
