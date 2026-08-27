'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('U1 operator shell', () => {
  it('has a skip link targeting main-content', () => {
    const shell = read('web/src/layouts/AppShell.jsx');
    expect(shell).toMatch(/skip-to-content/);
    expect(shell).toMatch(/href=["']#main-content["']/);
    expect(shell).toMatch(/id=["']main-content["']/);
  });

  it('exposes the active nav item to assistive tech', () => {
    const sidebar = read('web/src/components/Sidebar.jsx');
    expect(sidebar).toMatch(/aria-current/);
  });

  it('defines type and space scales plus a light theme', () => {
    const tokens = read('web/src/styles/_tokens.scss');
    expect(tokens).toMatch(/--fs-/);
    expect(tokens).toMatch(/--space-/);
    // The light palette seeds :root as well as its own data-theme selector.
    const themes = read('web/src/styles/_themes.scss');
    expect(themes).toMatch(/^\s*'light':/m);
    expect(themes).toMatch(/\$root-theme:\s*'light'/);
  });

  it('names the next theme on the toggle', () => {
    const picker = read('web/src/components/ThemePicker.jsx');
    expect(picker).toMatch(/Switch to light mode/);
    expect(picker).toMatch(/Switch to dark mode/);
    expect(picker).toMatch(/Choose theme, currently/);
  });
});
