"use strict";

const { reportPalette } = require("@zero/brand");

const PAGE = {
  size: "A4",
  layout: "landscape",
  margins: { top: 62, bottom: 52, left: 40, right: 40 }
};

const WIDTH = 841.89;
const HEIGHT = 595.28;
const CONTENT_LEFT = PAGE.margins.left;
const CONTENT_RIGHT = WIDTH - PAGE.margins.right;
const CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT;
const CONTENT_BOTTOM = HEIGHT - PAGE.margins.bottom;

const FONT = {
  regular: "Helvetica",
  bold: "Helvetica-Bold",
  italic: "Helvetica-Oblique"
};

// Standard PDF fonts are WinAnsi-encoded, so glyphs outside that range render as
// noise. Crawled page titles and LLM prose routinely contain them.
const GLYPH_REPLACEMENTS = [
  [/[\u2018\u2019\u201A\u2032]/g, "'"],
  [/[\u201C\u201D\u201E\u2033]/g, '"'],
  [/[\u2013\u2014]/g, "-"],
  [/[\u2192\u21D2]/g, "->"],
  [/[\u2190\u21D0]/g, "<-"],
  [/[\u2022\u25CF\u25AA]/g, "-"],
  [/[\u2026]/g, "..."],
  [/[\u00A0\u202F\u2009]/g, " "],
  [/[\u2713\u2714]/g, "OK"],
  [/[\u2717\u2718\u2715]/g, "X"]
];

function safe(value, max = 0) {
  if (value === null || value === undefined) return "";
  let text = String(value);
  for (const [pattern, replacement] of GLYPH_REPLACEMENTS) {
    text = text.replace(pattern, replacement);
  }
  text = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, " ");
  text = text.replace(/[^\u0020-\u007E\u00A1-\u00FF\n]/g, "");
  text = text.replace(/[ \t]+/g, " ").trim();
  if (max > 0 && text.length > max) return `${text.slice(0, max - 1).trimEnd()}...`;
  return text;
}

/**
 * Resolves the operator's selected theme into everything the renderer needs.
 * Built per request and threaded through explicitly — never module state, so
 * two concurrent downloads cannot pick up each other's colors.
 */
function createPalette(themeId, options) {
  const C = reportPalette(themeId, options);

  const statusTones = {
    passed: { fg: C.pass, bg: C.passBg },
    pass: { fg: C.pass, bg: C.passBg },
    done: { fg: C.pass, bg: C.passBg },
    failed: { fg: C.fail, bg: C.failBg },
    fail: { fg: C.fail, bg: C.failBg },
    critical: { fg: C.fail, bg: C.failBg },
    high: { fg: C.fail, bg: C.failBg },
    error: { fg: C.fail, bg: C.failBg },
    skipped: { fg: C.skip, bg: C.skipBg },
    warning: { fg: C.skip, bg: C.skipBg },
    warn: { fg: C.skip, bg: C.skipBg },
    medium: { fg: C.skip, bg: C.skipBg },
    stopped: { fg: C.skip, bg: C.skipBg },
    running: { fg: C.info, bg: C.infoBg },
    info: { fg: C.info, bg: C.infoBg },
    low: { fg: C.info, bg: C.infoBg }
  };

  // "High" means "urgent" for a priority but "severe" for a vulnerability, so
  // the two scales get different palettes.
  const priorityTones = {
    critical: { fg: C.fail, bg: C.failBg },
    blocker: { fg: C.fail, bg: C.failBg },
    high: { fg: C.skip, bg: C.skipBg },
    medium: { fg: C.info, bg: C.infoBg },
    low: { fg: C.neutral, bg: C.neutralBg }
  };

  const verdictTones = {
    go: { fg: C.pass, bg: C.passBg },
    "conditional go": { fg: C.skip, bg: C.skipBg },
    hold: { fg: C.fail, bg: C.failBg },
    "no-go": { fg: C.fail, bg: C.failBg }
  };

  const fallback = { fg: C.neutral, bg: C.neutralBg };

  C.toneFor = (status, kind = "status") => {
    const key = String(status || "").toLowerCase();
    if (kind === "priority" && priorityTones[key]) return priorityTones[key];
    return statusTones[key] || fallback;
  };
  C.verdictTone = (verdict) => verdictTones[String(verdict || "").toLowerCase()] || fallback;

  return C;
}

module.exports = {
  PAGE,
  WIDTH,
  HEIGHT,
  CONTENT_LEFT,
  CONTENT_RIGHT,
  CONTENT_WIDTH,
  CONTENT_BOTTOM,
  FONT,
  safe,
  createPalette
};
