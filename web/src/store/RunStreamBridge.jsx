import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { mergeRunStreamState } from '../data/runStream';
import { useRunStream } from '../data/useRunStream';
import { isTerminalRunStatus } from '../lib/runControl';
import { runsApi } from './runsApi';

export default function RunStreamBridge({ runId, run, children }) {
  const dispatch = useDispatch();

  const handlePatch = useCallback((patch) => {
    dispatch(
      runsApi.util.updateQueryData('getRun', runId, (draft) =>
        mergeRunStreamState(draft, patch)),
    );
  }, [dispatch, runId]);

  const handleRefresh = useCallback(() => {
    dispatch(runsApi.util.invalidateTags([{ type: 'Run', id: runId }]));
  }, [dispatch, runId]);

  const { transport } = useRunStream(runId, {
    enabled: Boolean(runId),
    terminal: isTerminalRunStatus(run?.status),
    onPatch: handlePatch,
    onRefresh: handleRefresh,
  });

  return typeof children === 'function' ? children(transport) : null;
}
