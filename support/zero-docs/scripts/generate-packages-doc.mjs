#!/usr/bin/env node
/**
 * generate-packages-doc.mjs — live-code docs for repackaged @zero/* shared packages.
 *
 * Walks packages/{domain,db,locators,builders,cloud} on disk: package.json exports,
 * facade re-exports, lib/ modules with exported symbols, folder trees, tests in test/.
 *
 *   node scripts/generate-packages-doc.mjs   (or: npm run packages-doc)
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const OUT_FILE = resolve(__dirname, '../src/data/packagesDoc.generated.ts');

const SOURCE_EXT = new Set(['.js', '.mjs', '.cjs']);
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'coverage']);

/** Packages documented on the Packages tab (analyzer has its own generator). */
const PACKAGE_DEFS = [
  {
    id: 'domain',
    dir: 'packages/domain',
    entries: [
      { file: 'index.js', role: 'unified export (stages · profiles · outputRoots)' },
      { file: 'execution.js', role: 'subpath — execution.requested protocol' },
      { file: 'outputRoots.js', role: 'subpath — dist/ output roots' },
    ],
    folderRoles: {
      lib: 'package index + shared kernel',
      'lib/stages': 'stageKeys · optionalStageKeys · RUNS_REQUESTED',
    },
    tests: ['test/domain.test.js'],
  },
  {
    id: 'db',
    dir: 'packages/db',
    entries: [
      { file: 'index.js', role: 'Postgres helpers + DDL init' },
      { file: 'runStore.js', role: 'subpath — file + DB + object-store run persistence' },
    ],
    folderRoles: {
      lib: 'public API barrel',
      'lib/schema': 'DDL table constants + initAllTables',
    },
    tests: ['test/db.config.test.js', 'test/db.persist.test.js'],
  },
  {
    id: 'locators',
    dir: 'packages/locators',
    entries: [
      { file: 'index.js', role: 'unified export (merge · elements · ecommerce)' },
      { file: 'locatorRegistry.js', role: 'subpath — profile → memory → DB merge' },
      { file: 'elementLogger.js', role: 'subpath — element-key normalizer + DB upsert' },
      { file: 'ecommerceSelectors.js', role: 'subpath — domain-aware e-commerce selectors' },
    ],
    folderRoles: {
      'lib/shared': 'hostFromUrl and shared helpers',
      'lib/merge': 'mergeSelectorCandidates · getMergedSelectors',
      'lib/elements': 'normalizeElementKey · parseElementEntry · processElementLog',
      'lib/ecommerce': 'domainSelectors data + detectDomain runtime',
    },
    tests: ['test/locators.test.js'],
  },
  {
    id: 'builders',
    dir: 'packages/builders',
    entries: [
      { file: 'index.js', role: 'unified export (Playwright + Selenium)' },
      { file: 'scriptBuilder.js', role: 'subpath — Playwright spec emitters' },
      { file: 'javaSeleniumBuilder.js', role: 'subpath — Java/Selenium class emitters' },
    ],
    folderRoles: {
      'lib/shared': 'text helpers · OTT selectors · ecommerce config',
      'lib/playwright': 'channel · test-case · ecommerce Playwright specs',
      'lib/selenium': 'Java test · class · ecommerce Selenium emitters',
    },
    tests: ['test/builders.test.js'],
  },
  {
    id: 'cloud',
    dir: 'packages/cloud',
    entries: [
      { file: 'index.js', role: 'ZERO_CLOUD bindings (objectStore · queue · secrets · cache)' },
      { file: 'http.js', role: 'subpath — local signed URL HTTP handler' },
    ],
    folderRoles: {
      lib: 'createCloudBindings · provider loader',
    },
    tests: ['test/cloud.provider.test.js', 'test/cloud.conformance.test.js', 'test/cloud.store.test.js'],
  },
];

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

function extractExports(text) {
  const reExportMatch = text.match(/module\.exports\s*=\s*require\(([^)]+)\)/);
  if (reExportMatch) {
    return { reExportsFrom: reExportMatch[1].replace(/['"]/g, '').trim(), names: [] };
  }

  const spreadMatch = text.match(/module\.exports\s*=\s*\{[\s\S]*?\.\.\./);
  if (spreadMatch) {
    return { reExportsFrom: 'lib/* (spread)', names: [] };
  }

  const objMatch = text.match(/module\.exports\s*=\s*\{([\s\S]*?)\}\s*;?\s*$/m);
  if (!objMatch) return { reExportsFrom: null, names: [] };

  const names = objMatch[1]
    .split(',')
    .map((part) => part.split(':')[0].trim())
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));

  return { reExportsFrom: null, names: [...new Set(names)] };
}

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
    walkSource(join(dir, d), [])
      .map((f) => relative(join(dir, d), f).replace(/\\/g, '/'))
      .sort()
      .slice(0, 12)
      .forEach((s) => lines.push(`│  ├─ ${s}`));
  }
  return lines.join('\n');
}

