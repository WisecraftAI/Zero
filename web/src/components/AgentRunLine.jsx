import { ZeroMark } from './ZeroLogo';
import { getStageKeys, normalizeStageStatus } from '../lib/runProgress';
import './AgentRunLine.scss';

/**
 * The ZERO mark walking the pipeline as a single line: ticks are stages, the
 * fill is ground covered, and the mark rides the head of the fill.
 *
 * Position is real stage progress, not a decorative loop — the mark stands on
 * the stage being worked and slides to the next one as stages land, so ticks
 * sit at stage midpoints and line up with the pipeline row below. Perpetual
 * motion (stride, halo, forward scan) runs only while the pipeline is live, so
 * a finished run is visibly still.
 */

const LIVE = new Set(['running', 'stopping']);

function trackState(status) {
  if (LIVE.has(status)) return status;
  if (status === 'completed') return 'completed';
  if (status === 'failed') return 'failed';
  if (status === 'stopped') return 'stopped';
  return 'pending';
}

export default function AgentRunLine({ run }) {
  if (!run) return null;

  const status = run.status || 'pending';
  const state = trackState(status);

  const keys = getStageKeys(run);
  const total = keys.length || 1;
  const stages = keys.map((key, i) => ({
    key,
    status: normalizeStageStatus(run.stages[key]?.status),
    label: run.stages[key]?.label || key,
    at: ((i + 0.5) / total) * 100,
  }));

  const runningIdx = stages.findIndex((s) => s.status === 'running');
  const failedIdx = stages.findIndex((s) => s.status === 'failed');
  const settled = stages.filter((s) => s.status === 'completed' || s.status === 'skipped').length;

  // Stand on the stage that owns the run right now; between stages, park at the
  // edge of the ground already covered.
  const fraction = state === 'completed' ? 1
    : runningIdx >= 0 ? (runningIdx + 0.5) / total
      : failedIdx >= 0 ? (failedIdx + 0.5) / total
        : settled / total;
  const position = Math.min(100, Math.max(0, fraction * 100));

  const live = LIVE.has(status);

  return (
    <div
      className={`agent-run-line agent-run-line--${state}`}
      style={{ '--agent-pos': `${position}%` }}
      aria-hidden="true"
    >
      <div className="agent-run-line-track">
        <div className="agent-run-line-fill" />
        {live && <div className="agent-run-line-scan" />}
        {stages.map((stage) => (
          <span
            key={stage.key}
            className={`agent-run-line-tick is-${stage.status}`}
            style={{ '--tick-at': `${stage.at}%` }}
            title={stage.label}
          />
        ))}

        <div className="agent-run-line-runner">
          <span className="agent-run-line-halo" />
          <ZeroMark size={20} className="agent-run-line-mark" />
        </div>
      </div>
    </div>
  );
}
