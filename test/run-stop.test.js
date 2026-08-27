'use strict';

const { createProcessRun } = require('@zero/orchestrator');
const {
  cancelCacheKey,
  RunStoppedError,
  isRunStoppedError,
  isStoppableStatus,
  applyCancelToRun,
} = require('@zero/domain');
const { requestExecution } = require('@zero/domain/execution');

function makeRun(overrides = {}) {
  return {
    id: 'r1',
    status: 'queued',
    input: {
      ottUrl: 'https://example.com',
      executionMode: 'manual_tc_only',
      manualTestCases: [{ feature: 'Home', scenario: 'Load', expectedResult: 'OK' }],
    },
    stages: {
      ba: { label: 'BA', status: 'pending' },
      manualQa: { label: 'MQA', status: 'pending' },
      automationQa: { label: 'AUTO', status: 'pending' },
      execution: { label: 'EXEC', status: 'pending' },
      manager: { label: 'MGR', status: 'pending' },
      delivery: { label: 'DEL', status: 'pending' },
    },
    artifacts: {},
    ...overrides,
  };
}

function stubDeps(run, extra = {}) {
  const cache = extra.cache || { store: {}, async get(k) { return this.store[k] || null; } };
  return {
    cache,
    getRun: async () => run,
    persistRun: extra.persistRun || (async () => {}),
    persistAssets: async () => {},
    setStage: (r, key, status) => {
      if (!r.stages[key]) r.stages[key] = { label: key, status };
      else r.stages[key].status = status;
    },
    applyLlm: async (_agent, template) => template,
    consolidateRequirements: () => ({ metadata: { ottUrl: run.input.ottUrl }, requirementStatements: [] }),
    generateCasesFromUploadedOnly: () => ({ testCases: [] }),
    generateCasesFromManualInput: (cases) => ({ testCases: cases }),
    generateCasesFromUrlAnalysis: () => ({ testCases: [] }),
    generateManualCases: () => ({ testCases: [] }),
    generateAutomationBundle: async () => ({ selectorCandidates: {} }),
    hostFromUrl: () => 'example.com',
    enqueueExecution: extra.enqueueExecution || (async () => {
      throw new Error('enqueueExecution should not run');
    }),
    generateManagerReport: () => ({ executiveSummary: {} }),
    generateDeliveryReport: () => ({}),
    javaSeleniumBuilder: { buildSeleniumJavaTest: () => '' },
    dbHelpers: {},
  };
}

describe('run stop', () => {
  it('classifies stoppable statuses and RunStoppedError', () => {
    expect(isStoppableStatus('running')).toBe(true);
    expect(isStoppableStatus('queued')).toBe(true);
    expect(isStoppableStatus('completed')).toBe(false);
    const err = new RunStoppedError();
    expect(isRunStoppedError(err)).toBe(true);
    expect(isRunStoppedError(new Error('boom'))).toBe(false);
  });

  it('applyCancelToRun flips running to stopping when the cache flag is set', async () => {
    const run = makeRun({ status: 'running' });
    const cache = { async get() { return { requestedAt: 'now' }; } };
    await applyCancelToRun(run, cache);
    expect(run.cancelRequested).toBe(true);
    expect(run.status).toBe('stopping');
  });

  it('processRun exits stopped when cancel is requested before the first stage', async () => {
    const run = makeRun();
    const cache = {
      store: { [cancelCacheKey('r1')]: { requestedAt: new Date().toISOString() } },
      async get(k) { return this.store[k] || null; },
    };
    const processRun = createProcessRun(stubDeps(run, { cache }));
    await processRun('r1');
    expect(run.status).toBe('stopped');
  });

  it('processRun stops at a checkpoint after a stage finishes', async () => {
    const run = makeRun();
    const cache = { store: {}, async get(k) { return this.store[k] || null; } };
    let enqueueCalled = 0;
    const processRun = createProcessRun(stubDeps(run, {
      cache,
      persistRun: async (r) => {
        if (r.stages.ba.status === 'done') {
          cache.store[cancelCacheKey('r1')] = { requestedAt: new Date().toISOString() };
        }
      },
      enqueueExecution: async () => {
        enqueueCalled += 1;
        return { tests: [], totals: {} };
      },
    }));
    await processRun('r1');
    expect(run.status).toBe('stopped');
    expect(enqueueCalled).toBe(0);
    expect(run.stages.ba.status).toBe('done');
  });

  it('requestExecution rejects RunStoppedError when the worker reports cancelled', async () => {
    const handlers = {};
    const queue = {
      subscribe(topic, cb) {
        handlers[topic] = cb;
        return () => {};
      },
      async publish(topic, msg) {
        if (topic === 'execution.requested' && handlers['execution.completed']) {
          handlers['execution.completed']({
            batchId: msg.batchId,
            runId: msg.runId,
            ok: false,
            cancelled: true,
            error: 'Stopped by operator'
          });
        }
      }
    };
    await expect(requestExecution(queue, { runId: 'r1' }, { timeoutMs: 1000 }))
      .rejects.toMatchObject({ name: 'RunStoppedError', code: 'RUN_STOPPED' });
  });
});
