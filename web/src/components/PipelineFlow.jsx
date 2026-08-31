import {
  normalizeStageStatus
} from '../lib/runProgress';
import RunElapsed from './RunElapsed';
import './PipelineFlow.scss';

const STAGE_META = {
  webAnalyzer:   { label: 'Web Analyzer', short: 'WEB', optional: true },
  ba:            { label: 'BA Agent',      short: 'BA' },
  manualQa:      { label: 'Manual QA',     short: 'MQA' },
  automationQa:  { label: 'Automation',    short: 'AUTO' },
  execution:     { label: 'Execution',     short: 'EXEC' },
  accessibility: { label: 'Accessibility', short: 'A11Y', optional: true },
  performance:   { label: 'Performance',   short: 'PERF', optional: true },
  security:      { label: 'Security',      short: 'SEC', optional: true },
  manager:       { label: 'Manager',       short: 'MGR' },
};

const BASE_ORDER = ['webAnalyzer', 'ba', 'manualQa', 'automationQa', 'execution', 'manager'];

export default function PipelineFlow({ run }) {
  const stages = run?.stages;

  const visibleKeys = (() => {
    if (!stages) return BASE_ORDER;
    const keys = Object.keys(stages).filter(k => k !== 'delivery');
    const ordered = [...BASE_ORDER.filter(k => keys.includes(k))];
    const extras = keys.filter(k => !BASE_ORDER.includes(k));
    const execIdx = ordered.indexOf('execution');
    if (execIdx >= 0) ordered.splice(execIdx + 1, 0, ...extras);
    else ordered.push(...extras);
    return ordered;
  })();

  const getRawStatus = (key) => stages?.[key]?.status || 'pending';
  const getDisplayStatus = (key) => normalizeStageStatus(getRawStatus(key));

  return (
    <div className="pipeline-seq-wrap">
      <div className="pipeline-seq">
        {visibleKeys.map((key, i) => {
          const meta = STAGE_META[key] || { label: key, short: key.slice(0, 4).toUpperCase() };
          const raw = getRawStatus(key);
          const status = getDisplayStatus(key);
          const stage = stages?.[key];
          const isLast = i === visibleKeys.length - 1;
          const prevDone = i > 0 && getRawStatus(visibleKeys[i - 1]) === 'done';

          return (
            <div key={key} className={`pipeline-seq-stage pipeline-seq--${status}`}>
              {!isLast && (
                <div className={`pipeline-line pipeline-line--${prevDone || raw === 'done' ? 'done' : 'idle'}`} />
              )}

              <div className={`pipeline-dot pipeline-dot--${status}`}>
                {status === 'completed' && <CheckIcon />}
                {status === 'running' && <SpinDot />}
                {status === 'failed' && '✕'}
                {status === 'stopped' && '■'}
                {status === 'pending' && (
                  <span className="pipeline-dot-label">{meta.short}</span>
                )}
              </div>

              <div className="pipeline-stage-name">
                {meta.label}
                {meta.optional && <span className="pipeline-opt">opt</span>}
              </div>
              {stage?.startedAt && raw !== 'pending' && (
                <div className="pipeline-stage-time">
                  <RunElapsed stage={stage} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M2 5l2.3 2.3L8 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function SpinDot() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="pipeline-spin">
      <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.5" strokeDasharray="14 8" />
    </svg>
  );
}
