#!/usr/bin/env node
/**
 * Orchestrator worker — consumes runs.requested. No HTTP server.
 *
 * Local in-process queue when REDIS_URL is unset (npm run start:all).
 * Compose sets REDIS_URL so this process receives jobs from the API.
 */

"use strict";

require("dotenv").config();

const { Pool } = require("pg");
const dbHelpers = require("@zero/db");
const cloud = require("@zero/cloud");
const javaSeleniumBuilder = require("@zero/builders/javaSeleniumBuilder");
const { requestExecution } = require("@zero/domain/execution");
const { createRunStore } = require("@zero/db/runStore");
const { startOrchestrator, createProcessRun } = require("./index");
const { createPipeline, setStage, hostFromUrl } = require("./pipeline");
const { createApplyLlm } = require("./applyLlm");

const selectorMemory = new Map();
const store = createRunStore({ cloud });

const pipeline = createPipeline({
  selectorMemory,
  get dbPool() {
    return store.dbPool;
  }
});

const applyLlm = createApplyLlm({
  get dbPool() {
    return store.dbPool;
  },
  get dbEnabled() {
    return store.dbEnabled;
  }
});

async function enqueueExecution(runId, opts = false) {
  const options = opts && typeof opts === "object" ? opts : { rerunFailedOnly: Boolean(opts) };
  return requestExecution(
    cloud.queue,
    {
      runId,
      rerunFailedOnly: Boolean(options.rerunFailedOnly),
      kind: options.kind || "execution"
    },
    { timeoutMs: Number(process.env.ZERO_EXEC_TIMEOUT_MS || 300000) }
  );
}

const processRun = createProcessRun({
  getRun: store.getRun,
  persistRun: store.persistRun,
  persistAssets: store.persistAssets,
  setStage,
  applyLlm,
  consolidateRequirements: pipeline.consolidateRequirements,
  generateCasesFromUploadedOnly: pipeline.generateCasesFromUploadedOnly,
  generateCasesFromManualInput: pipeline.generateCasesFromManualInput,
  generateCasesFromUrlAnalysis: pipeline.generateCasesFromUrlAnalysis,
  generateManualCases: pipeline.generateManualCases,
  generateAutomationBundle: pipeline.generateAutomationBundle,
  hostFromUrl,
  enqueueExecution,
  generateManagerReport: pipeline.generateManagerReport,
  generateDeliveryReport: pipeline.generateDeliveryReport,
  javaSeleniumBuilder,
  dbHelpers,
  get dbEnabled() {
    return store.dbEnabled;
  },
  get dbPool() {
    return store.dbPool;
  }
});

async function boot() {
  if (dbHelpers.isDatabaseConfigured()) {
    try {
      const pool = new Pool({
        connectionString: process.env.DATABASE_URL || undefined,
        host: process.env.PGHOST || undefined,
        connectionTimeoutMillis: 5000
      });
      await dbHelpers.initAllTables(pool);
      store.setPool(pool);
    } catch (e) {
      console.warn("Orchestrator: Postgres unavailable:", e.message);
    }
  }

  startOrchestrator({
    queue: cloud.queue,
    cache: cloud.cache,
    processRun,
    maxConcurrent: Number(process.env.ZERO_ORCH_CONCURRENCY || 2)
  });
  console.log("Orchestrator subscribed to runs.requested (no HTTP)");
}

if (require.main === module) {
  boot().catch((err) => {
    console.error("Orchestrator failed to start:", err);
    process.exit(1);
  });
}

module.exports = { boot, processRun };
