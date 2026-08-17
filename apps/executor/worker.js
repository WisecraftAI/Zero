/**
 * Execution farm (M4).
 *
 * Fan-out: one `execution.requested` message = one run's TC batch
 * (all cases for that run). Per-TC shards can be added later by sending
 * multiple messages with `testIds[]` and merging reports.
 *
 * Orchestrator publishes and waits for `execution.completed`.
 * This worker is the only subscriber that should call Playwright.
 *
 * Retries: ZERO_EXEC_ATTEMPTS (default 2) on thrown errors.
 * Concurrency: ZERO_EXEC_CONCURRENCY (default 2).
 */

"use strict";

const {
  EXECUTION_REQUESTED: REQUESTED,
  EXECUTION_COMPLETED: COMPLETED,
  requestExecution
} = require("@zero/domain/execution");

function startExecutionWorker({
  queue,
  runJob,
  maxConcurrent = 2,
  maxAttempts = 2,
  logger = console
}) {
  if (!queue || typeof queue.subscribe !== "function") {
    throw new Error("startExecutionWorker requires queue.subscribe");
  }
  if (typeof runJob !== "function") {
    throw new Error("startExecutionWorker requires runJob(job)");
  }

  const limit = Math.max(1, Number(maxConcurrent) || 2);
  const attempts = Math.max(1, Number(maxAttempts) || 2);
  let active = 0;
  const waiters = [];

  function acquire() {
    if (active < limit) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiters.push(resolve)).then(() => {
      active += 1;
    });
  }

  function release() {
    active = Math.max(0, active - 1);
    const next = waiters.shift();
    if (next) next();
  }

  async function handle(job) {
    const batchId = job && job.batchId;
    const runId = job && job.runId;
    if (!runId || !batchId) {
      logger.warn("[execution] execution.requested missing runId/batchId");
      return;
    }

    await acquire();
    let lastErr = null;
    try {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          const report = await runJob({ ...job, attempt });
          await queue.publish(COMPLETED, {
            batchId,
            runId,
            ok: true,
            attempt,
            report
          });
          return;
        } catch (err) {
          lastErr = err;
          logger.warn(`[execution] batch ${batchId} attempt ${attempt}/${attempts} failed: ${err.message}`);
        }
      }
      await queue.publish(COMPLETED, {
        batchId,
        runId,
        ok: false,
        error: lastErr ? lastErr.message : "execution failed"
      });
    } finally {
      release();
    }
  }

  const unsubscribe = queue.subscribe(REQUESTED, handle);
  logger.log(`[execution] subscribed to ${REQUESTED} (maxConcurrent=${limit}, maxAttempts=${attempts})`);

  return {
    topic: REQUESTED,
    completedTopic: COMPLETED,
    handle,
    unsubscribe,
    stats: () => ({ active, waiting: waiters.length, maxConcurrent: limit, maxAttempts: attempts })
  };
}

module.exports = {
  REQUESTED,
  COMPLETED,
  startExecutionWorker,
  requestExecution
};
