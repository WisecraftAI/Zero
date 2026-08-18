#!/usr/bin/env node
/**
 * generate-analyzer-doc.mjs — live-code doc for the @zero/analyzer package.
 *
 * Walks packages/analyzer on disk and reads real facts: package.json (name,
 * version, description, main), the three facade entries and what each exports,
 * every lib/ module grouped by folder with its exported symbols, a folder tree,
 * plus file/LOC totals. The Packages tab (Analyzer sub-menu) renders this so the
 * doc always mirrors the shipped code — never hand-written drift.
 *
 *   node scripts/generate-analyzer-doc.mjs      (or: npm run analyser-doc)
 *
 * Nothing here is invented: if a fact is not on disk it is omitted.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const PKG_DIR = resolve(REPO_ROOT, 'packages/analyzer');
const OUT_FILE = resolve(__dirname, '../src/data/analyzerDoc.generated.ts');

const SOURCE_EXT = new Set(['.js', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

/** Facade entries and the crawl strategy each one exposes. */
const ENTRIES = [
  { file: 'index.js', strategy: 'default (re-exports Pro)' },
  { file: 'urlAnalyzerPro.js', strategy: 'Pro — deep Playwright crawl' },
  { file: 'urlAnalyzer.js', strategy: 'Light — heuristic crawl' },
];

/** Human-readable role for each lib/ folder. */
const FOLDER_ROLES = {
  'lib/crawl': 'Playwright DOM readers (elements · forms · structure · signals)',
  'lib/classify': 'website-type detection',
  'lib/flows': 'user-journey detection (light · pro)',
  'lib/flows/pro': 'pro flow builders (common · form · type · helpers)',
  'lib/generate': 'BRD + suggested test cases (light · pro)',
  'lib/format': 'shape analysis for the BA agent',
  'lib/strategies': 'crawl orchestration (light · pro)',
  lib: 'shared constants + selector helpers',
};

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

function countLines(text) {
  return text.length === 0 ? 0 : text.split('\n').length;
}

/**
 * Extract the exported symbol names from a CommonJS module. Handles both
 * `module.exports = { a, b, c }` object literals and `module.exports = require('x')`.
 */
function extractExports(text) {
  const reExportMatch = text.match(/module\.exports\s*=\s*require\(([^)]+)\)/);
  if (reExportMatch) {
    const target = reExportMatch[1].replace(/['"]/g, '').trim();
    return { reExportsFrom: target, names: [] };
  }

  const objMatch = text.match(/module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?\s*$/m);
  if (!objMatch) return { reExportsFrom: null, names: [] };

  const names = objMatch[1]
    .split(',')
    .map((part) => part.split(':')[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

  return { reExportsFrom: null, names: [...new Set(names)] };
}

/** Recursively gather source files under the package. */
function walkSource(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name.startsWith('.')) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walkSource(full, out);
    } else if (entry.isFile() && SOURCE_EXT.has(extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

/** Two-level folder tree of the package. */
function renderTree(dir, rootLabel) {
  const lines = [`${rootLabel}/`];
  const topEntries = readdirSync(dir, { withFileTypes: true });
  const topFiles = topEntries
    .filter((e) => e.isFile() && SOURCE_EXT.has(extname(e.name)))
    .map((e) => e.name)
    .sort();
  const dirs = topEntries
    .filter((e) => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();

  for (const name of topFiles) lines.push(`├─ ${name}`);
  for (const d of dirs) {
    lines.push(`├─ ${d}/`);
    const sub = readdirSync(join(dir, d), { withFileTypes: true })
      .filter((e) => !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort();
    for (const s of sub) lines.push(`│  ├─ ${s}`);
  }
  return lines.join('\n');
}

/** Collect lib/ modules grouped by folder, each with its exported symbols. */
function collectModules() {
  const files = walkSource(join(PKG_DIR, 'lib'));
  const byFolder = new Map();

  for (const file of files) {
    const rel = relative(PKG_DIR, file).replace(/\\/g, '/');
    const folder = rel.split('/').slice(0, -1).join('/');
    const text = readText(file);
    const { names } = extractExports(text);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push({
      file: rel,
      loc: countLines(text),
      exports: names,
    });
  }

  return [...byFolder.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, modules]) => ({
      folder,
      role: FOLDER_ROLES[folder] ?? '',
      modules: modules.sort((a, b) => a.file.localeCompare(b.file)),
    }));
}

function toTsLiteral(value) {
  return JSON.stringify(value, null, 2);
}

function main() {
  if (!existsSync(PKG_DIR)) {
    process.stderr.write('analyser-doc: packages/analyzer not found — nothing to generate\n');
    process.exit(1);
  }

  const pkg = readJson(join(PKG_DIR, 'package.json')) ?? {};
  const files = walkSource(PKG_DIR);
  const loc = files.reduce((sum, file) => sum + countLines(readText(file)), 0);

  const entries = ENTRIES.filter((e) => existsSync(join(PKG_DIR, e.file))).map((e) => {
    const text = readText(join(PKG_DIR, e.file));
    const { names, reExportsFrom } = extractExports(text);
    return {
      file: e.file,
      strategy: e.strategy,
      loc: countLines(text),
      reExportsFrom,
      exports: names,
    };
  });

  const generatedAt = new Date().toISOString();
  const doc = {
    generatedAt,
    pkg: pkg.name ?? '@zero/analyzer',
    version: pkg.version ?? null,
    description: pkg.description ?? '',
    main: pkg.main ?? null,
    fileCount: files.length,
    loc,
    dependencies: Object.keys(pkg.dependencies ?? {}).sort(),
    entries,
    modules: collectModules(),
    tree: renderTree(PKG_DIR, 'packages/analyzer'),
  };

  const banner =
    '// AUTO-GENERATED by scripts/generate-analyzer-doc.mjs — do not edit by hand.\n' +
    '// Run `npm run analyser-doc` to refresh from the live packages/analyzer tree.\n';

  const body = `${banner}
export interface AnalyzerEntry {
  file: string;
  strategy: string;
  loc: number;
  reExportsFrom: string | null;
  exports: string[];
}

export interface AnalyzerModule {
  file: string;
  loc: number;
  exports: string[];
}

export interface AnalyzerFolder {
  folder: string;
  role: string;
  modules: AnalyzerModule[];
}

export interface AnalyzerDoc {
  generatedAt: string;
  pkg: string;
  version: string | null;
  description: string;
  main: string | null;
  fileCount: number;
  loc: number;
  dependencies: string[];
  entries: AnalyzerEntry[];
  modules: AnalyzerFolder[];
  tree: string;
}

export const ANALYZER_DOC: AnalyzerDoc = ${toTsLiteral(doc)};
`;

  writeFileSync(OUT_FILE, body, 'utf8');
  const rel = relative(REPO_ROOT, OUT_FILE);
  process.stdout.write(
    `analyser-doc: wrote ${rel} — ${doc.fileCount} files, ${doc.loc.toLocaleString()} LOC, ` +
      `${entries.length} entries, ${doc.modules.length} lib folders (generatedAt ${generatedAt})\n`,
  );
}

main();
