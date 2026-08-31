import { configureStore } from '@reduxjs/toolkit';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { afterEach, describe, expect, it, vi } from 'vitest';
import DashboardView from '../src/views/DashboardView';
import RunDetailView from '../src/views/RunDetailView';
import { runsApi } from '../src/store/runsApi';

vi.mock('../src/store/RunStreamBridge', () => ({
  default: ({ children }) => children('idle'),
}));

const liveRun = {
  id: 'run-42',
  status: 'running',
  startedAt: '2026-08-31T08:00:00.000Z',
  input: { ottUrl: 'https://example.com' },
  stages: {
    ba: { status: 'running' },
    manualQa: { status: 'pending' },
    automationQa: { status: 'pending' },
    execution: { status: 'pending' },
    manager: { status: 'pending' },
  },
  artifacts: {},
};

function makeStore() {
  return configureStore({
    reducer: { [runsApi.reducerPath]: runsApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(runsApi.middleware),
  });
}

function renderWithStore(ui) {
  return render(<Provider store={makeStore()}>{ui}</Provider>);
}

function requestDetails(input, init) {
  const request = input instanceof Request ? input : new Request(input, init);
  return { method: request.method, pathname: new URL(request.url).pathname };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('run controls', () => {
  it('shows Stop in the live dashboard hero and its history row', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify([liveRun]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })));

    renderWithStore(
      <DashboardView onOpenRun={vi.fn()} onNewRun={vi.fn()} />,
    );

    expect(await screen.findAllByRole('button', { name: 'Stop run' })).toHaveLength(2);
  });

  it('posts the selected run to its stop endpoint', async () => {
    const requests = [];
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const request = requestDetails(input, init);
      requests.push(request);
      if (request.method === 'POST') {
        return new Response(JSON.stringify({ status: 'stopping' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify([liveRun]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));
    const user = userEvent.setup();

    renderWithStore(
      <DashboardView onOpenRun={vi.fn()} onNewRun={vi.fn()} />,
    );
    const [heroStop] = await screen.findAllByRole('button', { name: 'Stop run' });
    await user.click(heroStop);

    await waitFor(() => {
      expect(requests).toContainEqual({
        method: 'POST',
        pathname: '/runs/run-42/stop',
      });
    });
  });

  it('shows loading and a recoverable not-found error in run detail', async () => {
    let resolveRequest;
    vi.stubGlobal('fetch', vi.fn(() => new Promise((resolve) => {
      resolveRequest = resolve;
    })));

    renderWithStore(
      <RunDetailView
        runId="missing-run"
        activeTab={null}
        onTabChange={vi.fn()}
        onBack={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );

    expect(screen.getAllByText('Loading run…').length).toBeGreaterThan(0);
    await waitFor(() => expect(resolveRequest).toBeTypeOf('function'));
    resolveRequest(new Response(JSON.stringify({ message: 'not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Run not found');
    expect(screen.getByRole('button', { name: 'Back to runs' })).toBeInTheDocument();
  });

  it('surfaces a failed stop action to the operator', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input, init) => {
      const request = requestDetails(input, init);
      if (request.method === 'POST') {
        return new Response(JSON.stringify({ message: 'stop failed' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify(liveRun), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }));
    const user = userEvent.setup();

    renderWithStore(
      <RunDetailView
        runId="run-42"
        activeTab="requirements"
        onTabChange={vi.fn()}
        onBack={vi.fn()}
        onNavigate={vi.fn()}
      />,
    );
    await user.click(await screen.findByRole('button', { name: 'Stop run' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Unable to stop this run.');
  });
});
