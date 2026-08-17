require("dotenv").config();

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.AUTH_HTTP_PORT || 3996);

const ACME_KEY = "zero-acme-secret-http";
const BETA_KEY = "zero-beta-secret-http";

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

function startRunBody() {
  return JSON.stringify({
    ottUrl: "https://example.com",
    notes: "M5 auth isolation notes — long enough to skip Web Analyzer and satisfy BA.",
    channelProfile: "generic",
    testCaseInputMode: "auto"
  });
}

describe("M5 auth HTTP", () => {
  let child;

  beforeAll(async () => {
    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      ZERO_AUTH: "on",
      ZERO_API_KEYS: `acme:qa@acme.test:${ACME_KEY},beta:qa@beta.test:${BETA_KEY}`,
      EXECUTION_MODE: "minimal",
      ZERO_CLOUD: "local",
      RECORDING_ORIGINS: "https://watch.example.com",
      ZERO_LLM: "off"
    };
    delete env.VERCEL;
    child = spawn(process.execPath, ["apps/api/server.js"], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stderr.on("data", () => {});
    await waitForHealth();
  });

  afterAll(async () => {
    if (!child) return;
    child.kill("SIGTERM");
    await wait(400);
    if (!child.killed) child.kill("SIGKILL");
  });

  it("rejects unauthenticated run reads and unverified keys", async () => {
    const noKey = await request({ method: "GET", urlPath: "/api/runs" });
    expect(noKey.status).toBe(401);

    const garbage = await request({
      method: "GET",
      urlPath: "/api/runs",
      headers: { "x-api-key": "sk-not-a-real-key" }
    });
    expect(garbage.status).toBe(401);
  });

  it("prevents tenant B from reading tenant A runs or artifacts", async () => {
    const created = await request({
      method: "POST",
      urlPath: "/api/runs",
      headers: { "content-type": "application/json", "x-api-key": ACME_KEY },
      body: startRunBody()
    });
    expect(created.status).toBe(202);
    const runId = created.body.runId;
    expect(runId).toBeTruthy();

    const asAcme = await request({
      method: "GET",
      urlPath: `/api/runs/${runId}`,
      headers: { "x-api-key": ACME_KEY }
    });
    expect(asAcme.status).toBe(200);
    expect(asAcme.body.tenantId).toBe("acme");

    const asBeta = await request({
      method: "GET",
      urlPath: `/api/runs/${runId}`,
      headers: { "x-api-key": BETA_KEY }
    });
    expect(asBeta.status).toBe(404);

    const files = await request({
      method: "GET",
      urlPath: `/api/runs/${runId}/files/run.json`,
      headers: { "x-api-key": BETA_KEY }
    });
    expect(files.status).toBe(404);

    const spoof = await request({
      method: "GET",
      urlPath: `/api/runs/${runId}`,
      headers: { "X-User-Email": "qa@acme.test" }
    });
    expect(spoof.status).toBe(401);
  });

  it("does not set wildcard recording CORS", async () => {
    const denied = await request({
      method: "GET",
      urlPath: "/recorder.js?sessionId=test",
      headers: { Origin: "https://evil.example" }
    });
    expect(denied.headers["access-control-allow-origin"]).toBeUndefined();

    const allowed = await request({
      method: "GET",
      urlPath: "/recorder.js?sessionId=test",
      headers: { Origin: "https://watch.example.com" }
    });
    expect(allowed.headers["access-control-allow-origin"]).toBe("https://watch.example.com");
    expect(allowed.headers["access-control-allow-origin"]).not.toBe("*");
  });
});
