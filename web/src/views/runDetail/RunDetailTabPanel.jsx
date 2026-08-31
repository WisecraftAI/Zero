import { memo } from 'react';
import { isTerminalRunStatus } from '../../lib/runControl';
import AccessibilityTab from './AccessibilityTab';
import AutomationTab from './AutomationTab';
import ElementLogTab from './ElementLogTab';
import ExecutionTab from './ExecutionTab';
import FlowTab from './FlowTab';
import ManagerTab from './ManagerTab';
import ManualTab from './ManualTab';
import PerformanceTab from './PerformanceTab';
import RecordingTab from './RecordingTab';
import RequirementsTab from './RequirementsTab';
import SecurityTab from './SecurityTab';
import { TabLoading } from './shared';
import { TAB_SOURCES } from './tabSources';
import WebAnalysisTab from './WebAnalysisTab';

function pendingStage(run, tab) {
  const source = TAB_SOURCES[tab];
  if (!source || run.artifacts?.[source.artifact] || isTerminalRunStatus(run.status)) return null;
  const status = run.stages?.[source.stage]?.status;
  if (['done', 'failed', 'stopped'].includes(status)) return null;
  return { label: source.label, status: status || 'pending' };
}

function RunDetailTabPanel({ run, tab, runId, onNavigate }) {
  if (!run) {
    if (!runId) return <div className="tab-empty">No active run. Start one from New Run.</div>;
    return <TabLoading title="Loading run…" detail="Fetching pipeline state." />;
  }

  const pending = pendingStage(run, tab);
  if (pending) {
    return pending.status === 'running'
      ? <TabLoading title={`${pending.label} is running…`} detail="Output appears here as the agent reports it." />
      : <TabLoading title={`${pending.label} is queued`} detail="Waiting for earlier pipeline stages." queued />;
  }

  const panels = {
    webAnalysis: WebAnalysisTab,
    requirements: RequirementsTab,
    manual: ManualTab,
    automation: AutomationTab,
    execution: ExecutionTab,
    accessibility: AccessibilityTab,
    performance: PerformanceTab,
    security: SecurityTab,
    manager: ManagerTab,
    recording: RecordingTab,
    'element-log': ElementLogTab,
    flow: FlowTab,
  };
  const Panel = panels[tab];
  return Panel ? <Panel run={run} onNavigate={onNavigate} /> : null;
}

export default memo(RunDetailTabPanel);
