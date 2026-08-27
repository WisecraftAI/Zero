"use strict";

const CANCEL_TTL_SEC = 86400;

function cancelCacheKey(runId) {
  return `cancel.${runId}`;
}

class RunStoppedError extends Error {
  constructor(message = "Stopped by operator") {
    super(message);
    this.name = "RunStoppedError";
    this.code = "RUN_STOPPED";
  }
}

function isRunStoppedError(err) {
  if (!err) return false;
  return err.code === "RUN_STOPPED" || err.name === "RunStoppedError";
}

function isStoppableStatus(status) {
  return status === "queued" || status === "running" || status === "stopping";
}

function isTerminalStatus(status) {
  return status === "completed" || status === "failed" || status === "stopped";
}

async function requestRunCancel(cache, runId, payload = {}) {
  if (!cache || typeof cache.set !== "function" || !runId) return;
  const body = { requestedAt: new Date().toISOString(), ...payload };
  await cache.set(cancelCacheKey(runId), body, CANCEL_TTL_SEC);
}

async function isRunCancelRequested(cache, runId) {
  if (!cache || typeof cache.get !== "function" || !runId) return false;
  try {
    return Boolean(await cache.get(cancelCacheKey(runId)));
  } catch {
    return false;
  }
}

async function applyCancelToRun(run, cache) {
  if (!run || !run.id) return run;
  const flagged = run.cancelRequested || (await isRunCancelRequested(cache, run.id));
  if (!flagged) return run;
  run.cancelRequested = true;
  if (run.status === "running" || run.status === "queued") {
    run.status = "stopping";
  }
  return run;
}

function markRunStopped(run, setStage, stageKeys) {
  if (!run) return run;
  run.cancelRequested = true;
  run.status = "stopped";
  run.error = run.error || "Stopped by operator";
  run.updatedAt = new Date().toISOString();
  if (typeof setStage === "function" && Array.isArray(stageKeys)) {
    for (const key of stageKeys) {
      if (run.stages?.[key]?.status === "running") {
        setStage(run, key, "stopped");
        break;
      }
    }
  }
  return run;
}

module.exports = {
  CANCEL_TTL_SEC,
  cancelCacheKey,
  RunStoppedError,
  isRunStoppedError,
  isStoppableStatus,
  isTerminalStatus,
  requestRunCancel,
  isRunCancelRequested,
  applyCancelToRun,
  markRunStopped
};
