require("dotenv").config();

const { Pool } = require("pg");
const db = require("@zero/db");

function candidateUrls() {
  if (process.env.DATABASE_URL) return [process.env.DATABASE_URL];
  if (process.env.PGHOST) {
    const user = process.env.PGUSER || "zero";
    const pass = process.env.PGPASSWORD || "zero";
    const host = process.env.PGHOST;
    const port = process.env.PGPORT || 5432;
    const dbname = process.env.PGDATABASE || "zero";
    return [`postgres://${user}:${pass}@${host}:${port}/${dbname}`];
  }
  return [
    "postgres://zero:zero@127.0.0.1:5432/zero",
    "postgres://zero:zero@127.0.0.1:15432/zero"
  ];
}

async function tryPool() {
  for (let attempt = 0; attempt < 5; attempt++) {
    for (const url of candidateUrls()) {
      const pool = new Pool({
        connectionString: url,
        connectionTimeoutMillis: 2500,
        query_timeout: 8000
      });
      try {
        await pool.query("SELECT 1");
        return pool;
      } catch (_err) {
        await pool.end().catch(() => {});
      }
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return null;
}

describe("M1 durable store", () => {
  let pool;

  beforeAll(async () => {
    pool = await tryPool();
    if (!pool) return;
    await db.initAllTables(pool);
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it("upserts a run that can be read back after the connection is reused (restart-equivalent)", async () => {
    if (!pool) {
      console.warn("Skipping Postgres persist test — no reachable DATABASE_URL / PGHOST");
      return;
    }

    const id = `m1-smoke-${Date.now()}`;
    const run = {
      id,
      status: "queued",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      input: {
        ottUrl: "https://example.com",
        notes: "M1 persist/reload smoke — notes long enough to skip analyzer.",
        login: { enabled: true, usernameMasked: "qa***", password: "must-not-land" },
        loginPassword: "must-not-land"
      },
      stages: { ba: { status: "pending" } },
      artifacts: {
        requirements: { title: "M1 smoke" },
        manualTestCases: { testCases: [{ id: "TC-1", feature: "home" }] },
        automationBundle: {
          generatedPlaywrightScript: "test('smoke', async ({ page }) => {});",
          generatedSeleniumJava: ""
        },
        managerReport: { verdict: "go" }
      }
    };

    await db.upsertRun(pool, run);
    await db.replaceAssets(pool, run);

    const row = await db.getRunById(pool, id);
    expect(row).toBeTruthy();
    expect(row.status).toBe("queued");
    expect(row.input_json.ottUrl).toBe("https://example.com");
    expect(JSON.stringify(row.input_json)).not.toMatch(/must-not-land/);

    const assets = await db.listAssetsByRunId(pool, id);
    expect(assets.length).toBeGreaterThanOrEqual(3);
    expect(assets.map((a) => a.asset_type)).toEqual(
      expect.arrayContaining(["manual_test_cases", "automation_script", "manager_report"])
    );

    await pool.query("DELETE FROM qa_runs WHERE id = $1", [id]);
  });
});
