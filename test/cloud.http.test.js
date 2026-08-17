require("dotenv").config();

const { spawn } = require("child_process");
const http = require("http");
const path = require("path");
const { URL } = require("url");

const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.CLOUD_HTTP_PORT || 3998);
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
          const raw = Buffer.concat(chunks);
          let parsed = null;
          try {
            parsed = JSON.parse(raw.toString("utf8"));
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

describe("M2 signed object-store HTTP", () => {
  let child;

  beforeAll(async () => {
    const env = {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "test",
      EXECUTION_MODE: "minimal",
      ZERO_CLOUD: "local",
      ZERO_PUBLIC_BASE_URL: BASE,
      ZERO_LLM: "off"
    };
    delete env.VERCEL;
    child = spawn(process.execPath, ["apps/api/server.js"], {
      cwd: ROOT,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });
    child._keep = true;
    await waitForHealth();
  });

  afterAll(async () => {
    if (!child) return;
    child._keep = false;
    child.kill("SIGTERM");
    await wait(400);
    if (!child.killed) child.kill("SIGKILL");
  });

  it("does not serve a world-readable /artifacts listing", async () => {
    const r = await request({ method: "GET", urlPath: "/artifacts/" });
    expect(r.status).not.toBe(200);
  });

  it("presign PUT → GET → commit without streaming the file through POST /api/runs", async () => {
    const created = await request({
      method: "POST",
      urlPath: "/api/runs",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ottUrl: "https://example.com",
        notes: "M2 presign upload path — notes long enough to skip analyzer.",
        channelProfile: "generic",
        testCaseInputMode: "auto",
        uploads: ["tcFile"]
      })
    });

    expect(created.status).toBe(202);
    expect(created.body.runId).toBeTruthy();
    expect(created.body.uploads).toHaveLength(1);
    const upload = created.body.uploads[0];
    expect(upload.method).toBe("PUT");
    expect(upload.url).toMatch(/\/api\/cloud\/local\?/);

    const pending = await request({ method: "GET", urlPath: `/api/runs/${created.body.runId}` });
    expect(pending.body.status).toBe("awaiting_uploads");

    const csv = Buffer.from("id,feature,steps\nTC-1,home,open url\n");
    const putUrl = new URL(upload.url);
    const put = await request({
      method: "PUT",
      urlPath: putUrl.pathname + putUrl.search,
      headers: { "Content-Type": "text/csv", "Content-Length": csv.length },
      body: csv
    });
    expect(put.status).toBe(201);
    expect(put.body.ok).toBe(true);

    const getUrl = putUrl;
    getUrl.searchParams.set("op", "get");
    // token is bound to op — cannot reuse put token for get
    const forgedGet = await request({ method: "GET", urlPath: getUrl.pathname + getUrl.search });
    expect(forgedGet.status).toBe(403);

    const commit = await request({ method: "POST", urlPath: `/api/runs/${created.body.runId}/commit` });
    expect(commit.status).toBe(202);
    expect(commit.body.runId).toBe(created.body.runId);
  });
});
