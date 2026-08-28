export const ACTION_ALIASES = {
  click: 'interact',
  type: 'input',
  fill: 'input',
  goto: 'navigate',
  open: 'navigate',
  assert: 'verify',
  check: 'verify'
};

export const SOURCE_LABELS = {
  analyzer: 'From Web Analyzer',
  insights: 'From BA insights',
  manual: 'From Manual QA cases',
  execution: 'From execution'
};

export const SYSTEM_LANES = [
  {
    id: 'intake',
    label: 'Intake',
    nodes: [
      { id: 'ui', label: 'React SPA', detail: 'web/', kind: 'fixed' },
      { id: 'api', label: '@zero/api', detail: 'POST /runs', kind: 'fixed' }
    ]
  },
  {
    id: 'agents',
    label: 'Orchestrator',
    nodes: [
      { id: 'webAnalyzer', label: 'Web Analyzer', detail: 'crawl', stage: 'webAnalyzer', optional: true },
      { id: 'ba', label: 'BA', detail: 'requirements', stage: 'ba' },
      { id: 'manualQa', label: 'Manual QA', detail: 'test cases', stage: 'manualQa' },
      { id: 'automationQa', label: 'Automation', detail: 'locators + scripts', stage: 'automationQa' }
    ]
  },
  {
    id: 'exec',
    label: 'Executor',
    nodes: [
      { id: 'execution', label: 'Playwright', detail: '@zero/executor', stage: 'execution' },
      { id: 'accessibility', label: 'A11y', detail: 'headers + axe', stage: 'accessibility', optional: true },
      { id: 'performance', label: 'Perf', detail: 'load vitals', stage: 'performance', optional: true },
      { id: 'security', label: 'Security', detail: 'header checks', stage: 'security', optional: true }
    ]
  },
  {
    id: 'out',
    label: 'Reports',
    nodes: [
      { id: 'manager', label: 'Manager', detail: 'executive review', stage: 'manager' },
      { id: 'delivery', label: 'Delivery', detail: 'stakeholder pack', stage: 'delivery' }
    ]
  }
];

export function normalizeFlowStatus(status) {
  const value = String(status || '').toLowerCase();
  if (value === 'pass' || value === 'passed' || value === 'success') return 'passed';
  if (value === 'fail' || value === 'failed' || value === 'error') return 'failed';
  if (value === 'running' || value === 'in-progress' || value === 'in_progress') return 'running';
  if (value === 'skipped' || value === 'skip') return 'skipped';
  if (value === 'done' || value === 'completed') return 'passed';
  return 'queued';
}

function normalizeStageStatus(status) {
  if (status === 'done') return 'completed';
  return status || 'pending';
}

export function normalizeStep(step) {
  if (step == null) return { action: 'verify', label: 'Verify step', target: null };
  if (typeof step === 'string') {
    return { action: 'verify', label: step, target: null };
  }
  const rawAction = String(step.action || 'verify').toLowerCase();
  const action = ACTION_ALIASES[rawAction] || rawAction;
  const label = step.description || step.target || step.action || 'Step';
  return { action, label: String(label), target: step.target || null };
}

function execTests(run) {
  return run?.artifacts?.executionReport?.tests || [];
}

function matchExec(run, name) {
  const needle = String(name || '').toLowerCase();
  if (!needle) return null;
  return execTests(run).find((test) => {
    const hay = `${test.title || ''} ${test.flowName || ''} ${test.relatedFlow || ''} ${test.id || ''}`.toLowerCase();
    return hay.includes(needle);
  }) || null;
}

function withStatus(journey, run, fallbackId) {
  const byId = fallbackId
    ? execTests(run).find((test) => String(test.id).toUpperCase() === String(fallbackId).toUpperCase())
    : null;
  const match = byId || matchExec(run, journey.name);
  return { ...journey, status: normalizeFlowStatus(match?.status) };
}

function journeysFromUserFlows(run, flows) {
  return flows.map((flow, index) => {
    const name = flow.name || `User Flow ${index + 1}`;
    const steps = (flow.steps || []).map(normalizeStep);
    return withStatus({
      id: flow.id || name,
      name,
      priority: flow.priority || null,
      description: flow.description || '',
      kind: 'flow',
      source: 'analyzer',
      steps: steps.length ? steps : [{ action: 'verify', label: name, target: null }]
    }, run);
  });
}

function journeysFromCases(run, cases, source) {
  return cases.map((testCase, index) => {
    const name = testCase.scenario || testCase.title || testCase.module || `Case ${index + 1}`;
    const rawSteps = Array.isArray(testCase.steps) ? testCase.steps : [];
    const steps = rawSteps.map(normalizeStep);
    return withStatus({
      id: testCase.id || name,
      name,
      priority: testCase.priority || null,
      description: testCase.expectedResult || testCase.expected || '',
      kind: 'case',
      source,
      steps: steps.length ? steps : [{ action: 'verify', label: name, target: null }]
    }, run, testCase.id);
  });
}

function uniqueNames(list) {
  const seen = new Set();
  const names = [];
  for (const item of list || []) {
    const name = String(item || '').trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}

function journeysFromNamed(run, names, source) {
  return uniqueNames(names).map((name, index) => withStatus({
    id: `${source}-${index}`,
    name,
    priority: null,
    description: '',
    kind: 'named',
    source,
    steps: [
      { action: 'navigate', label: 'Start from the target URL', target: null },
      { action: 'verify', label: name, target: null }
    ]
  }, run));
}

export function journeysFromRun(run) {
  if (!run) return [];

  const flows = run.artifacts?.webAnalysis?.userFlows;
  if (Array.isArray(flows) && flows.length) return journeysFromUserFlows(run, flows);

  const insights = run.artifacts?.webAnalysis?.baInsights || {};
  const named = [
    ...(insights.userJourneys || []),
    ...(insights.criticalPaths || []),
    ...(run.artifacts?.webAnalysis?.subDomainCriticalFlows || [])
  ];
  const namedJourneys = journeysFromNamed(run, named, 'insights');
  if (namedJourneys.length) return namedJourneys;

  const manual = run.artifacts?.manualTestCases;
  const cases = manual?.testCases || manual?.cases || (Array.isArray(manual) ? manual : []);
  if (cases.length) return journeysFromCases(run, cases, 'manual');

  const tests = execTests(run);
  if (!tests.length) return [];

  return tests.map((test, index) => {
    const traceSteps = Array.isArray(test.trace)
      ? test.trace.slice(0, 8).map((entry) => ({ action: 'verify', label: String(entry), target: null }))
      : [];
    return {
      id: test.id || `exec-${index}`,
      name: test.title || test.id || `Test ${index + 1}`,
      priority: null,
      description: test.error ? String(test.error) : '',
      kind: 'exec',
      source: 'execution',
      steps: traceSteps.length ? traceSteps : [{ action: 'verify', label: test.title || 'Execute', target: null }],
      status: normalizeFlowStatus(test.status)
    };
  });
}

export function flowDiagramSourceLabel(journeys) {
  return SOURCE_LABELS[journeys[0]?.source] || '';
}

export function systemNodesForRun(run) {
  const stages = run?.stages || {};
  return SYSTEM_LANES.map((lane) => ({
    ...lane,
    nodes: lane.nodes
      .filter((node) => {
        if (!node.stage) return true;
        if (node.optional) return Boolean(stages[node.stage]);
        return true;
      })
      .map((node) => {
        if (!node.stage) return { ...node, status: 'fixed' };
        return { ...node, status: normalizeStageStatus(stages[node.stage]?.status) };
      })
  })).filter((lane) => lane.nodes.length > 0);
}
