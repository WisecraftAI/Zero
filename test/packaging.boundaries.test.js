"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) =>
  fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const json = (relativePath) => JSON.parse(read(relativePath));

describe("packaging boundaries", () => {
  it("keeps API and orchestrator independent from the executor package", () => {
    const apiDeps = json("services/api/package.json").dependencies || {};
    const orchestratorDeps =
      json("services/orchestrator/package.json").dependencies || {};

    expect(apiDeps).not.toHaveProperty("@zero/executor");
    expect(apiDeps).not.toHaveProperty("@zero/orchestrator");
    expect(apiDeps).not.toHaveProperty("playwright");
    expect(orchestratorDeps).not.toHaveProperty("@zero/executor");
    expect(orchestratorDeps).not.toHaveProperty("playwright");
  });

  it("keeps worker boot and Chromium out of the HTTP API", () => {
    const server = read("services/api/server.js");

    expect(server).not.toMatch(
      /require\(["']@zero\/(?:executor|orchestrator)(?:\/[^"']*)?["']\)/
    );
    expect(server).not.toMatch(
      /chromium\.launch|startOrchestrator|createProcessRun|startExecutionWorker/
    );
  });

  it("uses workspace-scoped dependency installs for all runtime images", () => {
    const apiDocker = read("Dockerfile");
    const orchestratorDocker = read("services/orchestrator/Dockerfile");
    const executorDocker = read("services/executor/Dockerfile");

    expect(apiDocker).toMatch(/--workspace @zero\/api/);
    expect(apiDocker).toMatch(/COPY packages\/brand \.\/packages\/brand/);
    expect(orchestratorDocker).toMatch(/--workspace @zero\/orchestrator/);
    expect(executorDocker).toMatch(/--workspace @zero\/executor/);
    expect(apiDocker).not.toMatch(/COPY services \.\/services/);
    expect(orchestratorDocker).not.toMatch(/COPY services \.\/services/);
  });

  it("has no legacy root boot shims", () => {
    expect(fs.existsSync(path.join(ROOT, "server.js"))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, "workers", "execution.js"))).toBe(
      false
    );
    expect(fs.existsSync(path.join(ROOT, "workers", "orchestrator.js"))).toBe(
      false
    );
  });

  it("keeps Playwright crawl and script builders out of the HTTP API image", () => {
    const apiDeps = json("services/api/package.json").dependencies || {};
    const orchestratorDeps =
      json("services/orchestrator/package.json").dependencies || {};

    expect(apiDeps).not.toHaveProperty("@zero/analyzer");
    expect(apiDeps).not.toHaveProperty("@zero/builders");
    expect(orchestratorDeps).not.toHaveProperty("@zero/analyzer");
    expect(orchestratorDeps).not.toHaveProperty("playwright");
  });

  it("resolves Chromium only in the executor workspace", () => {
    const executorDeps = json("services/executor/package.json").dependencies || {};
    expect(executorDeps).toHaveProperty("@zero/analyzer");
    expect(executorDeps).toHaveProperty("playwright");
  });

});
