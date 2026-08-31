import { computeRunProgress } from '../lib/runProgress';
import RunElapsed from './RunElapsed';
import './RunProgressPanel.scss';

export default function RunProgressPanel({ run, streamTransport }) {
  const isLive = run?.status === 'running';
  const isStopping = run?.status === 'stopping';

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
  const runningStage = progress.runningKey ? run.stages[progress.runningKey] : null;

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
            {isLive ? 'Elapsed' : 'Total time'}: <strong><RunElapsed run={run} /></strong>
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
            {' · '}
            <RunElapsed stage={runningStage} suffix=" on this stage" fallback="in progress" />
          </span>
        </p>
      )}

      {!isLive && !isStopping && run.status === 'completed' && (
        <p className="run-progress-msg run-progress-msg--done">
          Pipeline finished in <strong><RunElapsed run={run} /></strong>
          {run.artifacts?.executionReport?.totals?.passRate != null && (
            <> · Pass rate <strong>{run.artifacts.executionReport.totals.passRate}</strong></>
          )}
        </p>
      )}

      {!isLive && isStopping && (
        <p className="run-progress-msg">
          <SpinIcon />
          <span>Stopping pipeline…</span>
        </p>
      )}

      {!isLive && run.status === 'stopped' && (
        <p className="run-progress-msg run-progress-msg--fail">
          Run stopped after <strong><RunElapsed run={run} /></strong>
        </p>
      )}

      {!isLive && !isStopping && run.status === 'failed' && (
        <p className="run-progress-msg run-progress-msg--fail">
          Run failed after <strong><RunElapsed run={run} /></strong>
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
