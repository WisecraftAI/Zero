#!/usr/bin/env node
"use strict";

/**
 * Explicit local compatibility launcher.
 *
 * Production and Compose run API, orchestrator, and executor as separate
 * processes. This launcher keeps the no-Redis developer path available while
 * making the co-location visible instead of hiding it in apps/api/server.js.
 */

const { boot: bootOrchestrator } = require("../apps/orchestrator/worker");
const { boot: bootExecutor } = require("../apps/executor/main");

Promise.all([bootOrchestrator(), bootExecutor()])
  .then(() => {
    require("../apps/api/server");
  })
  .catch((err) => {
    console.error("Local stack failed to start:", err);
    process.exit(1);
  });
