#!/usr/bin/env node
'use strict';

/**
 * Probe the repo for Target-architecture milestone completion.
 * Capability track M1–M7, then packaging track S0–S6.
 * When M* is green, earliest unfinished is the first failing S* (today: S3).
 *
 * Usage: node agent-workflow/scripts/detect-milestone.js [--json]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ORDER = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
const PACKAGING_ORDER = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6'];

function read(rel) {
  try {
    return fs.readFileSync(path.join(ROOT, rel), 'utf8');
  } catch {
    return '';
  }
}

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function readAny(...rels) {
  return rels.map(read).join('\n');
}

function existsAny(...rels) {
  return rels.some(exists);
}

function listJs(rel) {
  const dir = path.join(ROOT, rel);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.js') || f.endsWith('.cjs') || f.endsWith('.mjs'));
}

function readJson(rel) {
  try {
    return JSON.parse(read(rel));
  } catch {
    return null;
  }
}

function listCloudProviders() {
  const dirs = ['packages/cloud', 'lib/cloud'].map((d) => path.join(ROOT, d));
  const found = dirs.find((dir) => fs.existsSync(dir));
  if (!found) return [];
  return fs
    .readdirSync(found, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(found, d.name, 'index.js')))
    .map((d) => d.name);
}

const checks = {
  M1() {
    const server = readAny('apps/api/server.js', 'server.js');
    const db = readAny('packages/db/index.js', 'lib/db.js');
    const hardOff = /function\s+databaseConfigured\s*\(\s*\)\s*\{\s*return\s+false\s*;\s*\}/.test(server);
    const hasRuns = /CREATE TABLE IF NOT EXISTS qa_runs\b/.test(db);
    const hasAssets = /CREATE TABLE IF NOT EXISTS qa_assets\b/.test(db);
    return {
      pass: !hardOff && hasRuns && hasAssets,
      details: {
        databaseConfiguredNotHardFalse: !hardOff,
        qa_runs_ddl: hasRuns,
        qa_assets_ddl: hasAssets,
      },
    };
  },

  M2() {
    const index = readAny('packages/cloud/index.js', 'lib/cloud/index.js');
    const types = readAny('packages/cloud/index.d.ts', 'lib/cloud/index.d.ts');
    const server = readAny('apps/api/server.js', 'server.js');
    const routes = readAny('packages/cloud/http.js', 'lib/cloud/http.js', 'lib/routes/cloud.js');
    const hasPresign =
      /presignPut/.test(index + types) && /presignGet/.test(index + types);
    const hasLocalStore = existsAny(
      'packages/cloud/local/storage.js',
      'packages/cloud/local/objectStore.js',
      'lib/cloud/local/storage.js',
      'lib/cloud/local/objectStore.js'
    );
    const wired =
      /@zero\/cloud|require\(['"]\.\/lib\/cloud['"]\)|require\(['"]\.\/cloud['"]\)|presignPut|objectStore/.test(
        server + routes
      ) && /\/api\/cloud|presignPut|objectStore/.test(server + routes);
    return {
      pass: hasPresign && hasLocalStore && existsAny('packages/cloud/index.js', 'lib/cloud/index.js') && wired,
      details: {
        cloudIndex: existsAny('packages/cloud/index.js', 'lib/cloud/index.js'),
        presignMethods: hasPresign,
        localObjectStore: hasLocalStore,
        apiWiredToObjectStore: wired,
      },
    };
  },

  M3() {
    const cloud = readAny(
      'packages/cloud/index.js',
      'packages/cloud/local/queue.js',
      'lib/cloud/index.js',
      'lib/cloud/local/queue.js'
    );
    const server = readAny('apps/api/server.js', 'server.js');
    const worker = existsAny(
      'apps/orchestrator/index.js',
      'apps/orchestrator/worker.js',
      'workers/orchestrator.js',
      'lib/orchestrator/index.js',
      'lib/orchestrator.js'
    );
    const orch = readAny(
      'apps/orchestrator/index.js',
      'apps/orchestrator/worker.js',
      'lib/orchestrator/index.js',
      'workers/orchestrator.js'
    );
    const publishes =
      /runs\.requested/.test(server + cloud + orch) ||
      /topic:\s*['"]runs\.requested['"]/.test(server + cloud + orch) ||
      /publish\(\s*['"]runs\.requested['"]/.test(server + cloud + orch);
    return {
      pass: worker && publishes,
      details: { orchestratorEntrypoint: worker, publishesRunsRequested: Boolean(publishes) },
    };
  },

  M4() {
    const blobs = readAny(
      'apps/api/server.js',
      'apps/executor/worker.js',
      'apps/executor/main.js',
      'apps/orchestrator/index.js',
      'server.js',
      'workers/execution.js',
      'lib/execution/worker.js',
      'workers/orchestrator.js'
    );
    const hasTopic = /execution\.requested/.test(blobs);
    const hasWorker = existsAny(
      'apps/executor/worker.js',
      'apps/executor/main.js',
      'workers/execution.js',
      'lib/execution/worker.js'
    );
    return {
      pass: hasTopic && hasWorker,
      details: { executionWorker: hasWorker, executionRequestedTopic: hasTopic },
    };
  },

  M5() {
    const server = readAny('apps/api/server.js', 'server.js');
    const authLib = readAny(
      'apps/api/auth.js',
      'apps/api/middleware/auth.js',
      'lib/auth.js',
      'lib/middleware/auth.js'
    );
    const anyKey =
      /apiKeyAuth[\s\S]{0,400}x-api-key[\s\S]{0,200}(any|non-empty|truthy)/i.test(server) ||
      /if\s*\(\s*!apiKey\s*\)/.test(server) && /x-api-key/i.test(server) && !/provider_keys|stored.*key|verifyApiKey/.test(server + authLib);
    const recordingStar = /Access-Control-Allow-Origin['":\s]*\*/.test(server);
    const hasAuthModule = existsAny(
      'apps/api/auth.js',
      'apps/api/middleware/auth.js',
      'lib/auth.js',
      'lib/middleware/auth.js'
    );
    return {
      pass: hasAuthModule && !recordingStar,
      details: {
        authModule: hasAuthModule,
        recordingCorsNotStar: !recordingStar,
        note: anyKey ? 'apiKeyAuth may still be permissive — review manually' : 'ok',
      },
    };
  },

  M6() {
    const server = readAny('apps/api/server.js', 'server.js');
    const orch = readAny(
      'apps/orchestrator/index.js',
      'apps/orchestrator/worker.js',
      'lib/orchestrator/index.js',
      'workers/orchestrator.js'
    );
    const llm = readAny('apps/orchestrator/llm/index.js', 'lib/llm/index.js', 'lib/providers/index.js');
    const wired =
      /openai|anthropic|generativelanguage|bedrock|callProvider|chat\.completions/i.test(
        server + orch + llm
      ) && (existsAny('apps/orchestrator/llm/index.js', 'lib/llm/index.js', 'lib/providers/index.js') || /provider-keys|providerKeys/.test(orch));
    return {
      pass: Boolean(wired),
      details: { llmClientPresent: Boolean(wired) },
    };
  },

  M7() {
    const providers = listCloudProviders().filter((p) => p !== 'local');
    const hasAws = providers.includes('aws');
    const hasOther = providers.some((p) => p !== 'aws');
    return {
      pass: hasAws && hasOther,
      details: { providers: listCloudProviders(), hasAws, hasOther },
    };
  },

  S0() {
    const compose = read('docker-compose.yml');
    return {
      pass: exists('Dockerfile') && /postgres/i.test(compose),
      details: { dockerfile: exists('Dockerfile'), composePostgres: /postgres/i.test(compose) },
    };
  },

  S1() {
    const smoke = exists('test/smoke.test.js');
    return { pass: smoke, details: { smokeTest: smoke } };
  },

  S2() {
    const pkg = readJson('package.json') || {};
    const ws = pkg.workspaces;
    const hasWs = Array.isArray(ws)
      ? ws.includes('apps/*') && ws.includes('packages/*') && ws.includes('web')
      : false;
    return {
      pass:
        hasWs &&
        exists('apps/api/package.json') &&
        exists('packages/cloud/package.json') &&
        exists('web/package.json'),
      details: {
        workspaces: hasWs,
        apiPkg: exists('apps/api/package.json'),
        cloudPkg: exists('packages/cloud/package.json'),
        webPkg: exists('web/package.json'),
      },
    };
  },

  S3() {
    const routeFiles = [
      ...listJs('apps/api/src/routes'),
      ...listJs('apps/api/routes'),
    ];
    const server = read('apps/api/server.js');
    const processRunInServer = /async\s+function\s+processRun\s*\(/.test(server);
    const orch = readAny(
      'apps/orchestrator/index.js',
      'apps/orchestrator/worker.js',
      'apps/orchestrator/dag.js',
      'apps/orchestrator/src/dag.js',
      'apps/orchestrator/processRun.js'
    );
    const orchDefinesProcessRun = /(?:async\s+)?function\s+processRun\s*\(/.test(orch);
    const hasDagModule = existsAny(
      'apps/orchestrator/dag.js',
      'apps/orchestrator/src/dag.js',
      'apps/orchestrator/processRun.js'
    );
    const orchOwnsDag = orchDefinesProcessRun || (hasDagModule && /stageKeys|walkStage/.test(orch));
    return {
      pass: routeFiles.length >= 2 && !processRunInServer && orchOwnsDag,
      details: {
        routeModules: routeFiles.length,
        processRunLeftServer: !processRunInServer,
        orchestratorOwnsDag: orchOwnsDag,
      },
    };
  },

  S4() {
    const apiPkg = readJson('apps/api/package.json') || {};
    const deps = { ...(apiPkg.dependencies || {}), ...(apiPkg.devDependencies || {}) };
    const noPlaywright = !deps.playwright;
    const dockerfile = exists('apps/executor/Dockerfile');
    const compose = read('docker-compose.yml');
    const composeHasExec = /^\s+executor:\s*$/m.test(compose);
    const noLaunch = !/chromium\.launch/.test(read('apps/api/server.js'));
    return {
      pass: dockerfile && composeHasExec && noPlaywright && noLaunch,
      details: {
        executorDockerfile: dockerfile,
        composeExecutorService: composeHasExec,
        apiHasNoPlaywright: noPlaywright,
        apiHasNoChromiumLaunch: noLaunch,
      },
    };
  },

  S5() {
    const dockerfile = exists('apps/orchestrator/Dockerfile');
    const composeHasOrch = /^\s+orchestrator:\s*$/m.test(read('docker-compose.yml'));
    const worker = readAny('apps/orchestrator/worker.js', 'apps/orchestrator/src/worker.js');
    const notBootApi = !/require\(\s*['"]\.\.\/api\/server/.test(worker);
    return {
      pass: dockerfile && composeHasOrch && notBootApi && worker.length > 0,
      details: {
        orchestratorDockerfile: dockerfile,
        composeOrchestratorService: composeHasOrch,
        workerDoesNotBootApi: notBootApi,
      },
    };
  },

  S6() {
    const azure = exists('packages/cloud/azure/index.js');
    const vercel = exists('packages/cloud/vercel/index.js');
    const conformance = listJs('packages/cloud/conformance').length > 0;
    return {
      pass: azure && vercel && conformance,
      details: { azureAdapter: azure, vercelAdapter: vercel, conformanceSuite: conformance },
    };
  },
};

function loadProgress() {
  try {
    return JSON.parse(read('agent-workflow/progress.json'));
  } catch {
    return null;
  }
}

function main() {
  const asJson = process.argv.includes('--json');
  const results = {};
  let earliestM = null;
  let earliestS = null;

  for (const id of ORDER) {
    const r = checks[id]();
    results[id] = r;
    if (!r.pass && !earliestM) earliestM = id;
  }
  for (const id of PACKAGING_ORDER) {
    const r = checks[id]();
    results[id] = r;
    if (!r.pass && !earliestS) earliestS = id;
  }

  const capabilityComplete = earliestM === null;
  const packagingComplete = earliestS === null;
  const earliest = earliestM || earliestS;
  const track = earliestM ? 'capability' : earliestS ? 'packaging' : 'complete';

  const progress = loadProgress();
  const out = {
    track,
    earliestUnfinished: earliest,
    allComplete: earliest === null,
    capabilityComplete,
    packagingComplete,
    acceptanceFloorMet:
      results.M1.pass && results.M2.pass && results.M3.pass && results.M4.pass,
    results,
    progressCurrent: progress && progress.current,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    console.log('ZER0 target-architecture status\n');
    console.log('Capability track · M1–M7');
    for (const id of ORDER) {
      const r = results[id];
      console.log(`  ${id}  ${(r.pass ? 'DONE' : 'TODO').padEnd(4)}  ${JSON.stringify(r.details)}`);
    }
    console.log('');
    console.log('Packaging track · S0–S6');
    for (const id of PACKAGING_ORDER) {
      const r = results[id];
      console.log(`  ${id}  ${(r.pass ? 'DONE' : 'TODO').padEnd(4)}  ${JSON.stringify(r.details)}`);
    }
    console.log('');
    if (earliestM) {
      console.log(`Next milestone: ${earliestM} (capability)`);
      console.log(`Spec: agent-workflow/milestones/${earliestM}-*.md`);
    } else if (earliestS) {
      console.log(`Next packaging step: ${earliestS}`);
      console.log(`Spec: agent-workflow/milestones/${earliestS}-*.md`);
      console.log('Prompt: agent-workflow/prompts/packaging.md');
    } else {
      console.log('Capability and packaging probes all passed.');
    }
    console.log('Invoke: /zero-target-arch');
    console.log(
      `Acceptance floor (M1–M4): ${out.acceptanceFloorMet ? 'MET' : 'NOT MET'}`
    );
  }

  process.exit(0);
}

main();
