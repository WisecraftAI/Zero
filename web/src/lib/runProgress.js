/** Backend stages use `done`; UI chips/CSS use `completed`. */
export function normalizeStageStatus(status) {
  if (status === 'done') return 'completed';
  return status || 'pending';
}

export function getStageKeys(run) {
  if (!run?.stages) return [];
  return Object.keys(run.stages).filter((k) => k !== 'delivery');
}

export function computeRunProgress(run) {
  const keys = getStageKeys(run);
  const total = keys.length || 1;
  let completed = 0;
  let runningKey = null;

  for (const key of keys) {
    const status = run.stages[key]?.status;
    if (status === 'done' || status === 'failed') completed += 1;
    if (status === 'running') runningKey = key;
  }

  const currentStage = runningKey ? run.stages[runningKey] : null;
  const currentLabel =
    currentStage?.label ||
    (runningKey ? runningKey : null);

  return {
    total,
    completed,
    percent: Math.min(100, Math.round((completed / total) * 100)),
    runningKey,
    currentLabel,
    isRunning: run?.status === 'running'
  };
}

export function stageDurationMs(stage, now = Date.now()) {
  if (!stage?.startedAt) return null;
  const start = new Date(stage.startedAt).getTime();
  if (Number.isNaN(start)) return null;
  const end = stage.finishedAt ? new Date(stage.finishedAt).getTime() : now;
  return Math.max(0, end - start);
}

export function runElapsedMs(run, now = Date.now()) {
  if (!run?.createdAt) return 0;
  const start = new Date(run.createdAt).getTime();
  if (Number.isNaN(start)) return 0;
  if (run.status === 'running' || run.status === 'stopping') return Math.max(0, now - start);
  const end = new Date(run.updatedAt || now).getTime();
  return Math.max(0, end - start);
}

export function formatDuration(ms) {
  if (ms == null || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  if (totalSec < 1) return '<1s';
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (min < 60) return sec ? `${min}m ${sec}s` : `${min}m`;
  const hr = Math.floor(min / 60);
  const remMin = min % 60;
  return remMin ? `${hr}h ${remMin}m` : `${hr}h`;
}
