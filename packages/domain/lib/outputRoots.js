"use strict";

/**
 * Single tree for regenerable outputs:
 *   dist/web        — Vite UI build
 *   dist/artifacts  — run evidence + local object store
 *   dist/coverage   — Jest coverage
 *   dist/logs       — Winston file logs
 *
 * Override the tree root with ZERO_DIST_ROOT. Vercel uses /tmp/dist.
 */

const path = require("path");

function distRoot() {
  if (process.env.ZERO_DIST_ROOT) return process.env.ZERO_DIST_ROOT;
  if (process.env.VERCEL) return path.join("/tmp", "dist");
  return path.join(process.cwd(), "dist");
}

function webDir() {
  return path.join(distRoot(), "web");
}

function artifactsDir() {
  return path.join(distRoot(), "artifacts");
}

function logsDir() {
  return path.join(distRoot(), "logs");
}

function coverageDir() {
  return path.join(distRoot(), "coverage");
}

function localStoreDir() {
  return process.env.ZERO_LOCAL_STORE_DIR || path.join(artifactsDir(), "cloud-store");
}

module.exports = {
  distRoot,
  webDir,
  artifactsDir,
  logsDir,
  coverageDir,
  localStoreDir
};
