"use strict";

function wantsHeaded(run, env = process.env) {
  return Boolean(run?.input?.runHeaded || env.RUN_HEADED === "true");
}

/**
 * Headed Chromium needs DISPLAY (local dev). The Docker executor has no X11,
 * so "Show browser" is ignored there and we fall back to headless.
 */
function resolveHeadless(run, env = process.env) {
  if (!wantsHeaded(run, env)) return true;
  if (env.DISPLAY) return false;
  console.warn(
    "[executor] Show browser / RUN_HEADED ignored: no DISPLAY " +
      "(headed mode works on the host via npm run start:all, not in the executor container)"
  );
  return true;
}

function launch(options = {}) {
  const { chromium: pChromium } = require("playwright");
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
  const args = [...new Set([...defaultArgs, ...(options.args || [])])];
  return pChromium.launch({ ...options, args });
}

const chromium = { launch };

module.exports = { chromium, launch, resolveHeadless, wantsHeaded };
