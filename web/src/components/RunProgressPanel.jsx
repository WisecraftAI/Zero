import { useEffect, useState } from 'react';
import {
  computeRunProgress,
  formatDuration,
  runElapsedMs,
  stageDurationMs
} from '../lib/runProgress';
import './RunProgressPanel.css';

export default function RunProgressPanel({ run, streamTransport }) {
  const [now, setNow] = useState(() => Date.now());

  const isLive = run?.status === 'running';
  useEffect(() => {
    if (!isLive) return undefined;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  if (!run) {
    return (
      <div className="run-progress run-progress--loading" aria-live="polite">
        <div className="run-progress-bar run-progress-bar--indeterminate">
          <div className="run-progress-fill run-progress-fill--pulse" />
        </div>
        <p className="run-progress-msg">Connecting to pipeline…</p>
      </div>
    );
  }

  const progress = computeRunProgress(run);
  const elapsed = formatDuration(runElapsedMs(run, now));
  const runningStage = progress.runningKey ? run.stages[progress.runningKey] : null;
  const stageElapsed = runningStage
    ? formatDuration(stageDurationMs(runningStage, now))
    : null;

  const transportLabel =
    streamTransport === 'sse'
      ? 'Live updates'
      : streamTransport === 'poll'
        ? 'Polling'
        : isLive
          ? 'Updating'
          : null;

  return (
    <div className={`run-progress run-progress--${run.status || 'pending'}`} aria-live="polite">
      <div className="run-progress-top">
        <div className="run-progress-stats">
          <span className="run-progress-elapsed" title="Total run time">
            {isLive ? 'Elapsed' : 'Total time'}: <strong>{elapsed}</strong>
          </span>
          <span className="run-progress-stages">
            Stage <strong>{Math.min(progress.completed + (progress.runningKey ? 1 : 0), progress.total)}</strong>
            {' '}of <strong>{progress.total}</strong>
          </span>
          {transportLabel && isLive && (
            <span className="run-progress-live">
              <span className="run-progress-live-dot" />
              {transportLabel}
            </span>
          )}
        </div>
        <span className="run-progress-pct">{progress.percent}%</span>
      </div>

      <div className="run-progress-bar" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`run-progress-fill${isLive && progress.percent < 100 ? ' run-progress-fill--active' : ''}`}
          style={{ width: `${progress.percent}%` }}
        />
      </div>

      {isLive && progress.currentLabel && (
        <p className="run-progress-msg">
          <SpinIcon />
          <span>
            <strong>{progress.currentLabel}</strong>
            {stageElapsed ? ` · ${stageElapsed} on this stage` : ' · in progress'}
          </span>
        </p>
      )}

      {!isLive && run.status === 'completed' && (
        <p className="run-progress-msg run-progress-msg--done">
          Pipeline finished in <strong>{elapsed}</strong>
          {run.artifacts?.executionReport?.totals?.passRate != null && (
            <> · Pass rate <strong>{run.artifacts.executionReport.totals.passRate}</strong></>
          )}
        </p>
      )}

      {!isLive && run.status === 'failed' && (
        <p className="run-progress-msg run-progress-msg--fail">
          Run failed after <strong>{elapsed}</strong>
          {run.error ? ` · ${run.error}` : ''}
        </p>
      )}
    </div>
  );
}

function SpinIcon() {
  return (
    <svg className="run-progress-spin" width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 10" />
    </svg>
  );
}
