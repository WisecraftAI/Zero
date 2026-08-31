import { useEffect, useRef } from 'react';
import AgentRunLine from '../components/AgentRunLine';
import PipelineFlow from '../components/PipelineFlow';
import RunProgressPanel from '../components/RunProgressPanel';
import StopRunButton from '../components/StopRunButton';
import { apiUrl } from '../apiBase';
import { currentThemeId } from '../lib/themes';
import RunStreamBridge from '../store/RunStreamBridge';
import { useGetRunQuery, useRerunFailedMutation, useStopRunMutation } from '../store/runsApi';
import ActualFlowContent from './runDetail/ActualFlowContent';
import RunDetailTabPanel from './runDetail/RunDetailTabPanel';
import { Spinner } from './runDetail/shared';
import { getVisibleTabs } from './runDetail/tabSources';
import './RunDetailView.scss';

function formatDate(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(timestamp).slice(0, 16);
  }
}

function TabBadge({ passed, failed }) {
  if (passed == null && failed == null) return null;
  return (
    <span className="rdt-tab-badge">
      {failed > 0
        ? <span style={{ color: 'var(--red)' }}>{failed}✕</span>
        : <span style={{ color: 'var(--green)' }}>{passed}✓</span>}
    </span>
  );
}

function RunDetailContent({ run, runId, activeTab, onTabChange, onBack, transport, actions }) {
  const tabs = getVisibleTabs(run);
  const defaultTab = tabs[0]?.id || 'requirements';
  const tabIsValid = tabs.some((tab) => tab.id === activeTab);
  const currentTab = tabIsValid || (!run && activeTab) ? activeTab : defaultTab;
  const followPipeline = useRef(!activeTab);
  const summary = run?.artifacts?.managerReport?.executiveSummary || {};
  const hasFailures = run?.artifacts?.executionReport?.totals?.failed > 0;
  const loadError = actions.loadError;

  useEffect(() => {
    followPipeline.current = !activeTab;
  }, [runId, activeTab]);

  useEffect(() => {
    if (run && !tabIsValid) onTabChange?.(defaultTab, { replace: true });
  }, [defaultTab, onTabChange, run, tabIsValid]);

  useEffect(() => {
    if (run?.stages?.execution?.status === 'running' && followPipeline.current) {
      onTabChange?.('execution', { replace: true });
    }
  }, [onTabChange, run?.stages?.execution?.status]);

  const verdictKey = summary.verdict?.toLowerCase() === 'go'
    ? 'go'
    : summary.verdict?.toLowerCase().includes('conditional')
      ? 'conditional'
      : 'hold';
  const selectTab = (tab) => {
    followPipeline.current = false;
    onTabChange?.(tab);
  };

  return (
    <div className="run-detail-view">
      {actions.actionError && <div className="rdt-error-banner" role="alert">{actions.actionError}</div>}
      {!run && (
        <div className={loadError || !runId ? 'empty-state empty-state--error' : 'empty-state'} role={loadError ? 'alert' : undefined}>
          <p>{loadError || (runId ? <span className="rdt-loading-inline"><Spinner /> Loading run…</span> : 'No run selected. Open a run from the list.')}</p>
          {loadError && <button type="button" className="btn btn-secondary btn-sm" onClick={onBack}>Back to runs</button>}
        </div>
      )}
      <div className={`rdt-header rdt-header--${run?.status || (runId ? 'pending' : 'idle')}`}>
        <div className="rdt-header-left">
          <div className="rdt-url">
            {run?.input?.ottUrl
              ? <a href={run.input.ottUrl} target="_blank" rel="noreferrer">{run.input.ottUrl}</a>
              : <span className="text-muted">{runId ? 'Loading…' : 'No run active'}</span>}
          </div>
          <div className="rdt-meta-row">
            <code className="rdt-run-id">{String(runId || '').slice(0, 20)}</code>
            {run?.status && <span className={`chip ${run.status}`}>{run.status}</span>}
            {summary.verdict && <span className={`verdict ${verdictKey}`}>{summary.verdict}</span>}
            {summary.passRate && <span className="rdt-passrate">Pass rate: <strong>{summary.passRate}</strong></span>}
            {run && <span className="rdt-date">Started {formatDate(run.startedAt || run.createdAt)}</span>}
          </div>
        </div>
        <div className="rdt-header-right">
          <StopRunButton run={run} onStop={actions.stop} />
          <button type="button" className="btn btn-secondary btn-sm" disabled={!runId || !hasFailures} onClick={actions.rerun}>Re-run Failed</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={run?.status !== 'completed'} onClick={() => window.open(apiUrl(`/runs/${runId}/download?theme=${encodeURIComponent(currentThemeId())}`), '_blank')}>PDF</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onBack}>← Runs</button>
        </div>
        <AgentRunLine run={run} />
      </div>
      <div className="rdt-pipeline-panel">
        <RunProgressPanel run={run} streamTransport={transport} />
        <div className="rdt-section-label">Pipeline stages</div>
        <PipelineFlow run={run} />
      </div>
      <div className="rdt-body">
        <div className="rdt-tab-panel">
          <div className="rdt-tabs">
            {tabs.map((tab) => (
              <button type="button" key={tab.id} className={`rdt-tab${currentTab === tab.id ? ' rdt-tab--active' : ''}`} onClick={() => selectTab(tab.id)}>
                {tab.label}
                {tab.id === 'execution' && run?.artifacts?.executionReport?.totals && <TabBadge {...run.artifacts.executionReport.totals} />}
              </button>
            ))}
          </div>
          <div className="rdt-tab-content"><RunDetailTabPanel run={run} tab={currentTab} runId={runId} /></div>
        </div>
        <div className="rdt-actual-flow-panel">
          <div className="rdt-side-label">{run?.status === 'running' && <span className="rdt-side-live-dot" />}Actual Flow</div>
          <ActualFlowContent run={run} />
        </div>
      </div>
    </div>
  );
}

export default function RunDetailView({ runId, ...props }) {
  const { data: run, isError, error } = useGetRunQuery(runId, { skip: !runId });
  const [stopRun, stopState] = useStopRunMutation();
  const [rerunFailed, rerunState] = useRerunFailedMutation();
  const actions = {
    stop: (id) => void stopRun(id),
    rerun: () => {
      if (runId) void rerunFailed(runId);
    },
    loadError: isError
      ? error?.status === 404
        ? 'Run not found. It may have been removed or belongs to another workspace.'
        : 'Unable to load this run. Please try again.'
      : '',
    actionError: stopState.isError
      ? 'Unable to stop this run.'
      : rerunState.isError
        ? 'Unable to re-run failed checks.'
        : '',
  };

  return (
    <RunStreamBridge runId={runId} run={run}>
      {(transport) => <RunDetailContent {...props} run={run} runId={runId} transport={transport} actions={actions} />}
    </RunStreamBridge>
  );
}
