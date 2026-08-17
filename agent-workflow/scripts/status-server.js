#!/usr/bin/env node
'use strict';

/**
 * Tiny HTTP front for detect/verify. Reads the repo at process.cwd() / ROOT
 * so a compose bind-mount of the live tree is what gets probed.
 *
 *   GET /health
 *   GET /status   (also /)
 *   GET /verify?milestone=M1
 */

const http = require('http');
const { spawnSync } = require('child_process');
const path = require('path');

const PORT = Number(process.env.PORT || 5175);
const ROOT = path.resolve(__dirname, '../..');
const detectPath = path.join(__dirname, 'detect-milestone.js');

function detectJson() {
  const probe = spawnSync(process.execPath, [detectPath, '--json'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  if (probe.status !== 0) {
    const err = new Error((probe.stderr || probe.stdout || 'detect-milestone failed').trim());
    err.statusCode = 500;
    throw err;
  }
  return JSON.parse(probe.stdout);
}

function send(res, status, body) {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);
  if (req.method !== 'GET') {
    send(res, 405, { error: 'method not allowed' });
    return;
  }

  try {
    if (url.pathname === '/health') {
      send(res, 200, { ok: true, service: 'agent-workflow', codeRoot: ROOT });
      return;
    }

    if (url.pathname === '/' || url.pathname === '/status') {
      send(res, 200, { service: 'agent-workflow', codeRoot: ROOT, ...detectJson() });
      return;
    }

    if (url.pathname === '/verify') {
      const data = detectJson();
      const requested = (url.searchParams.get('milestone') || '').toUpperCase() || data.earliestUnfinished;
      if (!requested) {
        send(res, 200, { ok: true, message: 'capability and packaging probes all green', ...data });
        return;
      }
      const result = data.results[requested];
      if (!result) {
        send(res, 400, { ok: false, error: `unknown milestone: ${requested}` });
        return;
      }
      send(res, result.pass ? 200 : 409, {
        ok: result.pass,
        milestone: requested,
        details: result.details,
        earliestUnfinished: data.earliestUnfinished,
      });
      return;
    }

    send(res, 404, { error: 'not found' });
  } catch (err) {
    send(res, err.statusCode || 500, { error: err.message || String(err) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`agent-workflow status on :${PORT} (code root ${ROOT})`);
});
