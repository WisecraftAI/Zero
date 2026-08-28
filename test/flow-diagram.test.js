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
  src += '\nreturn { journeysFromRun, normalizeStep, systemNodesForRun, normalizeFlowStatus, flowDiagramSourceLabel, SYSTEM_LANES };';
  return new Function(src)();
}

describe('flow diagram wiring', () => {
  it('always exposes the Flow Diagram tab and renders FlowDiagram', () => {
    const view = read('web/src/views/RunDetailView.jsx');
    expect(view).toMatch(/label: 'Flow Diagram'/);
    expect(view).not.toMatch(/if \(t\.id === 'flow'\)/);
    expect(view).toMatch(/from '\.\.\/components\/FlowDiagram'/);
    expect(view).toMatch(/<FlowDiagram run=\{run\} \/>/);
    expect(view).not.toMatch(/dangerouslySetInnerHTML=\{\{ __html: run\.picture \}\}/);
  });

  it('keeps the API picture SVG aligned with current stages', () => {
    const server = read('services/api/server.js');
    expect(server).toMatch(/Web Analyzer/);
    expect(server).toMatch(/@zero\/api/);
    expect(server).toMatch(/@zero\/executor/);
    expect(server).toMatch(/Domain infer/);
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
