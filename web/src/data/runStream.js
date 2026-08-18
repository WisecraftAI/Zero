/** Merge a partial SSE state payload into the current run snapshot. */
export function mergeRunStreamState(run, patch) {
  if (!patch) return run;
  if (!run) {
    return {
      id: patch.runId,
      status: patch.status,
      stages: patch.stages || {},
      updatedAt: patch.updatedAt
    };
  }

  let stages = run.stages;
  if (patch.stages) {
    stages = { ...run.stages };
    for (const [key, stagePatch] of Object.entries(patch.stages)) {
      stages[key] = { ...run.stages?.[key], ...stagePatch };
    }
  }

  return {
    ...run,
    status: patch.status ?? run.status,
    updatedAt: patch.updatedAt ?? run.updatedAt,
    stages
  };
}

export const RUN_STREAM_POLL_MS = 2000;
export const RUN_STREAM_MAX_SSE_FAILURES = 2;
export const RUN_STREAM_ARTIFACT_DEBOUNCE_MS = 400;
