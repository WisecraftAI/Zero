import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { pathForRoute, routeForPath } from '../src/lib/routes';
import FlowTab from '../src/views/runDetail/FlowTab';
import { getVisibleTabs } from '../src/views/runDetail/tabSources';

const run = {
  id: 'run-42',
  input: { ottUrl: 'https://example.com/shop' },
  stages: {
    ba: { status: 'done' },
    manualQa: { status: 'done' },
    automationQa: { status: 'done' },
    execution: { status: 'done' },
    manager: { status: 'done' },
    delivery: { status: 'done' }
  },
  artifacts: {
    webAnalysis: {
      userFlows: [
        {
          id: 'checkout',
          name: 'Checkout',
          priority: 'Critical',
          steps: ['Open product', { action: 'click', description: 'Add to cart' }]
        },
        {
          id: 'search',
          name: 'Search',
          priority: 'High',
          steps: [{ action: 'type', description: 'Enter a search term' }]
        }
      ]
    },
    executionReport: {
      tests: [
        { id: 'TC-1', title: 'Checkout completes', status: 'passed' },
        { id: 'TC-2', title: 'Search returns products', status: 'failed' }
      ]
    }
  }
};

describe('FlowTab', () => {
  it('renders the pipeline and site journeys from a run', async () => {
    render(<FlowTab run={run} />);

    expect(screen.getByRole('heading', { name: 'Pipeline' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Site journeys' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Checkout' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Search' })).toBeInTheDocument();

    const coverage = await screen.findByRole('list', { name: 'Journey coverage summary' });
    expect(within(coverage).getByText('Critical')).toBeInTheDocument();
    expect(within(coverage).getByText('Passed')).toBeInTheDocument();
    expect(within(coverage).getByText('Failed')).toBeInTheDocument();
  });

  it('registers an always-visible tab with a stable route', () => {
    expect(getVisibleTabs({}).find(({ id }) => id === 'flow')).toEqual({
      id: 'flow',
      label: 'Flow Diagram'
    });
    expect(pathForRoute('run-detail', 'run-42', 'flow')).toBe('/runs/run-42/flow-diagram');
    expect(routeForPath('/runs/run-42/flow-diagram')).toEqual({
      view: 'run-detail',
      runId: 'run-42',
      tab: 'flow'
    });
  });
});
