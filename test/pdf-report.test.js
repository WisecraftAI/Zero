"use strict";

const { PassThrough } = require("stream");
const { sendRunPdfReport, releaseGate, gateScore } = require("../services/api/src/reports/runPdfReport");
const { reportPalette, PALETTES } = require("@zero/brand");

function completedRun(overrides = {}) {
  return {
    id: "pdf-test-run",
    createdAt: "2026-08-30T10:00:00.000Z",
    updatedAt: "2026-08-30T10:00:02.000Z",
    status: "completed",
    input: { ottUrl: "https://example.com", channelProfile: "generic" },
    stages: {
      ba: { label: "BA", status: "done" },
      manualQa: { label: "Manual QA", status: "done" },
      automationQa: { label: "Automation QA", status: "done" },
      execution: { label: "Execution", status: "done" },
      manager: { label: "Manager", status: "done" },
      delivery: { label: "Delivery", status: "done" }
    },
    artifacts: {
      requirements: { metadata: { profile: "generic" }, requirements: [] },
      manualTestCases: { testCases: [] },
      automationBundle: {},
      executionReport: {
        totals: { total: 1, passed: 1, failed: 0, skipped: 0, passRate: "100%" },
        tests: [{ id: "TC-1", title: "Loads home", status: "passed", screenshot: "home.png" }]
      },
      managerReport: {
        executiveSummary: { verdict: "GO", passRate: "100%" }
      },
      deliveryReport: {}
    },
    ...overrides
  };
}

function responseStream() {
  const stream = new PassThrough();
  stream.headers = {};
  stream.setHeader = (name, value) => {
    stream.headers[name.toLowerCase()] = value;
  };
  return stream;
}

describe("release gate", () => {
  it("bands the pass rate at 95 and 85", () => {
    expect(releaseGate(100).verdict).toBe("Full pass");
    expect(releaseGate(95).verdict).toBe("Full pass");
    expect(releaseGate(94).verdict).toBe("Conditional pass");
    expect(releaseGate(85).verdict).toBe("Conditional pass");
    expect(releaseGate(84).verdict).toBe("Manual check");
    expect(releaseGate(0).verdict).toBe("Manual check");
  });

  it("asks for a manual spot check on a full pass", () => {
    expect(releaseGate(96).directive).toMatch(/spot-check/i);
  });

  it("treats a run with nothing executed as unscored and manual", () => {
    const gate = releaseGate(null);
    expect(gate.verdict).toBe("Manual check");
    expect(gate.scoreLabel).toBe("n/a");
  });

  it("scores a skipped check as a failure", () => {
    expect(gateScore({ passed: 8, failed: 0, skipped: 2 })).toBe(80);
    expect(gateScore({ passed: 1, failed: 1, skipped: 2 })).toBe(25);
    expect(gateScore({ passed: 0, failed: 0, skipped: 3 })).toBe(0);
    expect(releaseGate(gateScore({ passed: 8, failed: 0, skipped: 2 })).verdict).toBe("Manual check");
  });

  it("is unscored only when no check was recorded at all", () => {
    expect(gateScore({ passed: 0, failed: 0, skipped: 0 })).toBeNull();
    expect(gateScore()).toBeNull();
  });
});

describe("run PDF report", () => {
  it("generates a PDF and resolves evidence from object storage", async () => {
    const res = responseStream();
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    const screenshot = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64"
    );
    const resolveScreenshot = jest.fn().mockResolvedValue(screenshot);

    await sendRunPdfReport(completedRun(), res, { resolveScreenshot });

    const body = Buffer.concat(chunks);
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
    expect(res.headers["content-type"]).toBe("application/pdf");
    expect(res.headers["content-disposition"]).toContain("pdf-test-run.pdf");
    expect(resolveScreenshot).toHaveBeenCalledWith("home.png");
  });

  it("leaves screenshots from skipped checks out of the evidence appendix", async () => {
    const res = responseStream();
    const chunks = [];
    res.on("data", (chunk) => chunks.push(chunk));
    const resolveScreenshot = jest.fn().mockResolvedValue(null);

    const run = completedRun();
    run.artifacts.executionReport = {
      totals: { total: 2, passed: 1, failed: 0, skipped: 1, passRate: "50%" },
      tests: [
        { id: "TC-1", title: "Loads home", status: "passed", screenshot: "home.png" },
        { id: "TC-2", title: "Signs in", status: "skipped", screenshot: "signin-skipped.png" }
      ]
    };

    await sendRunPdfReport(run, res, { resolveScreenshot });

    expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
    expect(resolveScreenshot).toHaveBeenCalledWith("home.png");
    expect(resolveScreenshot).not.toHaveBeenCalledWith("signin-skipped.png");
  });

  it("renders every operator theme, and an unknown id falls back", async () => {
    for (const theme of [...Object.keys(PALETTES), "no-such-theme", undefined]) {
      const res = responseStream();
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));

      await sendRunPdfReport(completedRun(), res, { theme });

      expect(Buffer.concat(chunks).subarray(0, 4).toString()).toBe("%PDF");
    }
  });

  it("keeps the logo visible when a dark theme is forced onto light paper", () => {
    const themed = reportPalette("obsidian");
    const printed = reportPalette("obsidian", { paper: "light" });

    // The theme's own ink is near-white for a dark page; on white paper it has
    // to be re-derived or the letterforms disappear.
    expect(themed.inverted).toBe(true);
    expect(printed.inverted).toBe(false);
    expect(printed.logo.ink).not.toBe(themed.logo.ink);
    expect(printed.coverLogo.ink).toBe(themed.logo.ink);
  });
});
