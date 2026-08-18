require("dotenv").config();

const { spawn } = require("child_process");
const path = require("path");
const http = require("http");
const { Pool } = require("pg");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.SMOKE_PORT || 3999);
const BASE = `http://127.0.0.1:${PORT}`;
const NOTES =
  "S1 smoke notes: long enough to skip Web Analyzer and still satisfy BA input rules.";

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getJson(urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.get(`${BASE}${urlPath}`, (res) => {
      let raw = "";
      res.on("data", (c) => {
        raw += c;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(raw || "{}") });
        } catch (err) {
          reject(new Error(`Invalid JSON from ${urlPath}: ${raw.slice(0, 200)}`));
        }
      });
    });
    req.on("error", reject);
    req.setTimeout(8000, () => {
      req.destroy(new Error(`timeout ${urlPath}`));
    });
  });
}

function postRun() {
  const boundary = `----ZeroSmoke${Date.now()}`;
  const fields = {
    ottUrl: "https://example.com",
    notes: NOTES,
    channelProfile: "generic",
    testCaseInputMode: "auto"
  };
  const parts = Object.entries(fields).map(
    ([k, v]) =>
      `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`
  );
  const body = Buffer.from(`${parts.join("")}--${boundary}--\r\n`);

  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path: "/runs",
        method: "POST",
        headers: {
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
          "Content-Length": body.length
        }
      },
      (res) => {
        let raw = "";
        res.on("data", (c) => {
          raw += c;
        });
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(raw || "{}") });
          } catch (err) {
            reject(new Error(`Invalid JSON from POST /runs: ${raw.slice(0, 200)}`));
          }
        });
      }
    );
    req.on("error", reject);
    req.setTimeout(15000, () => {
      req.destroy(new Error("timeout POST /runs"));
    });
    req.end(body);
  });
}

async function waitForHealth(timeoutMs = 45000) {
  const start = Date.now();
  let lastErr;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await getJson("/health");
      if (r.status === 200 && r.body.ok) return r.body;
    } catch (err) {
      lastErr = err;
    }
    await wait(400);
  }
  throw lastErr || new Error("server did not become healthy");
}

async function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const guesses = [
    "postgres://zero:zero@127.0.0.1:5432/zero",
    "postgres://zero:zero@127.0.0.1:15432/zero"
  ];
  for (const url of guesses) {
    const pool = new Pool({ connectionString: url, connectionTimeoutMillis: 1500 });
    try {
      await pool.query("SELECT 1");
      await pool.end();
      return url;
    } catch (_err) {
      await pool.end().catch(() => {});
    }
  }
  return "";
}

describe("S1 HTTP smoke", () => {
  let child;
  let databaseUrl = "";

  beforeAll(async () => {
    databaseUrl = await resolveDatabaseUrl();
    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      EXECUTION_MODE: "minimal",
      ZERO_CLOUD: "local",
      ZERO_LLM: "off"
    };
    if (databaseUrl) env.DATABASE_URL = databaseUrl;
    delete env.VERCEL;

    child = spawn(process.execPath, ["scripts/local-stack.js"], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    child.stderr.on("data", () => {});
    child.on("exit", (code, signal) => {
      if (code && code !== 0 && child._keepAlive) {
        console.warn(`server exited early (${code}/${signal})`);
      }
    });
    child._keepAlive = true;

    await waitForHealth();
  });

  afterAll(async () => {
    if (!child) return;
    child._keepAlive = false;
    child.kill("SIGTERM");
    await wait(500);
    if (!child.killed) child.kill("SIGKILL");
  });

  it("GET /health is ok", async () => {
    const r = await getJson("/health");
    expect(r.status).toBe(200);
    expect(r.body.ok).toBe(true);
    expect(r.body.service).toBe("ZER0");
  });

  it("POST /runs starts a pipeline and reaches a terminal status", async () => {
    const created = await postRun();
    expect(created.status).toBe(202);
    expect(created.body.runId).toBeTruthy();

    const runId = created.body.runId;
    const deadline = Date.now() + 150000;
    let last;

    while (Date.now() < deadline) {
      const r = await getJson(`/runs/${runId}`);
      expect(r.status).toBe(200);
      last = r.body;
      if (last.status === "completed" || last.status === "failed") break;
      await wait(1500);
    }

    expect(["completed", "failed"]).toContain(last.status);
    expect(last.stages).toBeTruthy();
    expect(last.stages.ba.status).toBe("done");
    expect(last.stages.manualQa.status).toBe("done");
    expect(last.stages.automationQa.status).toBe("done");
    expect(last.stages.manager).toBeTruthy();

    if (last.status === "failed") {
      console.warn("Pipeline finished failed (still a valid smoke of intake + persist):", last.error);
    }

    if (databaseUrl) {
      const pool = new Pool({ connectionString: databaseUrl });
      const row = await pool.query("SELECT id, status FROM qa_runs WHERE id = $1", [runId]);
      await pool.end();
      expect(row.rows).toHaveLength(1);
      expect(row.rows[0].id).toBe(runId);
    }
  });
});
