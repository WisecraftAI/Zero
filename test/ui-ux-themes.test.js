'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const THEME_IDS = [
  'light', 'mist', 'glacier', 'ink', 'flame', 'sage', 'sand',
  'dark', 'ocean', 'signal', 'ember', 'iris', 'rose', 'graphite', 'obsidian', 'copper', 'contrast',
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

  it('opts the black glass palette into frosted chrome', () => {
    const themes = read('web/src/styles/_themes.scss');
    const glass = read('web/src/styles/_glass.scss');
    // The `glass-blur` token is what the glass layer keys off, so a palette
    // never gets a compositing layer it did not ask for.
    expect(themes).toMatch(/'obsidian':\s*\([\s\S]*?'glass-blur'/);
    expect(glass).toMatch(/map\.has-key\(\$tokens,\s*'glass-blur'\)/);
    expect(glass).toMatch(/backdrop-filter:\s*blur\(var\(--glass-blur\)\)/);
    expect(read('web/src/index.scss')).toMatch(/@use 'styles\/glass'/);
  });

  it('keeps a named picker with light and dark options', () => {
    const picker = read('web/src/components/ThemePicker.jsx');
    expect(picker).toMatch(/role=["']radiogroup["']/);
    expect(picker).toMatch(/Switch to light mode/);
    expect(picker).toMatch(/Switch to dark mode/);
    expect(read('web/src/components/Sidebar.jsx')).toMatch(/ThemePicker/);
  });

  it('derives the brand artwork from the palette accent rather than one bitmap per colorway', () => {
    const themes = read('web/src/styles/_themes.scss');
    const logo = read('web/src/components/ZeroLogo.jsx');
    const css = read('web/src/components/ZeroLogo.scss');

    // No artwork is addressed by URL any more, so a palette cannot fall back
    // to a fixed colorway.
    expect(themes).not.toMatch(/--logo-[\w-]+:\s*url\(/);

    // Both color-scheme branches mix the palette's own accent, which is what
    // themes a palette added later without a second edit here.
    expect(themes.match(/--logo-ink:\s*color-mix\(in oklab, var\(--accent\)/g)).toHaveLength(2);
    expect(themes.match(/--logo-plate:\s*color-mix\(in oklab, var\(--accent\)/g)).toHaveLength(2);
    expect(themes).toMatch(/--logo-accent:\s*var\(--accent\)/);

    // Engines without color-mix() need the plain declaration ahead of it, or
    // they drop the value and leave the artwork unpainted.
    expect(themes).toMatch(/--logo-ink:\s*var\(--text\);\s*--logo-ink:\s*color-mix/);

    // Every traced region is filled from a token.
    expect(logo).toMatch(/fill=\{fills\[layer\.role\]\}/);
    expect(logo).toMatch(/plate:\s*'var\(--logo-plate\)'/);
    expect(logo).toMatch(/eye:\s*'var\(--logo-eye\)'/);

    // No brightness or plate workarounds: they washed out the cyan eyes and
    // the gradient O.
    expect(css).not.toMatch(/filter:\s*var\(--logo/);
  });

});
