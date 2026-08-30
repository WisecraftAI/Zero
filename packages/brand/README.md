# @zero/brand

Brand artwork and operator theme palettes, in CommonJS, for services that render
ZER0 branding outside the browser — today the themed PDF report in
`services/api/src/reports/`.

## Why this package exists

`web/` owns the brand: the traced logo paths and the `$themes` map live there and
the SPA renders them. Services cannot reuse those sources directly — they are
ESM, and the API image does not ship `web/`. This package is the server-side
mirror.

## Contents

| File | Origin | Hand-editable |
|------|--------|---------------|
| `lib/brandArt.js` | `web/src/components/zeroBrandArt.js` | no — generated |
| `lib/palettes.js` | `web/src/styles/_themes.scss` + `web/src/lib/themes.js` | no — generated |
| `lib/color.js` | — | yes |
| `lib/reportPalette.js` | — | yes |

`lib/brandArt.js` exports `MARK`, `ICON` and `WORDMARK`. Each is
`{ width, height, layers: [{ role, d }] }`, where `role` is one of `accent`,
`ink`, `plate` or `eye`. Layers overlap and **must** be drawn in array order.

`lib/palettes.js` exports `PALETTES`, keyed by the same theme id the SPA writes
to `<html data-theme>`. Every value is opaque hex: translucent tokens are baked
against the theme background and `color-mix(in oklab, ...)` is resolved with the
same math the browser uses, so server-rendered artwork matches the UI.

## Regenerating

Run this after changing the logo master, `_themes.scss`, or the theme list:

```bash
npm run brand:generate
```

The generated files are committed, because nothing regenerates them at install
or image build time.

The logo masters and their tracer live in `support/brand/`.

## Usage

```js
const { reportPalette, MARK } = require("@zero/brand");

// "theme" (default) reproduces the palette, dark backgrounds included.
// "light" keeps the theme's accent and logo but prints on white.
const palette = reportPalette("ocean", { paper: "light" });
```
