#!/usr/bin/env node
'use strict';

/**
 * Probe the repo for Target-architecture milestone completion.
 * Capability track M1–M7, packaging track S0–S7, product track Q1–Q5.
 * When M* is green, earliest unfinished is the first failing S*, then Q*.
 *
 * Usage: node support/agent-workflow/scripts/detect-milestone.js [--json]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');
const ORDER = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
const PACKAGING_ORDER = ['S0', 'S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7'];
const PRODUCT_ORDER = ['Q1', 'Q2', 'Q3', 'Q4', 'Q5'];

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

function composeHasNamedImage(compose, service, image) {
  const escapedService = service.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const escapedImage = image.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^  ${escapedService}:\\s*$[\\s\\S]{0,240}^    image:\\s*${escapedImage}(?::[^\\s]+)?\\s*$`,
    'm'
  ).test(compose);
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
    const server = read('services/api/server.js');
    const db = readAny(
      'packages/db/index.js',
      'packages/db/lib/index.js',
      'packages/db/lib/schema/tables.js',
      'packages/db/lib/schema/init.js',
      'packages/db/migrations/001_initial.sql'
    );
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
    const server = read('services/api/server.js');
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
    const server = read('services/api/server.js');
    const worker = existsAny('services/orchestrator/index.js', 'services/orchestrator/worker.js');
    const orch = readAny('services/orchestrator/index.js', 'services/orchestrator/worker.js');
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
      'services/api/server.js',
      'services/executor/worker.js',
      'services/executor/main.js',
      'services/orchestrator/index.js'
    );
    const hasTopic = /execution\.requested/.test(blobs);
    const hasWorker = existsAny('services/executor/worker.js', 'services/executor/main.js');
    return {
      pass: hasTopic && hasWorker,
      details: { executionWorker: hasWorker, executionRequestedTopic: hasTopic },
    };
  },

  M5() {
    const server = read('services/api/server.js');
    const authLib = readAny('services/api/auth.js', 'services/api/middleware/auth.js');
    const anyKey =
      /apiKeyAuth[\s\S]{0,400}x-api-key[\s\S]{0,200}(any|non-empty|truthy)/i.test(server) ||
      (/if\s*\(\s*!apiKey\s*\)/.test(server) &&
        /x-api-key/i.test(server) &&
        !/provider_keys|stored.*key|verifyApiKey/.test(server + authLib));
    const recordingStar = /Access-Control-Allow-Origin['":\s]*\*/.test(server);
    const hasAuthModule = existsAny('services/api/auth.js', 'services/api/middleware/auth.js');
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
    const server = read('services/api/server.js');
    const orch = readAny('services/orchestrator/index.js', 'services/orchestrator/worker.js');
    const llm = read('services/orchestrator/llm/index.js');
    const wired =
      /openai|anthropic|generativelanguage|bedrock|callProvider|chat\.completions/i.test(
        server + orch + llm
      ) &&
      (exists('services/orchestrator/llm/index.js') || /provider-keys|providerKeys/.test(orch));
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
      ? ws.includes('services/*') && ws.includes('packages/*') && ws.includes('web')
      : false;
    return {
      pass:
        hasWs &&
        exists('services/api/package.json') &&
        exists('packages/cloud/package.json') &&
        exists('web/package.json'),
      details: {
        workspaces: hasWs,
        apiPkg: exists('services/api/package.json'),
        cloudPkg: exists('packages/cloud/package.json'),
        webPkg: exists('web/package.json'),
      },
    };
  },

  S3() {
    const routeFiles = [
      ...listJs('services/api/src/routes'),
      ...listJs('services/api/routes'),
    ];
    const server = read('services/api/server.js');
    const processRunInServer = /async\s+function\s+processRun\s*\(/.test(server);
    const orch = readAny(
      'services/orchestrator/index.js',
      'services/orchestrator/worker.js',
      'services/orchestrator/dag.js',
      'services/orchestrator/src/dag.js',
      'services/orchestrator/processRun.js'
    );
    const orchDefinesProcessRun = /(?:async\s+)?function\s+processRun\s*\(/.test(orch);
    const hasDagModule = existsAny(
      'services/orchestrator/dag.js',
      'services/orchestrator/src/dag.js',
      'services/orchestrator/processRun.js'
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
    const apiPkg = readJson('services/api/package.json') || {};
    const orchPkg = readJson('services/orchestrator/package.json') || {};
    const apiDeps = { ...(apiPkg.dependencies || {}), ...(apiPkg.devDependencies || {}) };
    const orchDeps = { ...(orchPkg.dependencies || {}), ...(orchPkg.devDependencies || {}) };
    const noPlaywright = !apiDeps.playwright;
    const noExecutorDependency = !apiDeps['@zero/executor'] && !orchDeps['@zero/executor'];
    const dockerfile = exists('services/executor/Dockerfile');
    const compose = read('docker-compose.yml');
    const composeHasApi = /^  api:\s*$/m.test(compose);
    const composeHasExec = /^  executor:\s*$/m.test(compose);
    const composeApiImageNamed = composeHasNamedImage(compose, 'api', 'zero-api');
    const composeExecutorImageNamed = composeHasNamedImage(compose, 'executor', 'zero-executor');
    const apiServer = read('services/api/server.js');
    const noLaunch = !/chromium\.launch/.test(apiServer);
    const apiDoesNotImportWorkers = !/@zero\/(?:executor|orchestrator)/.test(apiServer);
    const apiDocker = read('Dockerfile');
    const scopedApiImage =
      /--workspace\s+@zero\/api/.test(apiDocker) &&
      !/COPY\s+services\s+\.\/services/.test(apiDocker);
    return {
      pass:
        dockerfile &&
        composeHasApi &&
        composeHasExec &&
        composeApiImageNamed &&
        composeExecutorImageNamed &&
        noPlaywright &&
        noExecutorDependency &&
        noLaunch &&
        apiDoesNotImportWorkers &&
        scopedApiImage,
      details: {
        executorDockerfile: dockerfile,
        composeApiService: composeHasApi,
        composeExecutorService: composeHasExec,
        composeApiImageNamed,
        composeExecutorImageNamed,
        apiHasNoPlaywright: noPlaywright,
        apiAndOrchestratorDoNotDependOnExecutor: noExecutorDependency,
        apiHasNoChromiumLaunch: noLaunch,
        apiDoesNotImportWorkers,
        apiImageUsesScopedInstall: scopedApiImage,
      },
    };
  },

  S5() {
    const dockerfile = exists('services/orchestrator/Dockerfile');
    const compose = read('docker-compose.yml');
    const composeHasOrch = /^  orchestrator:\s*$/m.test(compose);
    const composeOrchestratorImageNamed = composeHasNamedImage(
      compose,
      'orchestrator',
      'zero-orchestrator'
    );
    const worker = readAny('services/orchestrator/worker.js', 'services/orchestrator/src/worker.js');
    const notBootApi = !/require\(\s*['"]\.\.\/api\/server/.test(worker);
    const apiServer = read('services/api/server.js');
    const apiIsHttpOnly =
      !/startOrchestrator|createProcessRun|ensureOrchestrator|startExecutionWorker|ensureExecutionWorker/.test(apiServer);
    const orchDocker = read('services/orchestrator/Dockerfile');
    const scopedOrchestratorImage =
      /--workspace\s+@zero\/orchestrator/.test(orchDocker) &&
      !/COPY\s+services\s+\.\/services/.test(orchDocker) &&
      !/FROM\s+\S*playwright/i.test(orchDocker) &&
      !/COPY\s+services\/executor/.test(orchDocker);
    return {
      pass:
        dockerfile &&
        composeHasOrch &&
        composeOrchestratorImageNamed &&
        notBootApi &&
        worker.length > 0 &&
        apiIsHttpOnly &&
        scopedOrchestratorImage,
      details: {
        orchestratorDockerfile: dockerfile,
        composeOrchestratorService: composeHasOrch,
        composeOrchestratorImageNamed,
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

  S7() {
    const webDockerfile = exists('web/Dockerfile');
    const webNginx = exists('web/nginx.conf');
    const spaRouteGone = !exists('services/api/src/routes/spa.js');
    const compose = read('docker-compose.yml');
    const composeHasWeb = /^  web:\s*$/m.test(compose);
    const composeWebImageNamed = composeHasNamedImage(compose, 'web', 'zero-web');
    const rootDocker = read('Dockerfile');
    const rootDockerHasNoWebStage =
      !/FROM\s+[^\s]+\s+AS\s+web\b/i.test(rootDocker) &&
      !/COPY\s+--from=web\b/.test(rootDocker);
    const routeFiles = [
      ...listJs('services/api/src/routes'),
    ];
    const routesConcat = routeFiles
      .map((f) => read(`services/api/src/routes/${f}`))
      .join('\n');
    const routesHaveNoApiPrefix = !/["']\/api\//.test(routesConcat);
    const serverText = read('services/api/server.js');
    // /api-docs is a legitimate Swagger name (not a prefix); only flag /api mounts.
    const serverHasNoApiPrefix =
      !/app\.use\s*\(\s*["']\/api(?:\/|["'])/.test(serverText);
    const storage = read('packages/cloud/local/storage.js');
    const signedUrlDroppedApi =
      /\/cloud\/local/.test(storage) && !/\/api\/cloud\/local/.test(storage);
    return {
      pass:
        webDockerfile &&
        webNginx &&
        spaRouteGone &&
        composeHasWeb &&
        composeWebImageNamed &&
        rootDockerHasNoWebStage &&
        routesHaveNoApiPrefix &&
        serverHasNoApiPrefix &&
        signedUrlDroppedApi,
      details: {
        webDockerfile,
        webNginxConf: webNginx,
        spaRouteRemoved: spaRouteGone,
        composeWebService: composeHasWeb,
        composeWebImageNamed,
        rootDockerHasNoWebStage,
        routesHaveNoApiPrefix,
        serverHasNoApiPrefix,
        signedUrlDroppedApiPrefix: signedUrlDroppedApi,
      },
    };
  },

  Q1() {
    const multiPage = read('packages/analyzer/lib/crawl/multiPage.js');
    const hasModule = multiPage.length > 0 && /crawlLinkedPages/.test(multiPage);
    const strategies = readAny(
      'packages/analyzer/lib/strategies/pro.js',
      'packages/analyzer/lib/strategies/light.js'
    );
    const wired = /crawlLinkedPages|multiPage/.test(strategies);
    const testFile = read('test/analyzer-multipage.test.js');
    const hasTest = testFile.length > 0 && /crawledPages|pagesCrawled/.test(testFile);
    return {
      pass: hasModule && wired && hasTest,
      details: { multiPageModule: hasModule, strategyWired: wired, multipageTest: hasTest },
    };
  },

  Q2() {
    const generator = read('packages/analyzer/lib/generate/majorFunctionalCases.js');
    const hasGenerator = generator.length > 0 && /majorFunctionalCases|generateMajorFunctionalCases/.test(generator);
    const pipeline = readAny('services/orchestrator/pipeline.js', 'packages/analyzer/urlAnalyzer.js');
    const wired =
      /majorFunctionalCases|generateMajorFunctionalCases/.test(pipeline) ||
      /criticalFlows.*testCases|testPriorities/.test(generator);
    const testFile = read('test/domain-test-generation.test.js');
    const hasTest = testFile.length > 0;
    return {
      pass: hasGenerator && wired && hasTest,
      details: { majorFunctionalCasesModule: hasGenerator, pipelineWired: wired, domainTest: hasTest },
    };
  },

  Q3() {
    const jobs = read('services/executor/jobs.js');
    const execution = readAny('packages/domain/lib/execution.js', 'packages/domain/execution.js');
    const hasFlowRunner =
      /runDiscoveredFlows|discovered_flows|DISCOVERED_FLOWS/.test(jobs + execution);
    const testFile = read('test/flow-execution.test.js');
    const hasTest = testFile.length > 0 && /flow|discovered/i.test(testFile);
    return {
      pass: hasFlowRunner && hasTest,
      details: { flowRunnerWired: hasFlowRunner, flowExecutionTest: hasTest },
    };
  },

  Q4() {
    const llm = read('services/orchestrator/llm/index.js');
    const processRun = read('services/orchestrator/processRun.js');
    const hasPrompt = /domainInference/.test(llm) && /PROMPT_VERSIONS/.test(llm);
    const gated =
      /websiteTypeConfidence|typeConfidence/.test(processRun) &&
      /domainInference|inferDomain/.test(processRun);
    const testFile = read('test/domain-inference.test.js');
    const hasTest = testFile.length > 0;
    return {
      pass: hasPrompt && gated && hasTest,
      details: { domainInferencePrompt: hasPrompt, confidenceGate: gated, domainInferenceTest: hasTest },
    };
  },

  Q5() {
    const constants = read('packages/analyzer/lib/constants.js');
    const detector = read('packages/analyzer/lib/classify/subDomain.js');
    const llm = read('services/orchestrator/llm/index.js');
    const cases = read('packages/analyzer/lib/generate/majorFunctionalCases.js');

    const subTypeTaxonomy = /subTypes\s*:/.test(constants);
    const subDomainDetector = detector.length > 0 && /classification/.test(detector);
    const promptV2 = /domainSubdomain/.test(llm) && /PROMPT_VERSIONS/.test(llm);
    const casesUseSubDomain = /subDomain/.test(cases);
    const subDomainTest = read('test/domain-subdomain.test.js').length > 0;

    return {
      pass: subTypeTaxonomy && subDomainDetector && promptV2 && casesUseSubDomain && subDomainTest,
      details: { subTypeTaxonomy, subDomainDetector, promptV2, casesUseSubDomain, subDomainTest },
    };
  },
};

function loadProgress() {
  try {
    return JSON.parse(read('support/agent-workflow/progress.json'));
  } catch {
    return null;
  }
}

function main() {
  const asJson = process.argv.includes('--json');
  const results = {};
  let earliestM = null;
  let earliestS = null;
  let earliestQ = null;

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
  for (const id of PRODUCT_ORDER) {
    const r = checks[id]();
    results[id] = r;
    if (!r.pass && !earliestQ) earliestQ = id;
  }

  const capabilityComplete = earliestM === null;
  const packagingComplete = earliestS === null;
  const productComplete = earliestQ === null;
  const earliest = earliestM || earliestS || earliestQ;
  const track = earliestM
    ? 'capability'
    : earliestS
      ? 'packaging'
      : earliestQ
        ? 'product'
        : 'complete';

  const progress = loadProgress();
  const out = {
    track,
    earliestUnfinished: earliest,
    allComplete: earliest === null,
    capabilityComplete,
    packagingComplete,
    productComplete,
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
    console.log('Packaging track · S0–S7');
    for (const id of PACKAGING_ORDER) {
      const r = results[id];
      console.log(`  ${id}  ${(r.pass ? 'DONE' : 'TODO').padEnd(4)}  ${JSON.stringify(r.details)}`);
    }
    console.log('');
    console.log('Product track · Q1–Q5 (autonomous any-URL QA)');
    for (const id of PRODUCT_ORDER) {
      const r = results[id];
      console.log(`  ${id}  ${(r.pass ? 'DONE' : 'TODO').padEnd(4)}  ${JSON.stringify(r.details)}`);
    }
    console.log('');
    if (earliestM) {
      console.log(`Next milestone: ${earliestM} (capability)`);
      console.log(`Spec: support/agent-workflow/milestones/${earliestM}-*.md`);
    } else if (earliestS) {
      console.log(`Next packaging step: ${earliestS}`);
      console.log(`Spec: support/agent-workflow/milestones/${earliestS}-*.md`);
      console.log('Prompt: support/agent-workflow/prompts/packaging.md');
    } else if (earliestQ) {
      console.log(`Next product step: ${earliestQ} (autonomous any-URL QA)`);
      console.log(`Spec: support/agent-workflow/milestones/${earliestQ}-*.md`);
      console.log('Prompt: support/agent-workflow/prompts/autonomous-qa.md');
    } else {
      console.log('Capability, packaging, and product probes all passed.');
    }
    console.log('Invoke: /zero-target-arch');
    console.log(
      `Acceptance floor (M1–M4): ${out.acceptanceFloorMet ? 'MET' : 'NOT MET'}`
    );
  }

  process.exit(0);
}

main();
