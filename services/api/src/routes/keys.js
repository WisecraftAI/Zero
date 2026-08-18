"use strict";

module.exports = function registerKeyRoutes(app, ctx) {
  // ============== API KEY MANAGEMENT ENDPOINTS ==============

  /**
   * @swagger
   * /keys:
   *   get:
   *     summary: List all stored API keys
   *     tags: [API Keys]
   *     responses:
   *       200:
   *         description: List of API keys (masked)
   */
  app.get("/keys", ctx.rateLimiters.apiKey, (req, res) => {
    const keys = ctx.apiKeyManager.listKeys();
    res.json({ keys });
  });

  /**
   * @swagger
   * /keys:
   *   post:
   *     summary: Store a new API key
   *     tags: [API Keys]
   */
  app.post("/keys", ctx.rateLimiters.apiKey, async (req, res) => {
    const { apiKey, name, provider, ttlHours } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ error: "apiKey is required" });
    }
    
    const result = ctx.apiKeyManager.storeKey(apiKey, { name, provider, ttlHours });
    
    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }
    
    ctx.logger.addAudit("API_KEY_STORED", { keyId: result.keyId, provider: result.provider });
    res.json(result);
  });

  /**
   * @swagger
   * /keys/{keyId}:
   *   delete:
   *     summary: Delete an API key
   *     tags: [API Keys]
   */
  app.delete("/keys/:keyId", ctx.rateLimiters.apiKey, (req, res) => {
    const { keyId } = req.params;
    ctx.apiKeyManager.deleteKey(keyId);
    ctx.logger.addAudit("API_KEY_DELETED", { keyId });
    res.json({ success: true });
  });

  /**
   * @swagger
   * /keys/{keyId}/test:
   *   post:
   *     summary: Test an API key's validity
   *     tags: [API Keys]
   */
  app.post("/keys/:keyId/test", ctx.rateLimiters.apiKey, async (req, res) => {
    const { keyId } = req.params;
    const apiKey = ctx.apiKeyManager.getKey(keyId);
    
    if (!apiKey) {
      return res.status(404).json({ error: "Key not found" });
    }
    
    const result = await ctx.apiKeyManager.testKey(apiKey);
    res.json(result);
  });

  /**
   * @swagger
   * /keys/validate:
   *   post:
   *     summary: Validate an API key format without storing
   *     tags: [API Keys]
   */
  app.post("/keys/validate", ctx.rateLimiters.apiKey, (req, res) => {
    const { apiKey } = req.body;
    const result = ctx.apiKeyManager.validateKeyFormat(apiKey);
    res.json(result);
  });
};
