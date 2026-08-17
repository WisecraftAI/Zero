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
  const dir = path.join(ROOT, 'packages/cloud');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(dir, d.name, 'index.js')))
    .map((d) => d.name);
}

const checks = {
  M1() {
    const server = read('apps/api/server.js');
    const db = read('packages/db/index.js');
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
    const index = read('packages/cloud/index.js');
    const types = read('packages/cloud/index.d.ts');
    const server = read('apps/api/server.js');
    const routes = read('packages/cloud/http.js');
    const hasPresign =
      /presignPut/.test(index + types) && /presignGet/.test(index + types);
    const hasLocalStore = existsAny(
      'packages/cloud/local/storage.js',
      'packages/cloud/local/objectStore.js'
    );
    const wired =
      /@zero\/cloud|presignPut|objectStore/.test(server + routes) &&
      /\/api\/cloud|presignPut|objectStore/.test(server + routes);
    return {
      pass: hasPresign && hasLocalStore && exists('packages/cloud/index.js') && wired,
      details: {
        cloudIndex: exists('packages/cloud/index.js'),
        presignMethods: hasPresign,
        localObjectStore: hasLocalStore,
        apiWiredToObjectStore: wired,
      },
    };
  },

  M3() {
    const cloud = readAny('packages/cloud/index.js', 'packages/cloud/local/queue.js');
    const server = read('apps/api/server.js');
    const worker = existsAny('apps/orchestrator/index.js', 'apps/orchestrator/worker.js');
    const orch = readAny('apps/orchestrator/index.js', 'apps/orchestrator/worker.js');
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
      'apps/orchestrator/index.js'
    );
    const hasTopic = /execution\.requested/.test(blobs);
    const hasWorker = existsAny('apps/executor/worker.js', 'apps/executor/main.js');
    return {
      pass: hasTopic && hasWorker,
      details: { executionWorker: hasWorker, executionRequestedTopic: hasTopic },
    };
  },

  M5() {
    const server = read('apps/api/server.js');
    const authLib = readAny('apps/api/auth.js', 'apps/api/middleware/auth.js');
    const anyKey =
      /apiKeyAuth[\s\S]{0,400}x-api-key[\s\S]{0,200}(any|non-empty|truthy)/i.test(server) ||
      (/if\s*\(\s*!apiKey\s*\)/.test(server) &&
        /x-api-key/i.test(server) &&
        !/provider_keys|stored.*key|verifyApiKey/.test(server + authLib));
    const recordingStar = /Access-Control-Allow-Origin['":\s]*\*/.test(server);
    const hasAuthModule = existsAny('apps/api/auth.js', 'apps/api/middleware/auth.js');
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
    const server = read('apps/api/server.js');
    const orch = readAny('apps/orchestrator/index.js', 'apps/orchestrator/worker.js');
    const llm = read('apps/orchestrator/llm/index.js');
    const wired =
      /openai|anthropic|generativelanguage|bedrock|callProvider|chat\.completions/i.test(
        server + orch + llm
      ) &&
      (exists('apps/orchestrator/llm/index.js') || /provider-keys|providerKeys/.test(orch));
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
    const orchPkg = readJson('apps/orchestrator/package.json') || {};
    const apiDeps = { ...(apiPkg.dependencies || {}), ...(apiPkg.devDependencies || {}) };
    const orchDeps = { ...(orchPkg.dependencies || {}), ...(orchPkg.devDependencies || {}) };
    const noPlaywright = !apiDeps.playwright;
    const noExecutorDependency = !apiDeps['@zero/executor'] && !orchDeps['@zero/executor'];
    const dockerfile = exists('apps/executor/Dockerfile');
    const compose = read('docker-compose.yml');
    const composeHasExec = /^\s+executor:\s*$/m.test(compose);
    const apiServer = read('apps/api/server.js');
    const noLaunch = !/chromium\.launch/.test(apiServer);
    const apiDoesNotImportWorkers = !/@zero\/(?:executor|orchestrator)/.test(apiServer);
    const apiDocker = read('Dockerfile');
    const scopedApiImage =
      /--workspace\s+@zero\/api/.test(apiDocker) &&
      !/COPY\s+apps\s+\.\/apps/.test(apiDocker);
    return {
      pass:
        dockerfile &&
        composeHasExec &&
        noPlaywright &&
        noExecutorDependency &&
        noLaunch &&
        apiDoesNotImportWorkers &&
        scopedApiImage,
      details: {
        executorDockerfile: dockerfile,
        composeExecutorService: composeHasExec,
        apiHasNoPlaywright: noPlaywright,
        apiAndOrchestratorDoNotDependOnExecutor: noExecutorDependency,
        apiHasNoChromiumLaunch: noLaunch,
        apiDoesNotImportWorkers,
        apiImageUsesScopedInstall: scopedApiImage,
      },
    };
  },

  S5() {
    const dockerfile = exists('apps/orchestrator/Dockerfile');
    const composeHasOrch = /^\s+orchestrator:\s*$/m.test(read('docker-compose.yml'));
    const worker = readAny('apps/orchestrator/worker.js', 'apps/orchestrator/src/worker.js');
    const notBootApi = !/require\(\s*['"]\.\.\/api\/server/.test(worker);
    const apiServer = read('apps/api/server.js');
    const apiIsHttpOnly =
      !/startOrchestrator|createProcessRun|ensureOrchestrator|startExecutionWorker|ensureExecutionWorker/.test(apiServer);
    const orchDocker = read('apps/orchestrator/Dockerfile');
    const scopedOrchestratorImage =
      /--workspace\s+@zero\/orchestrator/.test(orchDocker) &&
      !/COPY\s+apps\s+\.\/apps/.test(orchDocker) &&
      !/playwright/i.test(orchDocker);
    return {
      pass:
        dockerfile &&
        composeHasOrch &&
        notBootApi &&
        worker.length > 0 &&
        apiIsHttpOnly &&
        scopedOrchestratorImage,
      details: {
        orchestratorDockerfile: dockerfile,
        composeOrchestratorService: composeHasOrch,
        workerDoesNotBootApi: notBootApi,
        apiDoesNotBootWorkers: apiIsHttpOnly,
        orchestratorImageUsesScopedInstall: scopedOrchestratorImage,
      },
    };
  },

  S6() {
    const azureText = read('packages/cloud/azure/index.js');
    const vercelText = read('packages/cloud/vercel/index.js');
    const adapterShape = (text) =>
      ['objectStore', 'queue', 'secrets', 'cache'].every((name) =>
        new RegExp(`\\b${name}\\b`).test(text)
      );
    const azure = Boolean(azureText) && adapterShape(azureText);
    const vercel = Boolean(vercelText) && adapterShape(vercelText);
    const gate9 = readAny(
      'packages/cloud/conformance/gate9.js',
      'test/cloud.conformance.test.js'
    );
    const conformance =
      /objectStore/.test(gate9) &&
      /queue/.test(gate9) &&
      /secrets/.test(gate9) &&
      /cache/.test(gate9);
    return {
      pass: azure && vercel && conformance,
      details: {
        azureAdapterContract: azure,
        vercelAdapterContract: vercel,
        gate9CoversAllPrimitives: conformance
      },
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
