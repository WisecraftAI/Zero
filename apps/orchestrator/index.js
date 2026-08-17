/**
 * Queue-triggered orchestrator. Consumes runs.requested and runs processRun
 * with a concurrency cap. Local in-process queue is enough for single-node M3.
 */

"use strict";

const TOPIC = "runs.requested";

function startOrchestrator({
  queue,
  cache,
  processRun,
  maxConcurrent = 2,
  logger = console
}) {
  if (!queue || typeof queue.subscribe !== "function") {
    throw new Error("startOrchestrator requires queue.subscribe");
  }
  if (typeof processRun !== "function") {
    throw new Error("startOrchestrator requires processRun(runId)");
  }

  const limit = Math.max(1, Number(maxConcurrent) || 2);
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

  async function handle(msg) {
    const runId = msg && msg.runId;
    if (!runId) {
      logger.warn("[orchestrator] runs.requested missing runId");
      return;
    }
    await acquire();
    try {
      if (cache && typeof cache.publish === "function") {
        await cache.publish(`state.${runId}`, {
          runId,
          status: "running",
          source: "orchestrator"
        });
      }
      await processRun(runId);
    } catch (err) {
      logger.error(`[orchestrator] processRun ${runId} failed:`, err.message);
      if (cache && typeof cache.publish === "function") {
        await cache.publish(`state.${runId}`, {
          runId,
          status: "failed",
          error: err.message,
          source: "orchestrator"
        });
      }
    } finally {
      release();
    }
  }

  const unsubscribe = queue.subscribe(TOPIC, handle);
  logger.log(`[orchestrator] subscribed to ${TOPIC} (maxConcurrent=${limit})`);

  return {
    topic: TOPIC,
    handle,
    unsubscribe,
    stats: () => ({ active, waiting: waiters.length, maxConcurrent: limit })
  };
}

const { createProcessRun } = require("./processRun");

module.exports = {
  TOPIC,
  startOrchestrator,
  createProcessRun
};
