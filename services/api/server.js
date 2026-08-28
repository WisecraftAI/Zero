require("dotenv").config();

const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");
const { Pool } = require("pg");
const compression = require("compression");
const cors = require("cors");

// Professional plugins
const logger = require("./logger");
const apiKeyManager = require("./apiKeyManager");
const swaggerSpec = require("./swagger");
const { 
  rateLimiters, 
  securityHeaders, 
  corsOptions, 
  requestId,
  cacheMiddleware,
  invalidateCache
} = require("./middleware");

// Swagger UI (conditionally load)
let swaggerUi;
try {
  swaggerUi = require("swagger-ui-express");
} catch (e) {
  logger.warn("swagger-ui-express not installed, API docs disabled");
}

const dbHelpers = require("@zero/db");
const { mergeOptionalArtifactsFromFile } = require("@zero/db/runStore");
const cloud = require("@zero/cloud");
const cloudHttp = require("@zero/cloud/http");
const { RUNS_REQUESTED, applyCancelToRun } = require("@zero/domain");
const { requestExecution } = require("@zero/domain/execution");
const encryption = require("./encryption");
const auth = require("./auth");
const elementLogger = require("@zero/locators/elementLogger");
const registerRecordingRoutes = require("./src/routes/recordings");
const registerRunsRoutes = require("./src/routes/runs");
const registerLocatorRoutes = require("./src/routes/locators");
const registerSettingsRoutes = require("./src/routes/settings");
const registerCmsRoutes = require("./src/routes/cms");
const registerKeyRoutes = require("./src/routes/keys");
const registerHealthRoutes = require("./src/routes/health");
const { artifactsDir } = require("@zero/domain").outputRoots;

const app = express();
// S7 default: the API listens on :3001. The web nginx image owns :3000.
const PORT = Number(process.env.PORT) || 3001;

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(compression());
app.use(requestId);

// Request logging
app.use(logger.requestLogger);

// S7: the API service owns route paths natively (no /api prefix). Auth and
// rate limits apply globally; sensitive routes still declare explicit scopes.
app.use(rateLimiters.general);
app.use(auth.attachIdentity());
app.use("/runs", auth.requireAuthWhenEnabled());
app.use("/provider-keys", auth.requireAuthWhenEnabled());
app.use("/agent-settings", auth.requireAuthWhenEnabled());

// Swagger API documentation
if (swaggerUi) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "ZER0 API Documentation"
  }));
  logger.info("API documentation available at /api-docs");
}

app.use(express.json({ limit: "1mb" }));

const artifactsRoot = artifactsDir();

// Ensure artifactsRoot exists on Vercel
if (process.env.VERCEL) {
  const fsSync = require("fs");
  if (!fsSync.existsSync(artifactsRoot)) {
    fsSync.mkdirSync(artifactsRoot, { recursive: true });
  }
}

