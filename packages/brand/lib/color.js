"use strict";

/**
 * Color helpers shared by the theme generator and by consumers that need to
 * derive tints at runtime (report tables, pill backgrounds).
 *
 * Mixing happens in Oklab because that is what `color-mix(in oklab, ...)` in
 * web/src/styles/_themes.scss uses for the logo tokens. Matching the browser
 * matters: the same accent has to produce the same artwork in the UI and in a
 * generated PDF.
 */

function clamp01(value) {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function parseColor(input) {
  if (Array.isArray(input)) return { r: input[0] / 255, g: input[1] / 255, b: input[2] / 255, a: 1 };
  const value = String(input || "").trim();

  const hex = value.match(/^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i);
  if (hex) {
    const digits = hex[1];
    const short = digits.length <= 4;
    const step = short ? 1 : 2;
    const channel = (index) => {
      const slice = digits.substr(index * step, step);
      return parseInt(short ? slice + slice : slice, 16) / 255;
    };
    return {
      r: channel(0),
      g: channel(1),
      b: channel(2),
      a: digits.length === 4 || digits.length === 8 ? channel(3) : 1
    };
  }

  const rgb = value.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const parts = rgb[1].split(/[,/\s]+/).filter(Boolean);
    const channel = (part) => (
      part.endsWith("%") ? parseFloat(part) / 100 : parseFloat(part) / 255
    );
    return {
      r: clamp01(channel(parts[0])),
      g: clamp01(channel(parts[1])),
      b: clamp01(channel(parts[2])),
      a: parts.length > 3 ? clamp01(parseFloat(parts[3])) : 1
    };
  }

  return null;
}

function toHex(color) {
  const channel = (value) => {
    const byte = Math.round(clamp01(value) * 255);
    return byte.toString(16).padStart(2, "0");
  };
  return `#${channel(color.r)}${channel(color.g)}${channel(color.b)}`.toUpperCase();
}

function srgbToLinear(value) {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(value) {
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
}

function rgbToOklab({ r, g, b }) {
  const lr = srgbToLinear(r);
  const lg = srgbToLinear(g);
  const lb = srgbToLinear(b);

  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);

  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}

function oklabToRgb({ L, a, b }) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  return {
    r: clamp01(linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s)),
    g: clamp01(linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s)),
    b: clamp01(linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s)),
    a: 1
  };
}

/** `color-mix(in oklab, first <weight>, second)` — weight is 0..1 for `first`. */
function mixOklab(first, second, weight) {
  const a = parseColor(first);
  const b = parseColor(second);
  if (!a || !b) return toHex(a || b || { r: 0, g: 0, b: 0 });

  const ta = rgbToOklab(a);
  const tb = rgbToOklab(b);
  const w = clamp01(weight);
  return toHex(oklabToRgb({
    L: ta.L * w + tb.L * (1 - w),
    a: ta.a * w + tb.a * (1 - w),
    b: ta.b * w + tb.b * (1 - w)
  }));
}

/** Lay a possibly-translucent color over an opaque one. */
function flatten(color, backdrop) {
  const top = parseColor(color);
  const base = parseColor(backdrop) || { r: 1, g: 1, b: 1, a: 1 };
  if (!top) return toHex(base);
  const alpha = top.a;
  return toHex({
    r: top.r * alpha + base.r * (1 - alpha),
    g: top.g * alpha + base.g * (1 - alpha),
    b: top.b * alpha + base.b * (1 - alpha)
  });
}

/** Perceived lightness, 0 (black) to 1 (white). */
function lightness(color) {
  const parsed = parseColor(color);
  if (!parsed) return 0;
  return rgbToOklab(parsed).L;
}

function isDark(color) {
  return lightness(color) < 0.55;
}

/** Pick whichever of two inks reads better on `background`. */
function readableOn(background, darkInk = "#0F172A", lightInk = "#FFFFFF") {
  return isDark(background) ? lightInk : darkInk;
}

module.exports = {
  parseColor,
  toHex,
  mixOklab,
  flatten,
  lightness,
  isDark,
  readableOn
};
