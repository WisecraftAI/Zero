"use strict";

function launch(options = {}) {
  const { chromium: pChromium } = require("playwright");
  const defaultArgs = ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"];
  const args = [...new Set([...defaultArgs, ...(options.args || [])])];
  return pChromium.launch({ ...options, args });
}

const chromium = { launch };

module.exports = { chromium, launch };
