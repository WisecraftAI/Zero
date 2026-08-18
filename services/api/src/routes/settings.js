"use strict";

module.exports = function registerSettingsRoutes(app, ctx) {
  /* ─── Provider API Keys ──────────────────────────────────── */
  const ALLOWED_PROVIDERS = ["claude", "openai", "gemini"];

  function getUserEmail(req) {
    return ctx.auth.identityEmail(req.auth);
  }

  app.get("/provider-keys", async (req, res) => {
    try {
      const userEmail = getUserEmail(req);
      let rows = [];

      if (ctx.dbEnabled && ctx.dbPool) {
        rows = await ctx.dbHelpers.listProviderKeys(ctx.dbPool, userEmail);
      } else {
        // Fallback memory lookup
        rows = ALLOWED_PROVIDERS.map(provider => ctx.memoryProviderKeys.get(`${userEmail}:${provider}`))
          .filter(Boolean);
      }

      const byProvider = {};
      for (const r of rows) byProvider[r.provider] = r;

      const items = ALLOWED_PROVIDERS.map(provider => {
        const r = byProvider[provider];
        return {
          provider,
          configured: !!r,
          last4: r?.last_4 || null,
          masked: r?.last_4 ? `••••••••••••${r.last_4}` : null,
          createdAt: r?.created_at || null,
          updatedAt: r?.updated_at || null,
          lastUsedAt: r?.last_used_at || null
        };
      });
      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/provider-keys/:provider", async (req, res) => {
    const provider = String(req.params.provider || "").toLowerCase();
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: `Unknown provider. Use one of: ${ALLOWED_PROVIDERS.join(", ")}` });
    }
    const key = (req.body?.key || "").toString().trim();
    if (!key) return res.status(400).json({ error: "Field 'key' is required." });

    try {
      const userEmail = getUserEmail(req);
      const encryptedKey = ctx.encryption.encrypt(key);
      const last4 = ctx.encryption.lastFour(key);

      if (ctx.dbEnabled && ctx.dbPool) {
        await ctx.dbHelpers.upsertProviderKey(ctx.dbPool, { userEmail, provider, encryptedKey, last4 });
      } else {
        const compositeKey = `${userEmail}:${provider}`;
        const existing = ctx.memoryProviderKeys.get(compositeKey);
        ctx.memoryProviderKeys.set(compositeKey, {
          provider,
          encrypted_key: encryptedKey,
          last_4: last4,
          created_at: existing?.created_at || new Date().toISOString(),
          updated_at: new Date().toISOString()
        });
      }

      return res.json({ ok: true, provider, masked: `••••••••••••${last4}`, last4 });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.delete("/provider-keys/:provider", async (req, res) => {
    const provider = String(req.params.provider || "").toLowerCase();
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      return res.status(400).json({ error: "Unknown provider." });
    }
    try {
      const userEmail = getUserEmail(req);
      if (ctx.dbEnabled && ctx.dbPool) {
        await ctx.dbHelpers.deleteProviderKey(ctx.dbPool, userEmail, provider);
      } else {
        ctx.memoryProviderKeys.delete(`${userEmail}:${provider}`);
      }
      return res.json({ ok: true, provider });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  /* ─── Agent Settings (model + prompt per LLM-driven agent) ── */
  const ALLOWED_AGENTS = ["ba", "manualQa", "automationQa", "manager"];

  app.get("/agent-settings", async (req, res) => {
    try {
      const userEmail = getUserEmail(req);
      let rows = [];

      if (ctx.dbEnabled && ctx.dbPool) {
        rows = await ctx.dbHelpers.listAgentSettings(ctx.dbPool, userEmail);
      } else {
        rows = ALLOWED_AGENTS.map(agent => ctx.memoryAgentSettings.get(`${userEmail}:${agent}`))
          .filter(Boolean);
      }

      const byAgent = {};
      for (const r of rows) byAgent[r.agent] = r;

      const items = ALLOWED_AGENTS.map(agent => ({
        agent,
        provider: byAgent[agent]?.provider || null,
        model: byAgent[agent]?.model || null,
        prompt: byAgent[agent]?.prompt || null,
        updatedAt: byAgent[agent]?.updated_at || null
      }));
      return res.json({ items });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });

  app.put("/agent-settings/:agent", async (req, res) => {
    const agent = String(req.params.agent || "");
    if (!ALLOWED_AGENTS.includes(agent)) {
      return res.status(400).json({ error: `Unknown agent. Use one of: ${ALLOWED_AGENTS.join(", ")}` });
    }
    const { provider, model, prompt } = req.body || {};
    if (provider && !ALLOWED_PROVIDERS.includes(String(provider).toLowerCase())) {
      return res.status(400).json({ error: "Unknown provider for agent." });
    }

    try {
      const userEmail = getUserEmail(req);
      const normalizedProvider = provider ? String(provider).toLowerCase() : null;

      if (ctx.dbEnabled && ctx.dbPool) {
        await ctx.dbHelpers.upsertAgentSettings(ctx.dbPool, {
          userEmail,
          agent,
          provider: normalizedProvider,
          model: model || null,
          prompt: prompt || null
        });
      } else {
        ctx.memoryAgentSettings.set(`${userEmail}:${agent}`, {
          agent,
          provider: normalizedProvider,
          model: model || null,
          prompt: prompt || null,
          updated_at: new Date().toISOString()
        });
      }

      return res.json({ ok: true, agent });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  });
};