function collectLibModules(pkgDir, folderRoles) {
  const libDir = join(pkgDir, 'lib');
  if (!existsSync(libDir)) return [];

  const files = walkSource(libDir);
  const byFolder = new Map();

  for (const file of files) {
    const rel = relative(pkgDir, file).replace(/\\/g, '/');
    const folder = rel.split('/').slice(0, -1).join('/');
    const text = readText(file);
    const { names } = extractExports(text);
    if (!byFolder.has(folder)) byFolder.set(folder, []);
    byFolder.get(folder).push({ file: rel, loc: countLines(text), exports: names });
  }

  return [...byFolder.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([folder, modules]) => ({
      folder,
      role: folderRoles[folder] ?? '',
      modules: modules.sort((a, b) => a.file.localeCompare(b.file)),
    }));
}

function existingTests(testPaths) {
  return testPaths.filter((p) => existsSync(join(REPO_ROOT, p)));
}

function documentPackage(def) {
  const pkgDir = resolve(REPO_ROOT, def.dir);
  if (!existsSync(pkgDir)) return null;

  const pkg = readJson(join(pkgDir, 'package.json')) ?? {};
  const files = walkSource(pkgDir);
  const loc = files.reduce((sum, file) => sum + countLines(readText(file)), 0);

  const entries = def.entries
    .filter((e) => existsSync(join(pkgDir, e.file)))
    .map((e) => {
      const text = readText(join(pkgDir, e.file));
      const { names, reExportsFrom } = extractExports(text);
      return {
        file: e.file,
        role: e.role,
        loc: countLines(text),
        reExportsFrom,
        exports: names,
      };
    });

  return {
    id: def.id,
    generatedAt: new Date().toISOString(),
    pkg: pkg.name ?? def.id,
    version: pkg.version ?? null,
    description: pkg.description ?? '',
    main: pkg.main ?? null,
    exports: pkg.exports ?? null,
    fileCount: files.length,
    loc,
    dependencies: Object.keys(pkg.dependencies ?? {}).sort(),
    workspaceDeps: Object.keys(pkg.dependencies ?? {})
      .filter((d) => d.startsWith('@zero/'))
      .sort(),
    entries,
    modules: collectLibModules(pkgDir, def.folderRoles),
    tree: renderTree(pkgDir, def.dir),
    tests: existingTests(def.tests ?? []),
  };
}

function toTsLiteral(value) {
  return JSON.stringify(value, null, 2);
}

function main() {
  const packages = PACKAGE_DEFS.map(documentPackage).filter(Boolean);
  const generatedAt = new Date().toISOString();

  const banner =
    '// AUTO-GENERATED by scripts/generate-packages-doc.mjs — do not edit by hand.\n' +
    '// Run `npm run packages-doc` to refresh from the live packages/* tree.\n';

  const body = `${banner}
export interface PackageEntry {
  file: string;
  role: string;
  loc: number;
  reExportsFrom: string | null;
  exports: string[];
}

export interface PackageModule {
  file: string;
  loc: number;
  exports: string[];
}

export interface PackageFolder {
  folder: string;
  role: string;
  modules: PackageModule[];
}

export interface PackageDoc {
  id: string;
  generatedAt: string;
  pkg: string;
  version: string | null;
  description: string;
  main: string | null;
  exports: Record<string, string> | null;
  fileCount: number;
  loc: number;
  dependencies: string[];
  workspaceDeps: string[];
  entries: PackageEntry[];
  modules: PackageFolder[];
  tree: string;
  tests: string[];
}

export const PACKAGES_DOC: PackageDoc[] = ${toTsLiteral(packages)};
export const PACKAGES_DOC_GENERATED_AT = ${JSON.stringify(generatedAt)};
`;

  writeFileSync(OUT_FILE, body, 'utf8');
  const rel = relative(REPO_ROOT, OUT_FILE);
  process.stdout.write(
    `packages-doc: wrote ${rel} — ${packages.length} packages (generatedAt ${generatedAt})\n`,
  );
}

main();
