#!/usr/bin/env node
/**
 * Execution-farm worker. Playwright lives here — not on the API request path.
 *
 *   EXECUTION_WORKER_ONLY=1 node workers/execution.js
 *
 * Local queue is in-process, so a split worker only receives jobs when
 * ZERO_CLOUD provides a shared queue (M7). Default `npm start` runs this
 * subscriber in the same process as the API + orchestrator.
 */

"use strict";

process.env.EXECUTION_WORKER_ONLY = process.env.EXECUTION_WORKER_ONLY || "1";
require("../server.js");
