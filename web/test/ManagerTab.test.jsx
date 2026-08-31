import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import ManagerTab from '../src/views/runDetail/ManagerTab';

const cases = [
  { id: 'TC-1', title: 'Loads home', status: 'passed' },
  { id: 'TC-2', title: 'Completes checkout', status: 'failed', error: 'Timed out' },
  { id: 'TC-3', title: 'Uses saved card', status: 'skipped' },
];

function makeRun({
  traceabilityMatrix = cases,
  counts = { passed: 1, failed: 1, skipped: 1 },
  executionTests = [
    { ...cases[0], screenshot: '/runs/run-1/files/pass.png' },
    { ...cases[1], screenshot: '/runs/run-1/files/fail.png' },
    { ...cases[2] },
  ],
} = {}) {
  return {
    artifacts: {
      managerReport: {
        executiveSummary: {
          verdict: 'Hold',
          riskLevel: 'High',
          passRate: '33%',
          totalTestCases: traceabilityMatrix.length,
          executed: traceabilityMatrix.length,
          ...counts,
        },
        traceabilityMatrix,
      },
      executionReport: { tests: executionTests },
    },
  };
}

describe('ManagerTab result filters', () => {
  it.each([
    ['passed', 'TC-1', 'Loads home', /passed test evidence/i],
    ['failed', 'TC-2', 'Completes checkout', /failed test evidence/i],
    ['skipped', 'TC-3', 'Uses saved card', null],
  ])('filters test cases and evidence when %s is selected', async (
    status,
    expectedId,
    expectedTitle,
    expectedImageName,
  ) => {
    const user = userEvent.setup();
    render(<ManagerTab run={makeRun()} />);

    const filter = await screen.findByRole('button', {
      name: new RegExp(`filter by ${status} tests: 1`, 'i'),
    });
    await user.click(filter);

    expect(filter).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('status')).toHaveTextContent(`Showing 1 ${status} test case.`);
    const table = screen.getByRole('table');
    expect(within(table).getByText(expectedId)).toBeInTheDocument();
    expect(within(table).getByText(expectedTitle)).toBeInTheDocument();
    for (const testCase of cases.filter(({ id }) => id !== expectedId)) {
      expect(within(table).queryByText(testCase.id)).not.toBeInTheDocument();
    }

    if (expectedImageName) {
      expect(screen.getByRole('img', { name: expectedImageName })).toBeInTheDocument();
    } else {
      expect(screen.getByText(/no screenshots are available for the selected test results/i)).toBeInTheDocument();
    }
  });

  it('clears the active filter by toggling it or using Show all', async () => {
    const user = userEvent.setup();
    render(<ManagerTab run={makeRun()} />);

    const failed = await screen.findByRole('button', { name: /filter by failed tests: 1/i });
    await user.click(failed);
    await user.click(failed);
    expect(screen.getByRole('status')).toHaveTextContent('Showing all 3 test cases.');

    await user.click(screen.getByRole('button', { name: /filter by passed tests: 1/i }));
    await user.click(screen.getByRole('button', { name: /show all/i }));
    expect(screen.getByRole('button', { name: /show all/i })).toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(4);
  });

  it('supports keyboard activation and exposes labels and tooltips', async () => {
    const user = userEvent.setup();
    render(<ManagerTab run={makeRun()} />);

    const failed = await screen.findByRole('button', { name: 'Filter by failed tests: 1' });
    expect(failed).toHaveAttribute('title', 'Failed: 1 (33%)');
    expect(failed).toHaveAccessibleDescription('Failed: 1 (33%)');
    expect(screen.getByRole('tooltip', { name: 'Failed: 1 (33%)' })).toBeInTheDocument();

    failed.focus();
    await user.keyboard('{Enter}');
    expect(failed).toHaveAttribute('aria-pressed', 'true');

    await user.keyboard(' ');
    expect(failed).toHaveAttribute('aria-pressed', 'false');
  });

  it('disables zero-count statuses and keeps their totals visible', async () => {
    render(<ManagerTab run={makeRun({
      traceabilityMatrix: [cases[0]],
      counts: { passed: 1, failed: 0, skipped: 0 },
      executionTests: [cases[0]],
    })} />);

    expect(await screen.findByRole('button', { name: 'No failed tests' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'No skipped tests' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Filter by passed tests: 1' })).toBeEnabled();
  });

  it('draws one donut sector per status that has results', async () => {
    const { container, rerender } = render(<ManagerTab run={makeRun()} />);
    await screen.findByRole('button', { name: 'Filter by passed tests: 1' });
    expect(container.querySelectorAll('.recharts-sector')).toHaveLength(3);

    rerender(<ManagerTab run={makeRun({
      traceabilityMatrix: [cases[0]],
      counts: { passed: 1, failed: 0, skipped: 0 },
      executionTests: [cases[0]],
    })} />);
    expect(container.querySelectorAll('.recharts-sector')).toHaveLength(1);
  });

  it('filters the report when a donut sector is clicked', async () => {
    const user = userEvent.setup();
    const { container } = render(<ManagerTab run={makeRun()} />);
    await screen.findByRole('button', { name: 'Filter by passed tests: 1' });

    // Sector order follows the passed/failed/skipped status order.
    await user.click(container.querySelectorAll('.recharts-sector')[1]);

    expect(screen.getByRole('status')).toHaveTextContent('Showing 1 failed test case.');
    expect(screen.getByRole('button', { name: 'Filter by failed tests: 1' }))
      .toHaveAttribute('aria-pressed', 'true');
    expect(within(screen.getByRole('table')).getByText('TC-2')).toBeInTheDocument();
  });

  it('shows an empty state instead of an empty chart', async () => {
    render(<ManagerTab run={makeRun({
      traceabilityMatrix: [],
      counts: { passed: 0, failed: 0, skipped: 0 },
      executionTests: [],
    })} />);

    expect(await screen.findByText('No test results available')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /filter by/i })).not.toBeInTheDocument();
  });
});