app.use("/cloud", cloudHttp.createCloudRouter());
app.use("/artifacts", (_req, res) => {
  res.status(404).json({
    error: "Artifacts are not world-readable. Use a signed URL or GET /runs/:id/files/:name"
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

const runs = new Map();
const memoryProviderKeys = new Map(); // composite key "userEmail:provider" -> { provider, encrypted_key, last_4, created_at, updated_at }
const memoryAgentSettings = new Map(); // composite key "userEmail:agent" -> { agent, provider, model, prompt, updated_at }

// In-memory recording sessions (sessionId -> { ottUrl, events[], createdAt })
const recordingSessions = new Map();
const recordingsById = new Map(); // recordingId -> { sessionId, ottUrl, events, createdAt }
const endedSessionToRecordingId = new Map(); // sessionId -> recordingId (so /record page can poll)
let recordingIdCounter = 0;

let dbPool = null;
let dbEnabled = false;



function maskLogin(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 2) return "**";
  return `${text.slice(0, 2)}***`;
}

async function setRunSecret(runId, secret) {
  if (!secret || (!secret.username && !secret.password)) {
    return;
  }
  try {
    await cloud.cache.set(`runSecret.${runId}`, secret, 7200);
  } catch {
    // executor reads this when Chromium is in another process
  }
}

function databaseConfigured() {
  return dbHelpers.isDatabaseConfigured();
}

async function initDatabase() {
  if (!databaseConfigured()) return;

  try {
    dbPool = new Pool({
      connectionString: process.env.DATABASE_URL || undefined,
      host: process.env.PGHOST || undefined,
      port: process.env.PGPORT ? Number(process.env.PGPORT) : undefined,
      user: process.env.PGUSER || undefined,
      password: process.env.PGPASSWORD || undefined,
      database: process.env.PGDATABASE || undefined,
      ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: 5000,
      query_timeout: 10000
    });

    await dbHelpers.initAllTables(dbPool);
    await dbHelpers.runPendingMigrations(dbPool);
    dbEnabled = true;
  } catch (err) {
    dbPool = null;
    dbEnabled = false;
    console.warn("Postgres connection failed (running with memory/file persistence):", err.message);
  }
}

if (process.env.VERCEL) {
  auth.assertProductionSecrets();
  app.use((req, res, next) => {
    if (!dbPool && databaseConfigured()) {
      initDatabase().catch((e) => console.error("Lazy DB init failed:", e));
    }
    next();
  });
}

async function persistRun(run) {
  await applyCancelToRun(run, cloud.cache);
  runs.set(run.id, run);

  try {
    const runPath = path.join(run.runDir, "run.json");
    await fs.mkdir(run.runDir, { recursive: true });

    // Exclude large temporary file buffers/contents from the persisted JSON to save disk/temp space
    const storageRun = {
      ...run,
      input: {
        ...run.input,
        tcFileBuffer: undefined
      }
    };
    await fs.writeFile(runPath, JSON.stringify(storageRun, null, 2), "utf8");
  } catch (e) {
    console.error(`Failed to write run.json for ${run.id}:`, e.message);
  }

  if (dbEnabled && dbPool) {
    try {
      await dbHelpers.upsertRun(dbPool, run);
    } catch (e) {
      console.error(`Failed to persist run ${run.id} to Postgres:`, e.message);
    }
  }

  try {
    const json = await fs.readFile(path.join(run.runDir, "run.json"));
    await cloud.objectStore.put(`runs/${run.id}/run.json`, json, { contentType: "application/json" });
  } catch (e) {
    if (e.code !== "ENOENT") {
      console.error(`Failed to persist run ${run.id} to object store:`, e.message);
    }
  }

  await publishRunState(run);
}

async function publishRunState(run) {
  if (!run || !run.id) return;
  const snapshot = {
    runId: run.id,
    status: run.status,
    stages: run.stages,
    updatedAt: run.updatedAt
  };
  try {
    await cloud.cache.set(`state.${run.id}`, snapshot, 86400);
    await cloud.cache.publish(`state.${run.id}`, snapshot);
  } catch (e) {
    console.error(`Failed to publish run state ${run.id}:`, e.message);
  }
}

async function enqueueRun(runId, options = {}) {
  await cloud.queue.publish(RUNS_REQUESTED, {
    runId,
    requestedAt: new Date().toISOString(),
    rerunFailedOnly: Boolean(options.rerunFailedOnly)
  });
}

function toRunShape(row) {
  const input = row.input_json || {};
  return {
    id: row.id,
    tenantId: row.tenant_id || input.tenantId || auth.LOCAL_TENANT,
    runDir: path.join(artifactsRoot, row.id),
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    input,
    status: row.status,
    stages: row.stages_json,
    artifacts: {
      requirements: row.requirements_json,
      manualTestCases: row.manual_tc_json,
      automationBundle: row.automation_bundle_json,
      executionReport: row.execution_report_json,
      managerReport: row.manager_report_json,
      deliveryReport: row.delivery_report_json || null,
      recording: input.recording || null,
      cmsSignalReport: row.cms_signal_json || null
    },
    picture: buildArchitecturePictureSvg()
  };
}

async function loadRunForRequest(req, res) {
  const run = await getRun(req.params.id);
  if (!run || !auth.canAccessRun(req.auth, run)) {
    res.status(404).json({ error: "Run not found" });
    return null;
  }
  return run;
}

async function getRun(id) {
  if (dbEnabled && dbPool) {
    try {
      const row = await dbHelpers.getRunById(dbPool, id);
      if (row) {
        const run = await mergeOptionalArtifactsFromFile(toRunShape(row), artifactsRoot);
        runs.set(id, run);
        return run;
      }
    } catch (e) {
      console.error(`Postgres getRun failed for ${id}:`, e.message);
    }
  }

  try {
    const runPath = path.join(artifactsRoot, id, "run.json");
    const data = await fs.readFile(runPath, "utf8");
    const run = JSON.parse(data);

    // Dynamic patch of runDir in case of absolute path mapping changes across deployment environments
    run.runDir = path.join(artifactsRoot, id);

    runs.set(id, run);
    return run;
  } catch (e) {
    return runs.get(id) || null;
  }
}

function createRun(input) {
  const id = `${Date.now()}-${Math.floor(Math.random() * 100000)}`;
  const now = new Date().toISOString();

  // Check if we need Web Analyzer (no test document provided)
  const needsWebAnalyzer = !input.tcFileBuffer && !input.tcFileContent && (!input.notes || input.notes.trim().length < 50);

  // Base stages - conditionally include web analyzer
  const stages = {};
  
  if (needsWebAnalyzer) {
    stages.webAnalyzer = { label: "Web Analyzer Agent", status: "pending", startedAt: null, finishedAt: null };
  }

  stages.ba = { label: "BA Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.manualQa = { label: "Manual QA Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.automationQa = { label: "Automation QA Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.execution = { label: "Execution Service", status: "pending", startedAt: null, finishedAt: null };

  // Optional agents - only add if enabled in input
  if (input.enableAccessibility) {
    stages.accessibility = { label: "Accessibility Agent", status: "pending", startedAt: null, finishedAt: null };
  }
  if (input.enablePerformance) {
    stages.performance = { label: "Performance Agent", status: "pending", startedAt: null, finishedAt: null };
  }
  if (input.enableSecurity) {
    stages.security = { label: "Security Agent", status: "pending", startedAt: null, finishedAt: null };
  }

  // Final stages - always included
  stages.manager = { label: "Manager Agent", status: "pending", startedAt: null, finishedAt: null };
  stages.delivery = { label: "Delivery Manager Agent", status: "pending", startedAt: null, finishedAt: null };

  const artifacts = {
    webAnalysis: null,
    requirements: null,
    manualTestCases: null,
    automationBundle: null,
    executionReport: null,
    managerReport: null,
    deliveryReport: null
  };

  // Add optional artifact slots if enabled
  if (input.enableAccessibility) {
    artifacts.accessibilityReport = null;
  }
  if (input.enablePerformance) {
    artifacts.performanceReport = null;
  }
  if (input.enableSecurity) {
    artifacts.securityReport = null;
  }

  const run = {
    id,
    tenantId: input.tenantId || auth.LOCAL_TENANT,
    runDir: path.join(artifactsRoot, id),
    createdAt: now,
    updatedAt: now,
    input,
    status: "queued",
    stages,
    artifacts,
    picture: buildArchitecturePictureSvg()
  };
  runs.set(id, run);
  return run;
}
const routeCtx = {
  get dbEnabled() { return dbEnabled; },
  get dbPool() { return dbPool; },
  get recordingIdCounter() { return recordingIdCounter; },
  set recordingIdCounter(v) { recordingIdCounter = v; },
  runs,
  recordingSessions,
  recordingsById,
  endedSessionToRecordingId,
  memoryProviderKeys,
  memoryAgentSettings,
  artifactsRoot,
  PORT,
  upload,
  auth,
  cloud,
  cloudHttp,
  dbHelpers,
  encryption,
  elementLogger,
  apiKeyManager,
  logger,
  rateLimiters,
  cacheMiddleware,
  requestExecution,
  persistRun,
  enqueueRun,
  loadRunForRequest,
  createRun,
  setRunSecret,
  maskLogin,
  toRunShape
};

registerRecordingRoutes(app, routeCtx);
registerRunsRoutes(app, routeCtx);
registerLocatorRoutes(app, routeCtx);
registerSettingsRoutes(app, routeCtx);
registerCmsRoutes(app, routeCtx);
registerKeyRoutes(app, routeCtx);
registerHealthRoutes(app, routeCtx);

// Error logging middleware
app.use(logger.errorLogger);

// Global error handler
app.use((err, req, res, _next) => {
  logger.error("Unhandled error", { 
    error: err.message, 
    stack: err.stack,
    requestId: req.requestId 
  });
  
  res.status(err.status || 500).json({
    error: err.message || "Internal server error",
    requestId: req.requestId
  });
});

function tryListen(port) {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, () => {
      resolve(server);
    });
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") reject(err);
      else reject(err);
    });
  });
}

