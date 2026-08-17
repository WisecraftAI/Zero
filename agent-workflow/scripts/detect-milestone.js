#!/usr/bin/env node
'use strict';

/**
 * Probe the repo for Target-architecture milestone completion.
 * Prints earliest unfinished milestone and JSON summary.
 *
 * Usage: node agent-workflow/scripts/detect-milestone.js [--json]
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const ORDER = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];

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

function listCloudProviders() {
  const dir = path.join(ROOT, 'lib/cloud');
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .filter((d) => fs.existsSync(path.join(dir, d.name, 'index.js')))
    .map((d) => d.name);
}

const checks = {
  M1() {
    const server = read('server.js');
    const db = read('lib/db.js');
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
    const index = read('lib/cloud/index.js');
    const types = read('lib/cloud/index.d.ts');
    const server = read('server.js');
    const routes = read('lib/routes/cloud.js') + read('lib/cloud/http.js');
    const hasPresign =
      /presignPut/.test(index + types) && /presignGet/.test(index + types);
    const hasLocalStore =
      exists('lib/cloud/local/storage.js') || exists('lib/cloud/local/objectStore.js');
    const wired =
      /require\(['"]\.\/lib\/cloud['"]\)|require\(['"]\.\/cloud['"]\)|presignPut|objectStore/.test(
        server + routes
      ) && /\/api\/cloud|presignPut|objectStore/.test(server + routes);
    return {
      pass: hasPresign && hasLocalStore && exists('lib/cloud/index.js') && wired,
      details: {
        cloudIndex: exists('lib/cloud/index.js'),
        presignMethods: hasPresign,
        localObjectStore: hasLocalStore,
        apiWiredToObjectStore: wired,
      },
    };
  },

  M3() {
    const cloud = read('lib/cloud/index.js') + read('lib/cloud/local/queue.js');
    const server = read('server.js');
    const worker =
      exists('workers/orchestrator.js') ||
      exists('lib/orchestrator/index.js') ||
      exists('lib/orchestrator.js');
    const publishes =
      /runs\.requested/.test(server + cloud) ||
      /topic:\s*['"]runs\.requested['"]/.test(server + cloud) ||
      /publish\(\s*['"]runs\.requested['"]/.test(server + cloud + read('lib/orchestrator/index.js') + read('workers/orchestrator.js'));
    return {
      pass: worker && publishes,
      details: { orchestratorEntrypoint: worker, publishesRunsRequested: Boolean(publishes) },
    };
  },

  M4() {
    const blobs = [
      read('server.js'),
      read('workers/execution.js'),
      read('lib/execution/worker.js'),
      read('workers/orchestrator.js'),
    ].join('\n');
    const hasTopic = /execution\.requested/.test(blobs);
    const hasWorker =
      exists('workers/execution.js') || exists('lib/execution/worker.js');
    return {
      pass: hasTopic && hasWorker,
      details: { executionWorker: hasWorker, executionRequestedTopic: hasTopic },
    };
  },

  M5() {
    const server = read('server.js');
    const authLib = read('lib/auth.js') + read('lib/middleware/auth.js');
    const anyKey =
      /apiKeyAuth[\s\S]{0,400}x-api-key[\s\S]{0,200}(any|non-empty|truthy)/i.test(server) ||
      /if\s*\(\s*!apiKey\s*\)/.test(server) && /x-api-key/i.test(server) && !/provider_keys|stored.*key|verifyApiKey/.test(server + authLib);
    const recordingStar = /Access-Control-Allow-Origin['":\s]*\*/.test(server);
    const hasAuthModule = exists('lib/auth.js') || exists('lib/middleware/auth.js');
    // Pass when auth module exists AND recording CORS is not wildcard
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
    const server = read('server.js');
    const orch = read('lib/orchestrator/index.js') + read('workers/orchestrator.js');
    const llm = read('lib/llm/index.js') + read('lib/providers/index.js');
    const wired =
      /openai|anthropic|generativelanguage|bedrock|callProvider|chat\.completions/i.test(
        server + orch + llm
      ) && (exists('lib/llm/index.js') || exists('lib/providers/index.js') || /provider-keys|providerKeys/.test(orch));
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
  let earliest = null;

  for (const id of ORDER) {
    const r = checks[id]();
    results[id] = r;
    if (!r.pass && !earliest) earliest = id;
  }

  const progress = loadProgress();
  const out = {
    earliestUnfinished: earliest,
    allComplete: earliest === null,
    acceptanceFloorMet:
      results.M1.pass && results.M2.pass && results.M3.pass && results.M4.pass,
    results,
    progressCurrent: progress && progress.current,
  };

  if (asJson) {
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
  } else {
    console.log('ZER0 target-architecture status\n');
    for (const id of ORDER) {
      const r = results[id];
      const mark = r.pass ? 'DONE' : 'TODO';
      console.log(`  ${id}  ${mark.padEnd(4)}  ${JSON.stringify(r.details)}`);
    }
    console.log('');
    if (earliest) {
      console.log(`Next milestone: ${earliest}`);
      console.log(`Spec: agent-workflow/milestones/ (see ${earliest}-*.md)`);
      console.log('Invoke: /zero-target-arch');
    } else {
      console.log('All probe milestones passed. Confirm M5–M7 product gaps manually.');
    }
    console.log(
      `Acceptance floor (M1–M4): ${out.acceptanceFloorMet ? 'MET' : 'NOT MET'}`
    );
  }

  process.exit(0);
}

main();
