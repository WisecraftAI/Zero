'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadFlowDiagram() {
  const file = path.join(ROOT, 'web/src/lib/flowDiagram.js');
  let src = fs.readFileSync(file, 'utf8');
  src = src
    .replace(/^export const /gm, 'const ')
    .replace(/^export function /gm, 'function ');
  src += '\nreturn { buildJourneyCoverageSankey, journeysFromRun, normalizeStep, systemNodesForRun, normalizeFlowStatus, flowDiagramSourceLabel, SYSTEM_LANES };';
  return new Function(src)();
}

describe('flow diagram wiring', () => {
  it('keeps the API picture SVG aligned with current stages', () => {
    const server = read('services/api/server.js');
    expect(server).toMatch(/Web Analyzer/);
    expect(server).toMatch(/@zero\/api/);
    expect(server).toMatch(/@zero\/executor/);
    expect(server).toMatch(/Domain infer/);
  });
});

describe('buildJourneyCoverageSankey', () => {
  const { buildJourneyCoverageSankey } = loadFlowDiagram();

  it('groups prioritized journeys and aggregates their outcomes', () => {
    const result = buildJourneyCoverageSankey([
      { priority: 'Critical', source: 'analyzer', status: 'passed' },
      { priority: 'Critical', source: 'analyzer', status: 'passed' },
      { priority: 'High', source: 'analyzer', status: 'failed' },
      { priority: null, source: 'analyzer', status: 'skipped' }
    ]);

    expect(result.nodes.map(({ name }) => name)).toEqual([
      'Critical',
      'High',
      'Unprioritized',
      'Passed',
      'Failed',
      'Skipped'
    ]);
    expect(result.summary).toEqual([
      expect.objectContaining({ group: 'Critical', outcome: 'passed', count: 2 }),
      expect.objectContaining({ group: 'High', outcome: 'failed', count: 1 }),
      expect.objectContaining({ group: 'Unprioritized', outcome: 'skipped', count: 1 })
    ]);
  });

  it('uses the source label when priorities are unavailable', () => {
    const result = buildJourneyCoverageSankey([
      { priority: null, source: 'manual', status: 'passed' },
      { priority: null, source: 'manual', status: 'failed' }
    ]);

    expect(result.nodes[0]).toMatchObject({ name: 'From Manual QA cases', kind: 'group' });
  });

  it.each([
    ['zero journeys', []],
    ['one journey', [{ source: 'manual', status: 'passed' }]],
    ['one distinct outcome', [
      { source: 'manual', status: 'passed' },
      { source: 'manual', status: 'passed' }
    ]]
  ])('omits the chart for %s', (_label, journeys) => {
    expect(buildJourneyCoverageSankey(journeys)).toBeNull();
  });
});

describe('journeysFromRun', () => {
  const {
    journeysFromRun,
    normalizeStep,
    systemNodesForRun
  } = loadFlowDiagram();

  it('normalizes string and object steps', () => {
    expect(normalizeStep('Open cart')).toEqual({ action: 'verify', label: 'Open cart', target: null });
    expect(normalizeStep({ action: 'click', target: 'Checkout', description: 'Click checkout' })).toEqual({
      action: 'interact',
      label: 'Click checkout',
      target: 'Checkout'
    });
  });

  it('prefers analyzer userFlows and overlays execution status', () => {
    const journeys = journeysFromRun({
      artifacts: {
        webAnalysis: {
          userFlows: [
            {
              name: 'Checkout',
              priority: 'Critical',
              steps: [{ action: 'navigate', description: 'Open home' }, { action: 'click', description: 'Pay' }]
            }
          ]
        },
        executionReport: {
          tests: [{ id: 'TC-1', title: 'Checkout completes', status: 'passed' }]
        }
      }
    });
    expect(journeys).toHaveLength(1);
    expect(journeys[0]).toMatchObject({
      name: 'Checkout',
      source: 'analyzer',
      status: 'passed'
    });
    expect(journeys[0].steps.map((s) => s.action)).toEqual(['navigate', 'interact']);
  });

  it('falls back to manual cases, then hides optional stages that were not enabled', () => {
    const journeys = journeysFromRun({
      artifacts: {
        manualTestCases: {
          testCases: [{ id: 'TC-9', scenario: 'Login', steps: ['Open /login', 'Submit'] }]
        }
      }
    });
    expect(journeys[0]).toMatchObject({ name: 'Login', source: 'manual', id: 'TC-9' });
    expect(journeys[0].steps).toHaveLength(2);

    const lanes = systemNodesForRun({
      stages: { ba: { status: 'done' }, execution: { status: 'running' }, accessibility: { status: 'pending' } }
    });
    const ids = lanes.flatMap((lane) => lane.nodes.map((n) => n.id));
    expect(ids).toContain('accessibility');
    expect(ids).not.toContain('performance');
    expect(lanes.find((l) => l.id === 'exec').nodes.find((n) => n.id === 'execution').status).toBe('running');
  });
});
