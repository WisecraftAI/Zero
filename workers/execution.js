#!/usr/bin/env node
const { boot } = require("../apps/executor/main.js");

if (require.main === module) {
  boot().catch((err) => {
    console.error("Executor failed to start:", err);
    process.exit(1);
  });
}

module.exports = { boot };
