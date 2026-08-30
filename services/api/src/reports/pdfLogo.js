"use strict";

const { MARK, ICON, WORDMARK } = require("@zero/brand");

/**
 * Paints the traced brand artwork into a PDF.
 *
 * The art carries a `role` per layer instead of a color (same data the SPA
 * renders), so the logo takes the operator's palette here exactly as it does
 * in the UI. Layers overlap and must be drawn in array order.
 *
 * `logo` is a token set from `reportPalette` — the cover and the page header
 * sit on different backgrounds and so use different sets.
 */
function createLogoPainter(logo) {
  // Gradients are declared in the artwork's own coordinate space, so the active
  // transform scales them along with the paths.
  function fillFor(doc, role, art) {
    if (role === "plate") return logo.plate;
    if (role === "eye") return logo.eye;

    // The masters shade these two regions, so they get the same bottom-left to
    // top-right gradient the SVG uses rather than a flat token.
    if (role === "ink") {
      return doc.linearGradient(0, art.height, art.width, 0)
        .stop(0, logo.ink)
        .stop(1, logo.inkLift);
    }
    return doc.linearGradient(0, art.height, art.width, 0)
      .stop(0, logo.accentDeep)
      .stop(0.52, logo.accent)
      .stop(1, logo.accentSoft);
  }

  function paint(doc, art, x, y, height) {
    doc.save();
    doc.translate(x, y).scale(height / art.height);
    for (const layer of art.layers) {
      doc.path(layer.d).fill(fillFor(doc, layer.role, art));
    }
    doc.restore();
  }

  const widthAt = (art, height) => (art.width / art.height) * height;

  return {
    /** Square robot + gear mark. Legible down to roughly 14pt. */
    mark(doc, x, y, height) {
      paint(doc, MARK, x, y, height);
      return widthAt(MARK, height);
    },
    /** Full workflow ring. Needs ~40pt or more to read. */
    icon(doc, x, y, height) {
      paint(doc, ICON, x, y, height);
      return widthAt(ICON, height);
    },
    /** ZER0 wordmark. */
    wordmark(doc, x, y, height) {
      paint(doc, WORDMARK, x, y, height);
      return widthAt(WORDMARK, height);
    },
    markWidth: (height) => widthAt(MARK, height),
    iconWidth: (height) => widthAt(ICON, height),
    wordmarkWidth: (height) => widthAt(WORDMARK, height)
  };
}

module.exports = { createLogoPainter };
