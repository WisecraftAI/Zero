#!/usr/bin/env node
/**
 * generate-lld.mjs — ZER0's compodoc-style, agent-free LLD generator.
 *
 * Walks every workspace on disk (services/*, packages/*, web/) and reads real facts
 * from package.json + source files: npm name, description, entry, scripts,
 * runtime/dev/workspace dependencies, file counts, lines of code, a two-level
 * folder tree, and whether the workspace ships a Dockerfile or tests.
 *
 * It also reads the agent-workflow roadmap (support/agent-workflow/progress.json
 * + milestones/*.md) and maps each milestone to the workspaces it touches, so the
 * Tech tab can show per-workspace next-steps (done / pending, sequential order)
 * without an agent in the loop.
 *
 * Output: src/data/generated.ts — a typed module the Tech Stack tab imports to
 * render the *current* state of the codebase (GENERATED_LLD) and the roadmap
 * (GENERATED_WORKFLOW).
 *
 *   node scripts/generate-lld.mjs      (or: npm run docs)
 *
 * Nothing here is invented: if a fact is not on disk it is omitted.
 */
import { readFileSync, readdirSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve, relative, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../..');
const OUT_FILE = resolve(__dirname, '../src/data/generated.ts');

const SOURCE_EXT = new Set(['.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.scss', '.css']);
const IGNORE_DIRS = new Set([
  'node_modules', '.git', 'dist', 'coverage', 'build', '.next', '.turbo', '.cache',
]);

/** Workspaces to document, in reading order. Kind drives grouping in the UI. */
const WORKSPACES = [
  { id: 'api',          path: 'services/api',          kind: 'app' },
  { id: 'orchestrator', path: 'services/orchestrator', kind: 'app' },
  { id: 'executor',     path: 'services/executor',     kind: 'app' },
  { id: 'web',          path: 'web',               kind: 'web' },
  { id: 'cloud',        path: 'packages/cloud',    kind: 'package' },
  { id: 'domain',       path: 'packages/domain',   kind: 'package' },
  { id: 'db',           path: 'packages/db',       kind: 'package' },
  { id: 'locators',     path: 'packages/locators', kind: 'package' },
  { id: 'builders',     path: 'packages/builders', kind: 'package' },
  { id: 'analyzer',     path: 'packages/analyzer', kind: 'package' },
];

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function countLines(file) {
  try {
    const text = readFileSync(file, 'utf8');
    if (text.length === 0) return 0;
    return text.split('\n').length;
  } catch {
    return 0;
  }
}

/** Recursively collect source-file stats for a workspace. */
function scanSource(dir) {
  const filesByExt = {};
  let fileCount = 0;
  let loc = 0;
  const walk = (current) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith('.') && entry.name !== '.') continue;
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile()) {
        const ext = extname(entry.name);
        if (!SOURCE_EXT.has(ext)) continue;
        filesByExt[ext] = (filesByExt[ext] ?? 0) + 1;
        fileCount += 1;
        loc += countLines(full);
      }
    }
  };
  walk(dir);
  return { filesByExt, fileCount, loc };
}

/** Render a two-level folder tree (dirs + a few notable top files). */
function renderTree(dir, wsPath) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return `${wsPath}/  (unreadable)`;
  }
  const dirs = entries
    .filter((e) => e.isDirectory() && !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
    .map((e) => e.name)
    .sort();
  const topFiles = entries
    .filter((e) => e.isFile() && SOURCE_EXT.has(extname(e.name)))
    .map((e) => e.name)
    .sort();

  const lines = [`${wsPath}/`];
  for (const name of topFiles) lines.push(`├─ ${name}`);
  for (const d of dirs) {
    lines.push(`├─ ${d}/`);
    let sub;
    try {
      sub = readdirSync(join(dir, d), { withFileTypes: true });
    } catch {
      sub = [];
    }
    const subNames = sub
      .filter((e) => !IGNORE_DIRS.has(e.name) && !e.name.startsWith('.'))
      .map((e) => (e.isDirectory() ? `${e.name}/` : e.name))
      .sort()
      .slice(0, 8);
    for (const s of subNames) lines.push(`│  ├─ ${s}`);
  }
  return lines.join('\n');
}

