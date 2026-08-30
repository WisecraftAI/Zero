#!/usr/bin/env node
"use strict";

/**
 * Mirrors the brand artwork and operator palettes from web/ into the CommonJS
 * @zero/brand package, so services (which cannot import the ESM web sources,
 * and do not ship web/ in their images) can render the logo and theme colors.
 *
 * web/ stays the single source of truth:
 *   web/src/components/zeroBrandArt.js  traced SVG paths (from support/brand/trace-brand-art.py)
 *   web/src/styles/_themes.scss         the $themes map
 *   web/src/lib/themes.js               theme ids, labels and schemes
 *
 * Run after changing any of those:  npm run brand:generate
 */

const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");

const { mixOklab, flatten } = require("../packages/brand/lib/color");

const ROOT = path.join(__dirname, "..");
const OUT_DIR = path.join(ROOT, "packages", "brand", "lib");

const SOURCES = {
  art: path.join(ROOT, "web", "src", "components", "zeroBrandArt.js"),
  themesScss: path.join(ROOT, "web", "src", "styles", "_themes.scss"),
  themesJs: path.join(ROOT, "web", "src", "lib", "themes.js")
};

// Solid tokens the server needs. Gradients, shadows and washes stay in CSS.
const TOKENS = [
  "bg", "bg-sidebar", "surface", "surface-2", "surface-3",
  "border", "border-md", "border-strong",
  "text", "text-2", "text-3",
  "accent", "accent-light", "accent-dim", "accent-dark", "on-accent",
  "green", "red", "amber", "blue",
  "logo-ink", "logo-ink-lift", "logo-plate", "logo-eye",
  "logo-accent", "logo-accent-soft", "logo-accent-deep"
];

function banner(source) {
  return [
    "// GENERATED FILE -- do not edit by hand.",
    `// Source: ${source}`,
    "// Regenerate with: npm run brand:generate",
    ""
  ].join("\n");
}

/* ------------------------------------------------------------- theme values */

/**
 * Resolves one emitted `[data-theme]` block down to opaque hex. Declarations
 * arrive in cascade order, so a later duplicate wins — that is how the SCSS
 * layers a `color-mix()` value over a plain fallback.
 */
function resolveBlock(declarations) {
  const raw = new Map();
  let scheme = "light";

  for (const declaration of declarations) {
    const split = declaration.indexOf(":");
    if (split === -1) continue;
    const name = declaration.slice(0, split).trim();
    const value = declaration.slice(split + 1).trim();
    if (name === "color-scheme") scheme = value;
    else if (name.startsWith("--")) raw.set(name.slice(2), value);
  }

  const resolving = new Set();

  function resolve(name) {
    if (!raw.has(name)) return null;
    if (resolving.has(name)) throw new Error(`Circular custom property: --${name}`);
    resolving.add(name);
    try {
      return evaluate(raw.get(name));
    } finally {
      resolving.delete(name);
    }
  }

  function evaluate(value) {
    const varRef = value.match(/^var\(\s*--([a-z0-9-]+)\s*(?:,\s*(.+))?\)$/i);
    if (varRef) return resolve(varRef[1]) || (varRef[2] ? evaluate(varRef[2].trim()) : null);

    const mix = value.match(/^color-mix\(\s*in\s+oklab\s*,\s*(.+?)\s+([\d.]+)%\s*,\s*(.+?)\s*\)$/i);
    if (mix) {
      const first = evaluate(mix[1].trim());
      const second = evaluate(mix[3].trim());
      if (!first || !second) return null;
      return mixOklab(first, second, parseFloat(mix[2]) / 100);
    }

    return value;
  }

  const base = evaluate(raw.get("bg")) || (scheme === "dark" ? "#000000" : "#FFFFFF");
  const tokens = {};
  for (const token of TOKENS) {
    const value = resolve(token);
    // Translucent borders and tints are authored to sit on the page, so bake
    // them against it rather than dropping the alpha.
    if (value) tokens[camel(token)] = flatten(value, base);
  }

  return { scheme, tokens };
}

function camel(token) {
  return token.replace(/-([a-z0-9])/g, (_, char) => char.toUpperCase());
}

async function readThemeMeta() {
  const module = await import(pathToFileURL(SOURCES.themesJs).href);
  return new Map(module.THEMES.map((theme) => [theme.id, theme]));
}

async function buildPalettes() {
  const sass = await import("sass");
  const css = sass.compile(SOURCES.themesScss, { style: "expanded" }).css;
  const meta = await readThemeMeta();

  const palettes = {};
  for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)) {
    const ids = [...selector.matchAll(/\[data-theme=["']?([a-z0-9-]+)["']?\]/gi)].map((m) => m[1]);
    if (!ids.length) continue;

    const resolved = resolveBlock(body.split(";").map((part) => part.trim()).filter(Boolean));
    for (const id of ids) {
      const info = meta.get(id);
      palettes[id] = {
        id,
        label: info ? info.label : id.charAt(0).toUpperCase() + id.slice(1),
        scheme: resolved.scheme,
        ...resolved.tokens
      };
    }
  }

  const missing = [...meta.keys()].filter((id) => !palettes[id]);
  if (missing.length) throw new Error(`No emitted palette for theme id(s): ${missing.join(", ")}`);

  return palettes;
}

/* ------------------------------------------------------------------- output */

async function buildArt() {
  const module = await import(pathToFileURL(SOURCES.art).href);
  const art = {};
  for (const name of ["MARK", "ICON", "WORDMARK"]) {
    if (!module[name]) throw new Error(`${SOURCES.art} does not export ${name}`);
    art[name] = module[name];
  }
  return art;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const art = await buildArt();
  fs.writeFileSync(
    path.join(OUT_DIR, "brandArt.js"),
    `${banner("web/src/components/zeroBrandArt.js")}"use strict";\n\nmodule.exports = ${JSON.stringify(art)};\n`
  );

  const palettes = await buildPalettes();
  fs.writeFileSync(
    path.join(OUT_DIR, "palettes.js"),
    `${banner("web/src/styles/_themes.scss + web/src/lib/themes.js")}"use strict";\n\n`
    + `const PALETTES = ${JSON.stringify(palettes, null, 2)};\n\n`
    + "module.exports = { PALETTES, THEME_IDS: Object.keys(PALETTES) };\n"
  );

  const layers = Object.values(art).reduce((sum, piece) => sum + piece.layers.length, 0);
  console.log(`brandArt.js  ${Object.keys(art).length} artworks, ${layers} layers`);
  console.log(`palettes.js  ${Object.keys(palettes).length} themes, ${TOKENS.length} tokens each`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