// Local/Dedicated environments: start server listener
if (!process.env.VERCEL) {
  fs.mkdir(artifactsRoot, { recursive: true })
    .then(async () => {
      auth.assertProductionSecrets();
      await initDatabase();
      if (dbEnabled) {
        console.log("Postgres persistence enabled");
      } else if (databaseConfigured()) {
        console.log("Postgres configured but unavailable; using memory/file persistence");
      } else {
        console.log("Postgres not configured. Running with memory/file persistence");
      }

      let server = null;
      let port = PORT;
      for (let attempt = 0; attempt <= 5; attempt++) {
        try {
          server = await tryListen(port);
          const webHint = process.env.ZERO_WEB_URL || "http://localhost:3000";
          console.log(`ZER0 API listening on http://localhost:${port} (UI: ${webHint})`);
          break;
        } catch (err) {
          if (err.code === "EADDRINUSE" && attempt < 5) {
            port = PORT + attempt + 1;
            console.warn(`Port ${port - 1} in use, trying ${port}...`);
          } else {
            console.error("Startup failed:", err.code === "EADDRINUSE" ? `Port ${port} in use. Stop the other process or set PORT=3002` : err.message);
            process.exit(1);
          }
        }
      }
    }).catch((error) => {
      console.error("Unable to initialize artifacts directory", error);
      process.exit(1);
    });
}

function buildArchitecturePictureSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="640" viewBox="0 0 1400 640" role="img" aria-label="ZER0 pipeline flow">
  <defs>
    <style>
      .title { font: 700 22px 'IBM Plex Mono', ui-monospace, monospace; fill: #e8eef9; }
      .lane { font: 600 11px 'IBM Plex Mono', ui-monospace, monospace; fill: #8b9bb8; letter-spacing: 2px; }
      .label { font: 600 14px 'IBM Plex Mono', ui-monospace, monospace; fill: #e8eef9; }
      .small { font: 500 11px 'IBM Plex Mono', ui-monospace, monospace; fill: #8b9bb8; }
      .box { fill: #121c2e; stroke: #3dd6c6; stroke-width: 1.5; rx: 10; }
      .box-opt { fill: #121c2e; stroke: #3a4d6e; stroke-width: 1.5; stroke-dasharray: 5 4; rx: 10; }
      .line { stroke: #3a4d6e; stroke-width: 2; marker-end: url(#arrow); fill: none; }
    </style>
    <marker id="arrow" markerWidth="8" markerHeight="7" refX="7" refY="3.5" orient="auto">
      <polygon points="0 0, 8 3.5, 0 7" fill="#3a4d6e"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="1400" height="640" fill="#0b1220"/>
  <text x="40" y="42" class="title">ZER0 pipeline</text>

  <text x="40" y="78" class="lane">INTAKE</text>
  <rect class="box" x="40" y="90" width="180" height="70"/>
  <text x="58" y="118" class="label">React SPA</text>
  <text x="58" y="138" class="small">web/</text>
  <line class="line" x1="220" y1="125" x2="260" y2="125"/>
  <rect class="box" x="260" y="90" width="200" height="70"/>
  <text x="278" y="118" class="label">@zero/api</text>
  <text x="278" y="138" class="small">POST /runs</text>
  <line class="line" x1="460" y1="125" x2="500" y2="125"/>
  <rect class="box" x="500" y="90" width="220" height="70"/>
  <text x="518" y="118" class="label">Queue</text>
  <text x="518" y="138" class="small">runs.requested</text>

  <text x="40" y="198" class="lane">ORCHESTRATOR</text>
  <rect class="box-opt" x="40" y="210" width="180" height="70"/>
  <text x="52" y="238" class="label">Web Analyzer</text>
  <text x="52" y="258" class="small">optional crawl</text>
  <line class="line" x1="220" y1="245" x2="250" y2="245"/>
  <rect class="box-opt" x="250" y="210" width="170" height="70"/>
  <text x="262" y="238" class="label">Domain infer</text>
  <text x="262" y="258" class="small">if low confidence</text>
  <line class="line" x1="420" y1="245" x2="450" y2="245"/>
  <rect class="box" x="450" y="210" width="140" height="70"/>
  <text x="478" y="238" class="label">BA</text>
  <text x="462" y="258" class="small">requirements</text>
  <line class="line" x1="590" y1="245" x2="620" y2="245"/>
  <rect class="box" x="620" y="210" width="160" height="70"/>
  <text x="638" y="238" class="label">Manual QA</text>
  <text x="638" y="258" class="small">test cases</text>
  <line class="line" x1="780" y1="245" x2="810" y2="245"/>
  <rect class="box" x="810" y="210" width="180" height="70"/>
  <text x="828" y="238" class="label">Automation</text>
  <text x="828" y="258" class="small">locators + scripts</text>

  <text x="40" y="318" class="lane">EXECUTOR</text>
  <rect class="box" x="40" y="330" width="220" height="70"/>
  <text x="58" y="358" class="label">Playwright</text>
  <text x="58" y="378" class="small">@zero/executor</text>
  <line class="line" x1="260" y1="365" x2="300" y2="365"/>
  <rect class="box-opt" x="300" y="330" width="140" height="70"/>
  <text x="330" y="358" class="label">A11y</text>
  <text x="318" y="378" class="small">optional</text>
  <line class="line" x1="440" y1="365" x2="480" y2="365"/>
  <rect class="box-opt" x="480" y="330" width="140" height="70"/>
  <text x="512" y="358" class="label">Perf</text>
  <text x="498" y="378" class="small">optional</text>
  <line class="line" x1="620" y1="365" x2="660" y2="365"/>
  <rect class="box-opt" x="660" y="330" width="150" height="70"/>
  <text x="682" y="358" class="label">Security</text>
  <text x="678" y="378" class="small">optional</text>

  <text x="40" y="438" class="lane">REPORTS</text>
  <rect class="box" x="40" y="450" width="200" height="70"/>
  <text x="58" y="478" class="label">Manager</text>
  <text x="58" y="498" class="small">executive review</text>
  <line class="line" x1="240" y1="485" x2="280" y2="485"/>
  <rect class="box" x="280" y="450" width="200" height="70"/>
  <text x="298" y="478" class="label">Delivery</text>
  <text x="298" y="498" class="small">stakeholder pack</text>
  <line class="line" x1="480" y1="485" x2="520" y2="485"/>
  <rect class="box" x="520" y="450" width="520" height="70"/>
  <text x="538" y="478" class="label">Artifacts</text>
  <text x="538" y="498" class="small">run.json · screenshots · Postgres when DATABASE_URL set</text>
</svg>`;
}

// Diagnostic handler to convert unhandled service-level crash stacktraces into friendly UI JSON responses
app.use((err, req, res, next) => {
  console.error("UNHANDLED API ERROR CAPTURED:", err);
  res.status(500).json({
    error: "API execution trace collapsed",
    message: err.message || "Unknown fault",
    diagnostic: err.stack ? err.stack.split("\n")[0] : "Unavailable"
  });
});

module.exports = app;
module.exports.enqueueRun = enqueueRun;
