export const RESULT_STATUSES = Object.freeze([
  { key: 'passed', label: 'Passed', symbol: '✓' },
  { key: 'failed', label: 'Failed', symbol: '×' },
  { key: 'skipped', label: 'Skipped', symbol: '!' },
]);

const RESULT_STATUS_KEYS = new Set(RESULT_STATUSES.map(({ key }) => key));

function resultCount(summary, matrixCounts, status) {
  const value = Number(summary?.[status]);
  return Number.isFinite(value) && value >= 0 ? value : matrixCounts[status];
}

export function normalizeResultFilter(status) {
  return RESULT_STATUS_KEYS.has(status) ? status : 'all';
}

export function filterManagerTestCases(testCases, selectedStatus) {
  const cases = Array.isArray(testCases) ? testCases : [];
  const normalizedStatus = normalizeResultFilter(selectedStatus);
  return normalizedStatus === 'all'
    ? cases
    : cases.filter((testCase) => testCase.status === normalizedStatus);
}

export function buildManagerResultView({
  managerReport,
  executionTests,
  selectedStatus,
}) {
  const report = managerReport || {};
  const testCases = Array.isArray(report.traceabilityMatrix)
    ? report.traceabilityMatrix
    : [];
  const summary = report.executiveSummary || {};
  const normalizedStatus = normalizeResultFilter(selectedStatus);
  const matrixCounts = { passed: 0, failed: 0, skipped: 0 };

  for (const testCase of testCases) {
    if (RESULT_STATUS_KEYS.has(testCase.status)) {
      matrixCounts[testCase.status] += 1;
    }
  }

  const counts = Object.fromEntries(
    RESULT_STATUSES.map(({ key }) => [key, resultCount(summary, matrixCounts, key)]),
  );
  const chartTotal = counts.passed + counts.failed + counts.skipped;
  const segments = RESULT_STATUSES.map((status) => ({
    ...status,
    count: counts[status.key],
    percentage: chartTotal > 0
      ? Math.round((counts[status.key] / chartTotal) * 100)
      : 0,
  }));
  const filteredTestCases = filterManagerTestCases(testCases, normalizedStatus);
  const executionById = new Map(
    (Array.isArray(executionTests) ? executionTests : [])
      .filter((test) => test?.id)
      .map((test) => [test.id, test]),
  );
  const visuals = filteredTestCases.flatMap((testCase) => {
    const executionTest = executionById.get(testCase.id);
    return executionTest?.screenshot
      ? [{ ...testCase, screenshot: executionTest.screenshot }]
      : [];
  });

  return {
    selectedStatus: normalizedStatus,
    counts,
    chartTotal,
    segments,
    filteredTestCases,
    visuals,
    selectedCount: normalizedStatus === 'all'
      ? testCases.length
      : filteredTestCases.length,
    totalTestCases: testCases.length,
    hasResults: chartTotal > 0 || testCases.length > 0,
  };
}
