'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('U2 low-friction canvas', () => {
  it('uses a single-canvas New Run class', () => {
    const view = read('web/src/views/NewRunView.jsx');
    expect(view).toMatch(/nrv--canvas/);
  });

  it('discloses secondary fields without new modals', () => {
    const view = read('web/src/views/NewRunView.jsx');
    expect(view).toMatch(/nrv-disclose/);
    expect(view).toMatch(/<details/);
    expect(view).not.toMatch(/modal-overlay|ConfigModal/);
  });

  it('keeps Run as an always-on native submit', () => {
    const view = read('web/src/views/NewRunView.jsx');
    expect(view).toMatch(/type=["']submit["']/);
    expect(view).toMatch(/btn-launch/);
    expect(view).not.toMatch(
      /step\s*<\s*STEPS\.length\s*-\s*1\s*\?\s*[\s\S]{0,180}type=["']submit["']/
    );
  });

  it('expands the rail on hover or focus-within', () => {
    const css = read('web/src/components/Sidebar.scss');
    // Both states are nested under `.sidebar`.
    expect(css).toMatch(/^\s*&:hover,$/m);
    expect(css).toMatch(/^\s*&:focus-within\s*\{$/m);
    expect(css).toMatch(/768px/);
  });

  it('preserves New Run field names', () => {
    const view = read('web/src/views/NewRunView.jsx');
    for (const name of [
      'ottUrl',
      'channelProfile',
      'notes',
      'tcFile',
      'assertions',
      'loginUsername',
      'loginPassword',
      'runHeaded',
      'enableAccessibility',
      'enablePerformance',
      'enableSecurity',
      'recordingFile',
    ]) {
      expect(view).toContain(`name="${name}"`);
    }
  });

  it('uses a simple two-step wizard and surfaces extra checks', () => {
    const view = read('web/src/views/NewRunView.jsx');
    const css = read('web/src/views/NewRunView.scss');
    expect(view).toMatch(/nrv-wizard/);
    expect(view).toMatch(/nrv-checks/);
    expect(view).toMatch(/New run steps/);
    expect(css).toMatch(/--measure-wide/);
    expect(css).toMatch(/grid-template-columns:\s*minmax/);
  });
});