function collectDeps(pkg) {
  const runtime = Object.keys(pkg?.dependencies ?? {}).sort();
  const dev = Object.keys(pkg?.devDependencies ?? {}).sort();
  const workspaceDeps = runtime.filter((d) => d.startsWith('@zero/'));
  const runtimeExternal = runtime.filter((d) => !d.startsWith('@zero/'));
  return { runtimeExternal, dev, workspaceDeps };
}

function analyzeWorkspace(ws) {
  const abs = join(REPO_ROOT, ws.path);
  if (!existsSync(abs)) {
    return { ...ws, missing: true };
  }
  const pkg = readJson(join(abs, 'package.json')) ?? {};
  const { filesByExt, fileCount, loc } = scanSource(abs);
  const { runtimeExternal, dev, workspaceDeps } = collectDeps(pkg);
  const hasDockerfile = existsSync(join(abs, 'Dockerfile'));
  const hasTests =
    existsSync(join(abs, 'test')) ||
    existsSync(join(abs, '__tests__')) ||
    Object.keys(pkg.scripts ?? {}).some((s) => s.includes('test'));

  return {
    id: ws.id,
    kind: ws.kind,
    path: ws.path,
    pkg: pkg.name ?? '(no package.json)',
    version: pkg.version ?? null,
    description: pkg.description ?? '',
    entry: pkg.main ?? null,
    scripts: Object.keys(pkg.scripts ?? {}).sort(),
    runtimeDeps: runtimeExternal,
    workspaceDeps,
    devDeps: dev,
    fileCount,
    loc,
    filesByExt,
    hasDockerfile,
    hasTests,
    tree: renderTree(abs, ws.path),
  };
}

function toTsLiteral(value) {
  return JSON.stringify(value, null, 2);
}

const AGENT_WORKFLOW = resolve(REPO_ROOT, 'support/agent-workflow');

/**
 * Substrings that tie a milestone spec to a workspace. Kept conservative: real
 * folder paths and npm package names first, plus a few legacy monolith tokens
 * (server.js, lib/db) that older capability specs still reference by name.
 */
const WORKSPACE_TOKENS = {
  api: ['services/api', '@zero/api', 'server.js'],
  orchestrator: ['services/orchestrator', '@zero/orchestrator', 'processRun', 'lib/orchestrator', 'lib/llm', 'runs.requested'],
  executor: ['services/executor', '@zero/executor', 'lib/execution', 'execution.requested', 'chromium', 'Chromium'],
  web: ['web/', '@zero/web'],
  cloud: ['packages/cloud', '@zero/cloud', 'lib/cloud'],
  domain: ['packages/domain', '@zero/domain', 'stageKeys', 'appProfiles'],
  db: ['packages/db', '@zero/db', 'lib/db', 'qa_runs', 'qa_assets', 'DATABASE_URL'],
  locators: ['packages/locators', '@zero/locators', 'element_locators'],
  builders: ['packages/builders', '@zero/builders'],
  analyzer: ['packages/analyzer', '@zero/analyzer'],
};

function readText(file) {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return '';
  }
}

/** First non-heading, non-empty line of a milestone spec = its one-line goal. */
function specSummary(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (line.length === 0) continue;
    if (line.startsWith('#')) continue;
    return line;
  }
  return '';
}

