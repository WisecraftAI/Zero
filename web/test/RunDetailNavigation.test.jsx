import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  pathForRoute,
  routeForPath,
  runTabForSlug,
  slugForRunTab,
} from '../src/lib/routes';
import RunDetailTabPanel from '../src/views/runDetail/RunDetailTabPanel';
import { ALL_TABS, getVisibleTabs } from '../src/views/runDetail/tabSources';

const expectedTabs = [
  ['webAnalysis', 'web-analysis'],
  ['requirements', 'requirements'],
  ['manual', 'manual-tc'],
  ['automation', 'automation'],
  ['execution', 'execution'],
  ['accessibility', 'accessibility'],
  ['performance', 'performance'],
  ['security', 'security'],
  ['manager', 'manager-report'],
  ['recording', 'recording'],
  ['element-log', 'element-log'],
  ['flow', 'flow-diagram'],
];

describe('run detail navigation', () => {
  it.each(expectedTabs)('round-trips the %s tab through its deep-link slug', (tab, slug) => {
    expect(slugForRunTab(tab)).toBe(slug);
    expect(runTabForSlug(slug)).toBe(tab);
    expect(pathForRoute('run-detail', 'run/42', tab)).toBe(`/runs/run%2F42/${slug}`);
    expect(routeForPath(`/runs/run%2F42/${slug}`)).toEqual({
      view: 'run-detail',
      runId: 'run/42',
      tab,
    });
  });

  it('uses Web Analysis as the first visible tab when that stage exists', () => {
    const visible = getVisibleTabs({
      stages: { webAnalyzer: { status: 'done' } },
    });

    expect(visible[0]).toEqual({
      id: 'webAnalysis',
      label: 'Web Analysis',
      optional: true,
    });
    expect(ALL_TABS.map(({ id }) => id)).toEqual(expectedTabs.map(([id]) => id));
  });

  it('dispatches a selected tab to its real panel', () => {
    render(
      <RunDetailTabPanel
        run={{
          status: 'completed',
          stages: { execution: { status: 'done' } },
          artifacts: {
            executionReport: {
              totals: { total: 0, passed: 0, failed: 0, skipped: 0 },
              tests: [],
            },
          },
        }}
        tab="execution"
        runId="run-42"
        onNavigate={() => {}}
      />,
    );

    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    expect(table.previousElementSibling).toHaveTextContent('0 run');
  });
});
