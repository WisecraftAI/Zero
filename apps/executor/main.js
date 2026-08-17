#!/usr/bin/env node
/**
 * Playwright executor — consumes execution.requested. No HTTP server.
 *
 *   EXECUTION_WORKER_ONLY=1 node apps/executor/main.js
 *
 * Local in-process queue is used when REDIS_URL is unset (npm start co-locates
 * this worker). Compose sets REDIS_URL so this process receives jobs from the API.
 */

"use strict";

require("dotenv").config();

process.env.EXECUTION_WORKER_ONLY = process.env.EXECUTION_WORKER_ONLY || "1";

const { Pool } = require("pg");
const dbHelpers = require("@zero/db");
const cloud = require("@zero/cloud");
const urlAnalyzerPro = require("@zero/analyzer/urlAnalyzerPro");
const { startExecutionWorker } = require("./worker");
const { createJobs } = require("./jobs");
const { createRunStore } = require("./runStore");
const { captureCmsScreenshot, captureCmsSignalBulk } = require("./cmsCapture");

function hostFromUrl(value) {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return "";
  }
}

const selectorMemory = new Map();
const store = createRunStore();

const jobs = createJobs({
  cloud,
  selectorMemory,
  async getRunSecret(runId) {
    try {
      const fromCache = await cloud.cache.get(`runSecret.${runId}`);
      if (fromCache) return fromCache;
    } catch {
      // ignore
    }
    return { username: "", password: "" };
  },
  urlAnalyzerPro,
  dbHelpers,
  get dbPool() {
    return store.dbPool;
  },
  hostFromUrl
});

async function runJob(job) {
  const kind = job.kind || "execution";
  if (kind === "cms-screenshot") {
    return captureCmsScreenshot(job, { cloud, artifactsRoot: store.artifactsRoot });
  }
  if (kind === "cms-bulk") {
    return captureCmsSignalBulk(job, { cloud, artifactsRoot: store.artifactsRoot });
  }

  const run = await store.getRun(job.runId);
  if (!run) throw new Error(`Run not found: ${job.runId}`);

  let result;
  if (kind === "webAnalyzer") {
    result = await jobs.generateWebAnalysis(run);
    run.artifacts.webAnalysis = result;
  } else if (kind === "accessibility") {
    result = await jobs.generateAccessibilityReport(run);
    run.artifacts.accessibilityReport = result;
  } else if (kind === "performance") {
    result = await jobs.generatePerformanceReport(run);
    run.artifacts.performanceReport = result;
  } else if (kind === "security") {
    result = await jobs.generateSecurityReport(run);
    run.artifacts.securityReport = result;
  } else {
    result = await jobs.generateExecutionReport(run, Boolean(job.rerunFailedOnly));
    run.artifacts.executionReport = result;
  }
  await store.persistRun(run);
  return result;
}

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
      console.warn("Executor: Postgres unavailable:", e.message);
    }
  }

  startExecutionWorker({
    queue: cloud.queue,
    runJob,
    maxConcurrent: Number(process.env.ZERO_EXEC_CONCURRENCY || 2),
    maxAttempts: Number(process.env.ZERO_EXEC_ATTEMPTS || 2)
  });
  console.log("Executor subscribed to execution.requested (no HTTP)");
}

if (require.main === module) {
  boot().catch((err) => {
    console.error("Executor failed to start:", err);
    process.exit(1);
  });
}

module.exports = { runJob, boot };
