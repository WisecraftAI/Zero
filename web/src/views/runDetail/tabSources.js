export const ALL_TABS = [
  { id: 'webAnalysis', label: 'Web Analysis', optional: true },
  { id: 'requirements', label: 'Requirements' },
  { id: 'manual', label: 'Manual TC' },
  { id: 'automation', label: 'Automation' },
  { id: 'execution', label: 'Execution' },
  { id: 'accessibility', label: 'Accessibility', optional: true },
  { id: 'performance', label: 'Performance', optional: true },
  { id: 'security', label: 'Security', optional: true },
  { id: 'manager', label: 'Manager Report' },
  { id: 'recording', label: 'Recording', optional: true },
  { id: 'element-log', label: 'Element Log' },
  { id: 'flow', label: 'Flow Diagram' },
];

export const TAB_SOURCES = {
  webAnalysis: { stage: 'webAnalyzer', artifact: 'webAnalysis', label: 'Web Analyzer' },
  requirements: { stage: 'ba', artifact: 'requirements', label: 'BA Agent' },
  manual: { stage: 'manualQa', artifact: 'manualTestCases', label: 'Manual QA Agent' },
  automation: { stage: 'automationQa', artifact: 'automationBundle', label: 'Automation QA Agent' },
  execution: { stage: 'execution', artifact: 'executionReport', label: 'Execution' },
  accessibility: { stage: 'accessibility', artifact: 'accessibilityReport', label: 'Accessibility Agent' },
  performance: { stage: 'performance', artifact: 'performanceReport', label: 'Performance Agent' },
  security: { stage: 'security', artifact: 'securityReport', label: 'Security Agent' },
  manager: { stage: 'manager', artifact: 'managerReport', label: 'Manager Agent' },
};

export function getVisibleTabs(run) {
  return ALL_TABS.filter((tab) => {
    if (!tab.optional) return true;
    if (tab.id === 'webAnalysis') return Boolean(run?.stages?.webAnalyzer);
    if (tab.id === 'accessibility') return Boolean(run?.stages?.accessibility);
    if (tab.id === 'performance') return Boolean(run?.stages?.performance);
    if (tab.id === 'security') return Boolean(run?.stages?.security);
    if (tab.id === 'recording') {
      return Boolean(run?.artifacts?.recording || run?.input?.recording);
    }
    return false;
  });
}
