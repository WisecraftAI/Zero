import { describe, expect, it } from 'vitest';
import {
  buildManagerResultView,
  filterManagerTestCases,
} from '../src/views/runDetail/managerReportResults';

const testCases = [
  { id: 'TC-1', title: 'Loads home', status: 'passed' },
  { id: 'TC-2', title: 'Completes checkout', status: 'failed', error: 'Timed out' },
  { id: 'TC-3', title: 'Uses saved card', status: 'skipped' },
  { id: 'TC-4', title: 'Opens profile', status: 'passed' },
];

const managerReport = {
  executiveSummary: { passed: 2, failed: 1, skipped: 1 },
  traceabilityMatrix: testCases,
};

function build(selectedStatus, executionTests = []) {
  return buildManagerResultView({ managerReport, executionTests, selectedStatus });
}

describe('manager report result filtering', () => {
  it.each([
    ['passed', ['TC-1', 'TC-4']],
    ['failed', ['TC-2']],
    ['skipped', ['TC-3']],
  ])('filters %s test cases', (status, expectedIds) => {
    expect(filterManagerTestCases(testCases, status).map(({ id }) => id)).toEqual(expectedIds);
  });

  it('resets to all test cases', () => {
    expect(build('all').filteredTestCases).toEqual(testCases);
    expect(build('unknown').selectedStatus).toBe('all');
  });

  it('preserves complete-run chart totals while filtering', () => {
    const view = build('failed');

    expect(view.counts).toEqual({ passed: 2, failed: 1, skipped: 1 });
    expect(view.chartTotal).toBe(4);
    expect(view.segments.map(({ percentage }) => percentage)).toEqual([50, 25, 25]);
    expect(view.selectedCount).toBe(1);
  });

  it('joins only matching screenshots by stable test ID', () => {
    const view = build('passed', [
      { id: 'TC-1', screenshot: '/runs/1/files/pass.png' },
      { id: 'TC-2', screenshot: '/runs/1/files/fail.png' },
      { id: 'TC-4' },
    ]);

    expect(view.visuals).toEqual([
      expect.objectContaining({ id: 'TC-1', screenshot: '/runs/1/files/pass.png' }),
    ]);
  });

  it('returns an empty result model when no outcomes exist', () => {
    const view = buildManagerResultView({
      managerReport: { executiveSummary: {}, traceabilityMatrix: [] },
      executionTests: [],
      selectedStatus: 'all',
    });

    expect(view.hasResults).toBe(false);
    expect(view.chartTotal).toBe(0);
    expect(view.filteredTestCases).toEqual([]);
  });
});
