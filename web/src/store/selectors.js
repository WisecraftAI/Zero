import { createSelector } from '@reduxjs/toolkit';
import { isLiveRunStatus } from '../lib/runControl';
import { runsApi } from './runsApi';

const selectRunsResult = runsApi.endpoints.getRuns.select();
const selectRuns = createSelector(selectRunsResult, (result) => result.data || []);

export const selectRunById = (state, id) =>
  runsApi.endpoints.getRun.select(id)(state).data;

export const selectLiveRunIds = createSelector(selectRuns, (runs) =>
  runs
    .filter((run) => isLiveRunStatus(run.status))
    .map((run) => run.id || run.runId)
    .filter(Boolean),
);

export function selectRunPassRate(run) {
  return (
    run?.artifacts?.managerReport?.executiveSummary?.passRate
    || run?.artifacts?.executionReport?.totals?.passRate
    || null
  );
}
