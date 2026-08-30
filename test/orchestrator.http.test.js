require("dotenv").config();

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.ORCH_HTTP_PORT || 3997);
const BASE = `http://127.0.0.1:${PORT}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request({ method, urlPath, headers = {}, body }) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: urlPath,
        method,
        headers
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          const raw = Buffer.concat(chunks).toString("utf8");
          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch (_) {
            parsed = null;
          }
          resolve({ status: res.statusCode, headers: res.headers, raw, body: parsed });
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error(`timeout ${method} ${urlPath}`)));
    if (body) req.write(body);
    req.end();
  });
}

async function waitForHealth(timeoutMs = 45000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await request({ method: "GET", urlPath: "/health" });
      if (r.status === 200 && r.body && r.body.ok) return r.body;
    } catch (err) {
      lastErr = err;
    }
    await wait(400);
  }
  throw lastErr || new Error("server did not become healthy");
}

describe("M3 queue-triggered HTTP", () => {
  let child;

  beforeAll(async () => {
    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      EXECUTION_MODE: "minimal",
      ZERO_CLOUD: "local",
      ZERO_ORCH_CONCURRENCY: "2",
      ZERO_LLM: "off"
    };
    delete env.VERCEL;
    delete env.ORCHESTRATOR_ONLY;
    child = spawn(process.execPath, ["services/api/server.js"], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    await waitForHealth();
  });

  afterAll(async () => {
    if (!child) return;
    child.kill("SIGTERM");
    await wait(400);
    if (!child.killed) child.kill("SIGKILL");
  });

  it("POST /runs returns before the pipeline finishes", async () => {
    const t0 = Date.now();
    const created = await request({
      method: "POST",
      urlPath: "/runs",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ottUrl: "https://example.com",
        notes: "M3 queue path — notes long enough to skip Web Analyzer stage.",
        channelProfile: "generic",
        testCaseInputMode: "auto"
      })
    });
    const elapsed = Date.now() - t0;

    expect(created.status).toBe(202);
    expect(created.body.runId).toBeTruthy();
    expect(elapsed).toBeLessThan(2000);

    const snap = await request({ method: "GET", urlPath: `/runs/${created.body.runId}` });
    expect(snap.status).toBe(200);
    expect(["queued", "running", "completed", "failed"]).toContain(snap.body.status);

    const rerun = await request({
      method: "POST",
      urlPath: `/runs/${created.body.runId}/rerun-failed`
    });
    expect(rerun.status).toBe(409);
    expect(rerun.body.error).toMatch(/still in progress/);
  });

  it("SSE stream sends a state event", async () => {
    const created = await request({
      method: "POST",
      urlPath: "/runs",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ottUrl: "https://example.com",
        notes: "M3 SSE — notes long enough to skip Web Analyzer stage.",
        channelProfile: "generic",
        testCaseInputMode: "auto"
      })
    });
    const runId = created.body.runId;

    const first = await new Promise((resolve, reject) => {
      const req = http.get(`${BASE}/runs/${runId}/stream`, (res) => {
        expect(res.statusCode).toBe(200);
        expect(String(res.headers["content-type"] || "")).toMatch(/text\/event-stream/);
        let buf = "";
        res.on("data", (c) => {
          buf += c;
          if (buf.includes("event: state")) {
            req.destroy();
            resolve(buf);
          }
        });
      });
      req.on("error", (err) => {
        if (err.code === "ECONNRESET") return;
        reject(err);
      });
      req.setTimeout(8000, () => {
        req.destroy();
        reject(new Error("SSE timeout"));
      });
    });

    expect(first).toMatch(/event: state/);
    expect(first).toMatch(runId);
  });
});
