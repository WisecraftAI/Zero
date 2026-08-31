'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');

describe('U3 Phase 0 guardrails', () => {
  it('enforces React hooks through the JSX runtime flat config', () => {
    const config = read('eslint.config.js');
    const pkg = JSON.parse(read('package.json'));

    expect(pkg.devDependencies).toHaveProperty('eslint-plugin-react');
    expect(pkg.devDependencies).toHaveProperty('eslint-plugin-react-hooks');
    expect(config).toMatch(/web\/\*\*\/\*\.\{js,jsx\}/);
    expect(config).toMatch(/configs\.flat\["jsx-runtime"\]/);
    expect(config).toMatch(/"react-hooks\/rules-of-hooks": "error"/);
    expect(config).toMatch(/"react-hooks\/exhaustive-deps": "error"/);
  });

  it('keeps shell chrome outside the navigation-reset boundary', () => {
    const shell = read('web/src/layouts/AppShell.jsx');
    const mainStart = shell.indexOf('<main');
    const mainEnd = shell.indexOf('</main>');
    const boundary = shell.indexOf('<ErrorBoundary');

    expect(shell.indexOf('<Sidebar')).toBeLessThan(mainStart);
    expect(shell.indexOf('<Topbar')).toBeLessThan(mainStart);
    expect(boundary).toBeGreaterThan(mainStart);
    expect(boundary).toBeLessThan(mainEnd);
    expect(shell).toMatch(/<ErrorBoundary key=\{activeView\}>/);

    const errorBoundary = read('web/src/components/ErrorBoundary.jsx');
    expect(errorBoundary).toMatch(/getDerivedStateFromError/);
    expect(errorBoundary).toMatch(/componentDidCatch/);
  });

  it('localizes all one-second elapsed updates to RunElapsed', () => {
    const app = read('web/src/App.jsx');
    const dashboard = read('web/src/views/DashboardView.jsx');
    const runDetail = read('web/src/views/RunDetailView.jsx');
    const pipeline = read('web/src/components/PipelineFlow.jsx');
    const progress = read('web/src/components/RunProgressPanel.jsx');
    const elapsed = read('web/src/components/RunElapsed.jsx');

    for (const source of [app, dashboard, runDetail, pipeline, progress]) {
      expect(source).not.toMatch(/setInterval\([^,]+,\s*1000\)/);
      expect(source).not.toMatch(/\[(?:clock|tick|now),\s*set(?:Clock|Tick|Now)\]/);
    }
    expect(pipeline).not.toMatch(/\btick\b/);
    expect(elapsed).toMatch(/setInterval\([^,]+,\s*1000\)/);
    expect(dashboard).toMatch(/<RunElapsed run=\{activeRun\}/);
    expect(progress).toMatch(/<RunElapsed/);
  });
});
