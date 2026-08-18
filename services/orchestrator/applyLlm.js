"use strict";

const dbHelpers = require("@zero/db");
const llm = require("./llm");
const encryption = require("./encryption");

function createLlmStore(run, deps) {
  const userEmail = llm.ownerEmailForRun(run);
  return {
    userEmail,
    async getSettings(agent) {
      const dbPool = deps.getDbPool && deps.getDbPool();
      const dbEnabled = deps.getDbEnabled && deps.getDbEnabled();
      if (dbEnabled && dbPool) {
        const rows = await dbHelpers.listAgentSettings(dbPool, userEmail);
        return rows.find((r) => r.agent === agent) || null;
      }
      if (deps.memoryAgentSettings) {
        return deps.memoryAgentSettings.get(`${userEmail}:${agent}`) || null;
      }
      return null;
    },
    async getKey(provider) {
      const fromEnv = llm.envKey(provider);
      if (fromEnv) return fromEnv;
      const dbPool = deps.getDbPool && deps.getDbPool();
      const dbEnabled = deps.getDbEnabled && deps.getDbEnabled();
      let encrypted = null;
      if (dbEnabled && dbPool) {
        encrypted = await dbHelpers.getEncryptedProviderKey(dbPool, userEmail, provider);
      }
      if (!encrypted && deps.memoryProviderKeys) {
        const row = deps.memoryProviderKeys.get(`${userEmail}:${provider}`);
        encrypted = row && row.encrypted_key;
      }
      return encrypted ? encryption.decrypt(encrypted) : null;
    }
  };
}

function createApplyLlm(deps) {
  return async function applyLlm(agent, template, run, context) {
    return llm.enrichAgent({
      agent,
      template,
      context,
      store: createLlmStore(run, deps),
      runId: run && run.id
    });
  };
}

module.exports = { createApplyLlm };
