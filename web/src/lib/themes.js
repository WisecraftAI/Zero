export const THEME_STORAGE_KEY = 'zero-theme';

/**
 * Operator palettes. IDs must stay in sync with:
 * - [data-theme] blocks in index.css
 * - the FOWT boot script in index.html
 */
export const THEMES = [
  {
    id: 'light',
    label: 'Light',
    scheme: 'light',
    swatch: '#FFFFFF',
    accent: '#2563EB',
    themeColor: '#2563EB',
    hint: 'White canvas, sapphire',
  },
  {
    id: 'mist',
    label: 'Mist',
    scheme: 'light',
    swatch: '#E7ECF0',
    accent: '#0B6B6E',
    themeColor: '#0B6B6E',
    hint: 'Steel gray, teal',
  },
  {
    id: 'glacier',
    label: 'Glacier',
    scheme: 'light',
    swatch: '#F0F5F8',
    accent: '#0369A1',
    themeColor: '#0369A1',
    hint: 'Polar ice, sky blue',
  },
  {
    id: 'ink',
    label: 'Ink',
    scheme: 'light',
    swatch: '#F5F6FA',
    accent: '#2A378C',
    themeColor: '#2A378C',
    hint: 'Cool paper, indigo',
  },
  {
    id: 'flame',
    label: 'Orange',
    scheme: 'light',
    swatch: '#FFF4EC',
    accent: '#C2410C',
    themeColor: '#C2410C',
    hint: 'Warm paper, orange',
  },
  {
    id: 'sage',
    label: 'Sage',
    scheme: 'light',
    swatch: '#F2F5F0',
    accent: '#24663C',
    themeColor: '#24663C',
    hint: 'Pale sage, pine',
  },
  {
    id: 'sand',
    label: 'Sand',
    scheme: 'light',
    swatch: '#F6F1E8',
    accent: '#5C4A32',
    themeColor: '#5C4A32',
    hint: 'Limestone, umber',
  },
  {
    id: 'dark',
    label: 'Dark',
    scheme: 'dark',
    swatch: '#0E0F11',
    accent: '#60A5FA',
    themeColor: '#0E0F11',
    hint: 'Charcoal, ice blue',
  },
  {
    id: 'ocean',
    label: 'Ocean',
    scheme: 'dark',
    swatch: '#0A121C',
    accent: '#2EC4D6',
    themeColor: '#0A121C',
    hint: 'Navy control room, cyan',
  },
  {
    id: 'signal',
    label: 'Signal',
    scheme: 'dark',
    swatch: '#151310',
    accent: '#E0B03A',
    themeColor: '#151310',
    hint: 'Night shift, amber',
  },
  {
    id: 'ember',
    label: 'Ember',
    scheme: 'dark',
    swatch: '#17110E',
    accent: '#FF7A3D',
    themeColor: '#17110E',
    hint: 'Graphite, safety orange',
  },
  {
    id: 'iris',
    label: 'Iris',
    scheme: 'dark',
    swatch: '#121018',
    accent: '#B794F6',
    themeColor: '#121018',
    hint: 'Twilight, orchid',
  },
  {
    id: 'rose',
    label: 'Rose',
    scheme: 'dark',
    swatch: '#160E14',
    accent: '#F9A8D4',
    themeColor: '#160E14',
    hint: 'Wine dark, magenta',
  },
  {
    id: 'graphite',
    label: 'Graphite',
    scheme: 'dark',
    swatch: '#121314',
    accent: '#E8EAED',
    themeColor: '#121314',
    hint: 'Cool charcoal, silver',
  },
  {
    id: 'obsidian',
    label: 'Obsidian',
    scheme: 'dark',
    swatch: '#050507',
    accent: '#8BD5FF',
    themeColor: '#050507',
    hint: 'Black glass, ice blue',
  },
  {
    id: 'copper',
    label: 'Copper',
    scheme: 'dark',
    swatch: '#101319',
    accent: '#E66625',
    themeColor: '#101319',
    hint: 'Warm glass, ember orange',
  },
  {
    id: 'contrast',
    label: 'Contrast',
    scheme: 'dark',
    swatch: '#121212',
    accent: '#F5D90A',
    themeColor: '#121212',
    hint: 'High contrast, yellow',
  },
];

export const THEME_IDS = THEMES.map((t) => t.id);

export function isThemeId(value) {
  return THEME_IDS.includes(value);
}

export function getTheme(id) {
  return THEMES.find((t) => t.id === id) || THEMES[0];
}

export function resolveStoredTheme(stored, prefersDark) {
  if (isThemeId(stored)) return stored;
  return prefersDark ? 'dark' : 'light';
}

export function readStoredTheme() {
  try {
    return localStorage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function applyTheme(id) {
  const theme = getTheme(id);
  document.documentElement.setAttribute('data-theme', theme.id);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme.id);
  } catch {
    /* private mode */
  }
  document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
    meta.removeAttribute('media');
    meta.setAttribute('content', theme.themeColor);
  });
  return theme;
}
