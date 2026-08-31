import { artifactUrl } from '../../apiBase';
import { stableKey } from './shared';

function normalizeStatus(status) {
  const value = String(status || '').toLowerCase();
  if (['pass', 'passed', 'success'].includes(value)) return 'passed';
  if (['fail', 'failed', 'error'].includes(value)) return 'failed';
  if (['running', 'in-progress', 'in_progress'].includes(value)) return 'running';
  if (['skipped', 'skip'].includes(value)) return 'skipped';
  return 'queued';
}

function StatusGlyph({ status }) {
  if (status === 'passed') {
    return (
      <span className="af-glyph af-glyph--pass" title="Passed">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7.2l2.7 2.7L11 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="af-glyph af-glyph--fail" title="Failed">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M4 4l6 6M10 4l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="af-glyph af-glyph--running" title="Running">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ animation: 'nrv-spin 0.9s linear infinite' }}>
          <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" strokeDasharray="22 12" />
        </svg>
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className="af-glyph af-glyph--skipped" title="Skipped">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M3 7h8M8 4l3 3-3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    );
  }
  return (
    <span className="af-glyph af-glyph--queued" title="Queued">
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
        <circle cx="3.5" cy="7" r="1.2" fill="currentColor" />
        <circle cx="7" cy="7" r="1.2" fill="currentColor" />
        <circle cx="10.5" cy="7" r="1.2" fill="currentColor" />
      </svg>
    </span>
  );
}

function buildFlowNodes(run) {
  const manual = run?.artifacts?.manualTestCases;
  const plan = manual?.testCases || manual?.cases || (Array.isArray(manual) ? manual : []);
  const execution = run?.artifacts?.executionReport?.tests || [];
  const executionById = new Map(
    execution
      .filter((test) => test.id)
      .map((test) => [String(test.id).toUpperCase(), test]),
  );

  if (plan.length > 0) {
    return plan.map((item) => {
      const match = item.id ? executionById.get(String(item.id).toUpperCase()) : null;
      return {
        id: item.id || '',
        title: item.scenario || item.title || 'Untitled Step',
        status: match?.status || 'queued',
        screenshot: match?.screenshot || null,
      };
    });
  }
  return execution.map((test) => ({
    id: test.id || '',
    title: test.title || 'Untitled Step',
    status: test.status,
    screenshot: test.screenshot,
  }));
}

export default function ActualFlowContent({ run }) {
  const nodes = buildFlowNodes(run);
  const executionActive = run?.stages?.execution?.status === 'running'
    || (run?.status === 'running' && !run?.stages?.execution?.status);
  const hasRunningNode = nodes.some((node) => normalizeStatus(node.status) === 'running');
  const activeIndex = executionActive && !hasRunningNode
    ? nodes.findIndex((node) => !['passed', 'failed', 'skipped'].includes(normalizeStatus(node.status)))
    : -1;

  if (nodes.length === 0) {
    return (
      <div className="af-empty">
        {run?.status === 'running' ? 'Preparation step...' : 'No plan or execution flow available yet.'}
      </div>
    );
  }

  return (
    <div className="af-sidebar-list">
      {nodes.map((node, index) => {
        const status = index === activeIndex ? 'running' : normalizeStatus(node.status);
        return (
          <div key={node.id || stableKey(node, 'flow-step')} className="af-sidebar-step">
            <div className={`af-sb-node af-sb-node--${status}`}>
              <div className="af-sb-node-head">
                <StatusGlyph status={status} />
                <span className="af-sb-node-id">{node.id || `ST-${index + 1}`}</span>
              </div>
              <div className="af-sb-node-title" title={node.title}>{node.title}</div>
              {node.screenshot && (
                <a href={artifactUrl(node.screenshot)} target="_blank" rel="noreferrer" className="af-sb-thumb">
                  <img src={artifactUrl(node.screenshot)} alt={`${node.title} screenshot`} loading="lazy" />
                </a>
              )}
            </div>
            {index < nodes.length - 1 && (
              <div className="af-sb-connector"><div className="af-sb-line" /></div>
            )}
          </div>
        );
      })}
    </div>
  );
}
