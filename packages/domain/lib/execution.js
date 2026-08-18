"use strict";

const EXECUTION_REQUESTED = "execution.requested";
const EXECUTION_COMPLETED = "execution.completed";

function requestExecution(queue, job, opts = {}) {
  const timeoutMs = Number(opts.timeoutMs || 300000);
  const batchId = job.batchId || `${job.runId}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

  return new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      unsubscribe();
      reject(new Error(`execution timed out after ${timeoutMs}ms (${batchId})`));
    }, timeoutMs);

    const unsubscribe = queue.subscribe(EXECUTION_COMPLETED, (msg) => {
      if (!msg || msg.batchId !== batchId || settled) return;
      settled = true;
      clearTimeout(timer);
      unsubscribe();
      if (msg.ok) resolve(msg.report);
      else reject(new Error(msg.error || "execution failed"));
    });

    const ready =
      typeof queue.whenSubscribed === "function"
        ? queue.whenSubscribed(EXECUTION_COMPLETED)
        : Promise.resolve();

    Promise.resolve(ready)
      .then(() => queue.publish(EXECUTION_REQUESTED, { ...job, batchId }))
      .catch((err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        unsubscribe();
        reject(err);
      });
  });
}

module.exports = {
  EXECUTION_REQUESTED,
  EXECUTION_COMPLETED,
  requestExecution,
  ...require("./executionModes"),
};
