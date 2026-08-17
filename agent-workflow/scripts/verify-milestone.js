#!/usr/bin/env node
'use strict';

/**
 * Verify a specific milestone (or earliest unfinished).
 *
 * Usage:
 *   node agent-workflow/scripts/verify-milestone.js
 *   node agent-workflow/scripts/verify-milestone.js --milestone M1
 */

const { spawnSync } = require('child_process');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const detectPath = path.join(__dirname, 'detect-milestone.js');

function parseArgs(argv) {
  let milestone = null;
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--milestone' && argv[i + 1]) {
      milestone = argv[++i].toUpperCase();
    }
  }
  return { milestone };
}

function main() {
  const { milestone: requested } = parseArgs(process.argv.slice(2));
  const probe = spawnSync(process.execPath, [detectPath, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (probe.status !== 0) {
    console.error(probe.stderr || 'detect-milestone failed');
    process.exit(1);
  }

  const data = JSON.parse(probe.stdout);
  const id = requested || data.earliestUnfinished;

  if (!id) {
    console.log('Nothing to verify — all milestones probe green.');
    process.exit(0);
  }

  if (!data.results[id]) {
    console.error(`Unknown milestone: ${id}`);
    process.exit(1);
  }

  const r = data.results[id];
  console.log(`Verify ${id}: ${r.pass ? 'PASS' : 'FAIL'}`);
  console.log(JSON.stringify(r.details, null, 2));

  if (requested && data.earliestUnfinished && requested !== data.earliestUnfinished) {
    const order = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];
    if (order.indexOf(requested) > order.indexOf(data.earliestUnfinished)) {
      console.warn(
        `Warning: earliest unfinished is ${data.earliestUnfinished}; verifying ${requested} out of order.`
      );
    }
  }

  process.exit(r.pass ? 0 : 1);
}

main();
