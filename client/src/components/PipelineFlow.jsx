import './PipelineFlow.css';

const STAGE_META = {
  ba:            { label: 'BA Agent',      short: 'BA' },
  manualQa:      { label: 'Manual QA',     short: 'MQA' },
  automationQa:  { label: 'Automation',    short: 'AUTO' },
  execution:     { label: 'Execution',     short: 'EXEC' },
  accessibility: { label: 'Accessibility', short: 'A11Y', optional: true },
  performance:   { label: 'Performance',   short: 'PERF', optional: true },
  manager:       { label: 'Manager',       short: 'MGR' },
};

const BASE_ORDER = ['ba', 'manualQa', 'automationQa', 'execution', 'manager'];

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

  const getStatus = (key) => stages?.[key]?.status || 'pending';

  return (
    <div className="pipeline-seq-wrap">
      <div className="pipeline-seq">
        {visibleKeys.map((key, i) => {
          const meta = STAGE_META[key] || { label: key, short: key.slice(0, 4).toUpperCase() };
          const status = getStatus(key);
          const isLast = i === visibleKeys.length - 1;

          return (
            <div key={key} className={`pipeline-seq-stage pipeline-seq--${status}`}>
              <div className="pipeline-dot-row">
                {/* Left connector */}
                {i > 0 && (
                  <div className={`pipeline-line pipeline-line--${getStatus(visibleKeys[i - 1]) === 'completed' ? 'done' : 'idle'}`} />
                )}
                <div className={`pipeline-dot pipeline-dot--${status}`}>
                  {status === 'completed' && <CheckIcon />}
                  {status === 'running' && <SpinDot />}
                  {status === 'failed' && '✕'}
                  {status === 'pending' && (
                    <span className="pipeline-dot-label">{meta.short}</span>
                  )}
                </div>
                {/* Right connector */}
                {!isLast && (
                  <div className={`pipeline-line pipeline-line--${status === 'completed' ? 'done' : 'idle'}`} />
                )}
              </div>
              <div className="pipeline-stage-name">
                {meta.label}
                {meta.optional && <span className="pipeline-opt">opt</span>}
              </div>
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
