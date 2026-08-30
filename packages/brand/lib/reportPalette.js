"use strict";

const { PALETTES, THEME_IDS } = require("./palettes");
const { mixOklab, readableOn, isDark } = require("./color");

const DEFAULT_THEME = "light";

/**
 * Neutral paper for themes whose own background is too dark to print. Callers
 * ask for this with `paper: "light"`; the accent, chart colors and logo still
 * come from the selected theme, so the document stays recognisable.
 */
const LIGHT_PAPER = {
  bg: "#FFFFFF",
  surface: "#F8FAFC",
  surface2: "#F1F5F9",
  surface3: "#E7ECF3",
  border: "#E2E8F0",
  text: "#0F172A",
  text2: "#334155",
  text3: "#7A8798"
};

function resolveThemeId(themeId) {
  const key = String(themeId || "").trim().toLowerCase();
  return THEME_IDS.includes(key) ? key : DEFAULT_THEME;
}

/**
 * Mirrors the `--logo-*` derivation in web/src/styles/_themes.scss.
 *
 * The theme's own tokens are used whenever the paper matches the palette's
 * scheme, so the artwork is pixel-identical to the UI. When light paper is
 * forced onto a dark palette they have to be re-derived: that palette's ink is
 * near-white, which would leave the letterforms invisible on white.
 */
function logoTokensFor(theme, paperScheme) {
  if (paperScheme === theme.scheme) {
    return {
      ink: theme.logoInk,
      inkLift: theme.logoInkLift,
      plate: theme.logoPlate,
      eye: theme.logoEye
    };
  }

  if (paperScheme === "dark") {
    return {
      ink: mixOklab(theme.accent, "#F4F7FB", 0.2),
      inkLift: "#FFFFFF",
      plate: mixOklab(theme.accent, "#05070E", 0.24),
      eye: mixOklab(theme.accent, "#05070E", 0.72)
    };
  }

  return {
    ink: mixOklab(theme.accent, "#05070E", 0.4),
    inkLift: mixOklab(theme.accent, "#05070E", 0.66),
    plate: mixOklab(theme.accent, "#FFFFFF", 0.04),
    eye: theme.accentLight
  };
}

function paperFor(theme, mode) {
  if (mode === "light") {
    return { ...LIGHT_PAPER, scheme: "light" };
  }
  return {
    bg: theme.bg,
    surface: theme.surface,
    surface2: theme.surface2,
    surface3: theme.surface3,
    border: theme.borderMd || theme.border,
    text: theme.text,
    text2: theme.text2,
    text3: theme.text3,
    scheme: theme.scheme
  };
}

/**
 * Builds the color set a generated report needs from an operator theme id.
 *
 * `paper`:
 *   "theme" (default) reproduces the selected palette, dark backgrounds included
 *   "light"           keeps theme accents but prints on white
 */
function reportPalette(themeId, options = {}) {
  const id = resolveThemeId(themeId);
  const theme = PALETTES[id];
  const paper = paperFor(theme, options.paper === "light" ? "light" : "theme");

  const page = paper.bg;
  const ink = paper.text;

  // Status colors are authored against the theme's own background. On forced
  // light paper they need re-seating so they stay legible.
  const seat = (color) => (
    paper.scheme === theme.scheme ? color : mixOklab(color, ink, 0.78)
  );

  const accent = seat(theme.accent);
  const green = seat(theme.green);
  const red = seat(theme.red);
  const amber = seat(theme.amber);
  const blue = seat(theme.blue);

  const tint = (color, amount = 0.16) => mixOklab(color, page, amount);
  const coverBg = theme.bg;
  const coverInk = readableOn(coverBg, theme.text, "#FFFFFF");
  const coverField = (amount) => mixOklab(theme.accent, coverBg, amount);

  return {
    id,
    label: theme.label,
    scheme: paper.scheme,
    paper: options.paper === "light" ? "light" : "theme",
    inverted: isDark(page),

    page,
    surface: paper.surface2,
    surfaceAlt: paper.surface3,
    line: paper.border,
    lineSoft: mixOklab(paper.border, page, 0.5),

    ink,
    body: paper.text2,
    muted: paper.text2,
    faint: paper.text3,

    brand: accent,
    brandSoft: seat(theme.accentLight),
    brandDeep: seat(theme.accentDark),

    pass: green,
    passBg: tint(green),
    fail: red,
    failBg: tint(red),
    skip: amber,
    skipBg: tint(amber),
    info: blue,
    infoBg: tint(blue),
    neutral: paper.text2,
    neutralBg: tint(paper.text2, 0.13),

    // Dark band on light paper, lifted band on dark paper — either way the
    // header has to separate from the rows behind it.
    tableHeaderBg: isDark(page)
      ? mixOklab(theme.accent, page, 0.3)
      : mixOklab(ink, accent, 0.82),
    tableHeaderInk: isDark(page)
      ? readableOn(mixOklab(theme.accent, page, 0.3))
      : readableOn(mixOklab(ink, accent, 0.82)),

    cover: {
      bg: coverBg,
      washNear: coverField(0.1),
      washFar: coverField(0.22),
      rule: theme.accent,
      ink: coverInk,
      subtle: mixOklab(theme.accent, coverInk, 0.45),
      cardBg: coverField(0.09),
      cardLine: coverField(0.26),
      cardLabel: mixOklab(theme.accent, coverInk, 0.6),
      divider: coverField(0.24),
      meta: mixOklab(coverInk, coverBg, 0.6)
    },

    logo: {
      ...logoTokensFor(theme, paper.scheme),
      accent: theme.logoAccent,
      accentSoft: theme.logoAccentSoft,
      accentDeep: theme.logoAccentDeep
    },

    // The cover keeps the palette's own background, so the artwork there always
    // uses the tokens the theme authored.
    coverLogo: {
      ink: theme.logoInk,
      inkLift: theme.logoInkLift,
      plate: theme.logoPlate,
      eye: theme.logoEye,
      accent: theme.logoAccent,
      accentSoft: theme.logoAccentSoft,
      accentDeep: theme.logoAccentDeep
    }
  };
}

module.exports = { reportPalette, resolveThemeId, DEFAULT_THEME };