/** Milestone ids (M3, S2, …) listed under a `## Depends on` block. */
function specDependsOn(text, self) {
  const match = text.match(/##\s*Depends on\s*([\s\S]*?)(?:\n##\s|$)/i);
  if (!match) return [];
  const ids = new Set();
  for (const m of match[1].matchAll(/\b([MS]\d)\b/g)) {
    if (m[1] !== self) ids.add(m[1]);
  }
  return [...ids];
}

/** Workspaces a milestone spec touches, by scanning for path / package tokens. */
function specWorkspaces(text) {
  const hit = [];
  for (const ws of WORKSPACES) {
    const tokens = WORKSPACE_TOKENS[ws.id] ?? [ws.path];
    if (tokens.some((t) => text.includes(t))) hit.push(ws.id);
  }
  return hit;
}

/**
 * Read the agent-workflow roadmap (progress.json + milestone specs) so the docs
 * can show each workspace's next-steps without an agent. Deterministic: every
 * fact comes from disk.
 */
function collectWorkflow() {
  const progress = readJson(join(AGENT_WORKFLOW, 'progress.json'));
  if (progress === null) return null;

  const buildTrack = (record, track) =>
    Object.values(record ?? {}).map((entry, index) => {
      const specText = readText(join(AGENT_WORKFLOW, entry.spec ?? ''));
      return {
        id: entry.id,
        name: entry.name ?? entry.id,
        track,
        order: index,
        status: entry.status === 'done' ? 'done' : entry.status === 'partial' ? 'partial' : 'not-done',
        spec: entry.spec ? `support/agent-workflow/${entry.spec}` : '',
        summary: specSummary(specText),
        dependsOn: specDependsOn(specText, entry.id),
        workspaces: specWorkspaces(specText),
      };
    });

  const capability = buildTrack(progress.milestones, 'capability');
  const packaging = buildTrack(progress.packaging, 'packaging');
  const tasks = [...capability, ...packaging];

  const byWorkspace = {};
  for (const ws of WORKSPACES) {
    byWorkspace[ws.id] = tasks.filter((t) => t.workspaces.includes(ws.id)).map((t) => t.id);
  }

  const history = Array.isArray(progress.history) ? progress.history : [];
  const latest = history.length > 0 ? history[history.length - 1] : null;

  return {
    northStar: progress.northStar ?? '',
    currentTrack: progress.track ?? '',
    current: progress.current ?? null,
    acceptanceFloor: progress.acceptanceFloor ?? null,
    allComplete: tasks.every((t) => t.status === 'done'),
    tasks,
    byWorkspace,
    latestNote: latest ? `${latest.event}: ${latest.note}` : '',
  };
}

function main() {
  const modules = WORKSPACES.map(analyzeWorkspace).filter((m) => !m.missing);
  const totals = modules.reduce(
    (acc, m) => {
      acc.fileCount += m.fileCount;
      acc.loc += m.loc;
      return acc;
    },
    { fileCount: 0, loc: 0 },
  );

  const workflow = collectWorkflow();
  const generatedAt = new Date().toISOString();
  const banner =
    '// AUTO-GENERATED by scripts/generate-lld.mjs — do not edit by hand.\n' +
    '// Run `npm run docs` (in support/zero-docs) to refresh from the live tree.\n';

  const workflowBlock =
    workflow === null
      ? ''
      : `
export type TaskTrack = 'capability' | 'packaging';
export type TaskStatus = 'done' | 'partial' | 'not-done';

export interface GeneratedTask {
  id: string;
  name: string;
  track: TaskTrack;
  order: number;
  status: TaskStatus;
  spec: string;
  summary: string;
  dependsOn: string[];
  workspaces: string[];
}

export interface GeneratedWorkflow {
  generatedAt: string;
  northStar: string;
  currentTrack: string;
  current: string | null;
  acceptanceFloor: string | null;
  allComplete: boolean;
  tasks: GeneratedTask[];
  byWorkspace: Record<string, string[]>;
  latestNote: string;
}

export const GENERATED_WORKFLOW: GeneratedWorkflow = ${toTsLiteral({
          generatedAt,
          ...workflow,
        })};
`;

  const body = `${banner}
export interface GeneratedModule {
  id: string;
  kind: 'app' | 'web' | 'package';
  path: string;
  pkg: string;
  version: string | null;
  description: string;
  entry: string | null;
  scripts: string[];
  runtimeDeps: string[];
  workspaceDeps: string[];
  devDeps: string[];
  fileCount: number;
  loc: number;
  filesByExt: Record<string, number>;
  hasDockerfile: boolean;
  hasTests: boolean;
  tree: string;
}

export interface GeneratedLld {
  generatedAt: string;
  totals: { modules: number; fileCount: number; loc: number };
  modules: GeneratedModule[];
}

export const GENERATED_LLD: GeneratedLld = ${toTsLiteral({
    generatedAt,
    totals: { modules: modules.length, fileCount: totals.fileCount, loc: totals.loc },
    modules,
  })};
${workflowBlock}`;

  writeFileSync(OUT_FILE, body, 'utf8');
  const rel = relative(REPO_ROOT, OUT_FILE);
  const taskCount = workflow ? workflow.tasks.length : 0;
  process.stdout.write(
    `docs: wrote ${rel} — ${modules.length} workspaces, ${totals.fileCount} source files, ` +
      `${totals.loc.toLocaleString()} LOC, ${taskCount} roadmap tasks (generatedAt ${generatedAt})\n`,
  );
}

main();
