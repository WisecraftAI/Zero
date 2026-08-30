'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('run stop UI', () => {
  it('exposes Stop on the dashboard live hero and history rows', () => {
    const view = read('web/src/views/DashboardView.jsx');
    expect(view).toMatch(/StopRunButton/);
    expect(view).toMatch(/onStopRun/);
    expect(view).toMatch(/dash-hero--active/);
  });

  it('wires POST /runs/:id/stop from the app shell', () => {
    const app = read('web/src/App.jsx');
    expect(app).toMatch(/\/runs\/\$\{runId\}\/stop/);
    expect(app).toMatch(/handleStopRun/);
    expect(app).toMatch(/onStopRun=\{handleStopRun\}/);
    expect(app).toMatch(/setRunActionError/);
  });

  it('surfaces run loading and action failures to operators', () => {
    const app = read('web/src/App.jsx');
    const detail = read('web/src/views/RunDetailView.jsx');

    expect(app).toMatch(/Run not found/);
    expect(app).toMatch(/res\.ok/);
    expect(detail).toMatch(/role="alert"/);
    expect(detail).toMatch(/Back to runs/);
  });
});
