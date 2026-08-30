"use strict";

const { defineConfig } = require("@playwright/test");

module.exports = defineConfig({
  testDir: "./test/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 180000,
  expect: { timeout: 10000 },
  use: {
    baseURL: "http://127.0.0.1:4199",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command:
        "PORT=3997 NODE_ENV=test ZERO_CLOUD=local ZERO_LLM=off DATABASE_URL= REDIS_URL= npm run start:all",
      url: "http://127.0.0.1:3997/health",
      timeout: 60000,
      reuseExistingServer: false
    },
    {
      command:
        "VITE_API_BASE_URL=http://127.0.0.1:3997 npm run dev -w @zero/web -- --host 127.0.0.1 --port 4199",
      url: "http://127.0.0.1:4199",
      timeout: 60000,
      reuseExistingServer: false
    }
  ]
});
