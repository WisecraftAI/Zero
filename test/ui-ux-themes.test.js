'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const THEME_IDS = [
  'light', 'mist', 'glacier', 'ink', 'flame', 'sage', 'sand',
  'dark', 'ocean', 'signal', 'ember', 'iris', 'rose', 'graphite', 'contrast',
];

// Palettes live in a Sass map keyed by theme id; a loop in the same partial
// turns every key into its [data-theme="..."] selector.
const themeKey = (id) => new RegExp(`^\\s*'${id}':`, 'm');

describe('multiple operator themes', () => {
  it('defines a palette for every catalog id', () => {
    const themes = read('web/src/styles/_themes.scss');
    for (const id of THEME_IDS) {
      expect(themes).toMatch(themeKey(id));
    }
  });

  it('emits a data-theme selector for every palette in the map', () => {
    const themes = read('web/src/styles/_themes.scss');
    expect(themes).toMatch(/@each\s+\$id,\s*\$tokens\s+in\s+\$themes/);
    expect(themes).toMatch(/\[data-theme="#\{\$id\}"\]/);
  });

  it('boot script accepts every catalog id before paint', () => {
    const html = read('web/index.html');
    expect(html).toMatch(/zero-theme/);
    for (const id of THEME_IDS) {
      expect(html).toMatch(new RegExp(`${id}\\s*:`));
    }
  });

  it('includes an orange theme and four additional palettes', () => {
    const themes = read('web/src/styles/_themes.scss');
    const catalog = read('web/src/lib/themes.js');
    expect(catalog).toMatch(/label: 'Orange'/);
    for (const id of ['ember', 'flame', 'sage', 'sand', 'rose', 'graphite']) {
      expect(themes).toMatch(themeKey(id));
    }
    // 'orange' is kept as an alias of the ember palette.
    expect(themes).toMatch(/\$aliases:\s*\(\s*'ember':\s*\('orange'\)/);
  });

  it('keeps a named picker with light and dark options', () => {
    const picker = read('web/src/components/ThemePicker.jsx');
    expect(picker).toMatch(/role=["']radiogroup["']/);
    expect(picker).toMatch(/Switch to light mode/);
    expect(picker).toMatch(/Switch to dark mode/);
    expect(read('web/src/components/Sidebar.jsx')).toMatch(/ThemePicker/);
  });

  it('anchors the appearance menu as a compact flyout', () => {
    const picker = read('web/src/components/ThemePicker.jsx');
    const css = read('web/src/components/ThemePicker.scss');
    expect(picker).toMatch(/sidebar--menu-open/);
    expect(picker).toMatch(/maxHeight/);
    expect(css).toMatch(/max-height:\s*min\(52vh,\s*420px\)/);
    expect(css).not.toMatch(/780px/);
    // Nested under `.sidebar`, so the modifier is written as a suffix.
    expect(read('web/src/components/Sidebar.scss')).toMatch(/&--menu-open/);
  });
});
