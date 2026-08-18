"use strict";

const domain = require("@zero/domain");
const execution = require("@zero/domain/execution");
const outputRoots = require("@zero/domain/outputRoots");
const { appProfiles } = require("../packages/domain/lib/profiles");
const { stageKeys, RUNS_REQUESTED } = require("../packages/domain/lib/stages");

describe("@zero/domain public API", () => {
  it("keeps main and subpath entry points compatible", () => {
    expect(domain.stageKeys[0]).toBe("webAnalyzer");
    expect(domain.RUNS_REQUESTED).toBe("runs.requested");
    expect(execution.EXECUTION_REQUESTED).toBe("execution.requested");
    expect(typeof outputRoots.artifactsDir).toBe("function");
  });

  it("preserves pipeline stage order and optional stages", () => {
    expect(stageKeys).toEqual([
      "webAnalyzer",
      "ba",
      "manualQa",
      "automationQa",
      "execution",
      "accessibility",
      "performance",
      "security",
      "manager",
      "delivery"
    ]);
    expect(domain.optionalStageKeys).toEqual(["accessibility", "performance"]);
    expect(RUNS_REQUESTED).toBe("runs.requested");
  });

  it("validates run intake with pure schema helpers", () => {
    const schemas = require("@zero/domain/schemas");

    expect(domain.validateRunInput).toBe(schemas.validateRunInput);
    expect(domain.validateRunInput({ ottUrl: "https://example.test", notes: "BA notes" })).toEqual({
      ok: true,
      errors: []
    });
    expect(domain.validateRunInput({ ottUrl: "https://example.test" }).ok).toBe(false);
  });

  it("exposes OTT and non-OTT channel profiles with selector candidates", () => {
    expect(appProfiles.tvnz.name).toBe("TVNZ+");
    expect(appProfiles.tvnz.selectorCandidates.playCta.length).toBeGreaterThan(0);
    expect(appProfiles.ecommerce.selectorCandidates.searchBox).toEqual(
      expect.arrayContaining(["input[type='search']"])
    );
    expect(appProfiles.default.selectorCandidates.contentCard.length).toBeGreaterThan(0);
  });

  it("resolves regenerable output roots from cwd by default", () => {
    const previous = process.env.ZERO_DIST_ROOT;
    delete process.env.ZERO_DIST_ROOT;
    delete process.env.VERCEL;

    expect(outputRoots.distRoot()).toContain(`${require("path").sep}dist`);
    expect(outputRoots.artifactsDir()).toContain(`${require("path").sep}dist${require("path").sep}artifacts`);
    expect(outputRoots.localStoreDir()).toContain("cloud-store");

    if (previous) process.env.ZERO_DIST_ROOT = previous;
  });
});

describe("@zero/domain execution contract", () => {
  it("resolves when a matching execution.completed message arrives", async () => {
    let completedHandler;
    const queue = {
      subscribe(topic, handler) {
        if (topic === "execution.completed") completedHandler = handler;
        return () => {
          completedHandler = null;
        };
      },
      whenSubscribed: jest.fn().mockResolvedValue(undefined),
      publish(topic, message) {
        if (topic === "execution.requested") {
          completedHandler?.({
            batchId: message.batchId,
            ok: true,
            report: { passed: 1 }
          });
        }
      }
    };

    await expect(
      execution.requestExecution(queue, { runId: "run-1", tests: [] }, { timeoutMs: 5000 })
    ).resolves.toEqual({ passed: 1 });
  });
});
