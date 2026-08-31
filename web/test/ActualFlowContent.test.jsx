import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ActualFlowContent from '../src/views/runDetail/ActualFlowContent';

const plan = [
  { id: 'TC-GRAY-001', scenario: 'Reach the app shell' },
  { id: 'TC-GRAY-002', scenario: 'Open a content detail surface' },
  { id: 'TC-GRAY-003', scenario: 'Play a title' },
];

function makeRun(executionTests) {
  return {
    status: 'completed',
    stages: { execution: { status: 'done' } },
    artifacts: {
      manualTestCases: { testCases: plan },
      executionReport: { tests: executionTests },
    },
  };
}

describe('ActualFlowContent execution matching', () => {
  it('resolves plan case status from EXEC-prefixed execution ids', () => {
    render(<ActualFlowContent run={makeRun([
      { id: 'EXEC-TC-GRAY-001', title: 'Reach the app shell', status: 'passed' },
      { id: 'EXEC-TC-GRAY-002', title: 'Open a content detail surface', status: 'failed' },
    ])} />);

    expect(screen.getByTitle('Passed')).toBeInTheDocument();
    expect(screen.getByTitle('Failed')).toBeInTheDocument();
    expect(screen.getByTitle('Queued')).toBeInTheDocument();
  });

  it('resolves plan case status from sourceCaseId on discovered flows', () => {
    render(<ActualFlowContent run={makeRun([
      { id: 'FLOW-001', sourceCaseId: 'TC-GRAY-003', title: 'Play a title', status: 'passed' },
    ])} />);

    expect(screen.getByTitle('Passed')).toBeInTheDocument();
    expect(screen.getAllByTitle('Queued')).toHaveLength(2);
  });

  it('shows the screenshot recorded for the matched execution test', () => {
    render(<ActualFlowContent run={makeRun([
      {
        id: 'EXEC-TC-GRAY-001',
        title: 'Reach the app shell',
        status: 'passed',
        screenshot: '/runs/run-1/files/shell.png',
      },
    ])} />);

    const shot = screen.getByRole('img', { name: 'Reach the app shell screenshot' });
    expect(shot).toHaveAttribute('src', expect.stringContaining('/runs/run-1/files/shell.png'));
  });

  it('falls back to execution tests when no plan exists', () => {
    render(<ActualFlowContent run={{
      status: 'completed',
      artifacts: { executionReport: { tests: [{ id: 'AUTO-001', title: 'Verify site loads', status: 'passed' }] } },
    }} />);

    expect(screen.getByText('AUTO-001')).toBeInTheDocument();
    expect(screen.getByTitle('Passed')).toBeInTheDocument();
  });
});
