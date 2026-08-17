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
const cloud = require("@zero/cloud");
const cloudHttp = require("@zero/cloud/http");
const { startOrchestrator, TOPIC: RUNS_REQUESTED, createProcessRun } = require("@zero/orchestrator");
const { setStage, hostFromUrl, createPipeline } = require("@zero/orchestrator/pipeline");
const { createApplyLlm } = require("@zero/orchestrator/applyLlm");
const {
  startExecutionWorker,
  requestExecution,
  REQUESTED: EXECUTION_REQUESTED
} = require("@zero/executor");
const encryption = require("./encryption");
const auth = require("./auth");
const elementLogger = require("@zero/locators/elementLogger");
const javaSeleniumBuilder = require("@zero/builders/javaSeleniumBuilder");
const registerRecordingRoutes = require("./src/routes/recordings");
const registerRunsRoutes = require("./src/routes/runs");
const registerLocatorRoutes = require("./src/routes/locators");
const registerSettingsRoutes = require("./src/routes/settings");
const registerCmsRoutes = require("./src/routes/cms");
const registerKeyRoutes = require("./src/routes/keys");
const registerHealthRoutes = require("./src/routes/health");
const registerSpaRoutes = require("./src/routes/spa");

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const publicDir = path.join(process.cwd(), "public");
const publicAssetsDir = path.join(publicDir, "assets");

// Security middleware
app.use(securityHeaders);
app.use(cors(corsOptions));
app.use(compression());
app.use(requestId);

// Request logging
app.use(logger.requestLogger);

// Rate limiting (apply before routes)
app.use("/api/", rateLimiters.general);
app.use("/api", auth.attachIdentity());
app.use("/api/runs", auth.requireAuthWhenEnabled());
app.use("/api/provider-keys", auth.requireAuthWhenEnabled());
app.use("/api/agent-settings", auth.requireAuthWhenEnabled());

// Swagger API documentation
if (swaggerUi) {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "ZER0 API Documentation"
  }));
  logger.info("API documentation available at /api-docs");
}

app.use(express.json({ limit: "1mb" }));
app.use("/assets", express.static(publicAssetsDir, { immutable: true, maxAge: "1y" }));
app.use(express.static(publicDir));

const artifactsRoot = process.env.VERCEL
  ? path.join("/tmp", "artifacts")
  : path.join(process.cwd(), "artifacts");

// Ensure artifactsRoot exists on Vercel
if (process.env.VERCEL) {
  const fsSync = require("fs");
  if (!fsSync.existsSync(artifactsRoot)) {
    fsSync.mkdirSync(artifactsRoot, { recursive: true });
  }
}

app.use("/api/cloud", cloudHttp.createCloudRouter());
app.use("/artifacts", (_req, res) => {
  res.status(404).json({
    error: "Artifacts are not world-readable. Use a signed URL or GET /api/runs/:id/files/:name"
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 }
});

const runs = new Map();
const memoryProviderKeys = new Map(); // composite key "userEmail:provider" -> { provider, encrypted_key, last_4, created_at, updated_at }
const memoryAgentSettings = new Map(); // composite key "userEmail:agent" -> { agent, provider, model, prompt, updated_at }

const selectorMemory = new Map();

const pipeline = createPipeline({
  selectorMemory,
  get dbPool() { return dbPool; }
});
const applyLlm = createApplyLlm({
  get dbPool() { return dbPool; },
  get dbEnabled() { return dbEnabled; },
  memoryProviderKeys,
  memoryAgentSettings
});

// In-memory recording sessions (sessionId -> { ottUrl, events[], createdAt })
const recordingSessions = new Map();
const recordingsById = new Map(); // recordingId -> { sessionId, ottUrl, events, createdAt }
const endedSessionToRecordingId = new Map(); // sessionId -> recordingId (so /record page can poll)
let recordingIdCounter = 0;

let dbPool = null;
let dbEnabled = false;
let orchestratorHandle = null;
let executionHandle = null;
let processRun = null;



function maskLogin(value) {
  if (!value) return null;
  const text = String(value);
  if (text.length <= 2) return "**";
  return `${text.slice(0, 2)}***`;
}

async function setRunSecret(runId, secret) {
  if (!secret || (!secret.username && !secret.password)) {
    runSecrets.delete(runId);
    return;
  }
  runSecrets.set(runId, secret);
  try {
    await cloud.cache.set(`runSecret.${runId}`, secret, 7200);
  } catch {
    // executor reads this when Chromium is in another process
  }
}

function getRunSecret(runId) {
  return runSecrets.get(runId) || { username: "", password: "" };
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
    ensureOrchestrator();
    if (process.env.API_ONLY !== "1" && process.env.SKIP_EXECUTION_WORKER !== "1") ensureExecutionWorker();
    next();
  });
}

async function persistRun(run) {
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

async function enqueueRun(runId) {
  await cloud.queue.publish(RUNS_REQUESTED, {
    runId,
    requestedAt: new Date().toISOString()
  });
}

function ensureOrchestrator() {
  if (orchestratorHandle) return orchestratorHandle;
  orchestratorHandle = startOrchestrator({
    queue: cloud.queue,
    cache: cloud.cache,
    processRun,
    maxConcurrent: Number(process.env.ZERO_ORCH_CONCURRENCY || 2)
  });
  return orchestratorHandle;
}

let playwrightJobs = null;
function getPlaywrightJobs() {
  if (!playwrightJobs) {
    const { createJobs } = require("@zero/executor/jobs");
    const urlAnalyzerPro = require("@zero/analyzer/urlAnalyzerPro");
    playwrightJobs = createJobs({
      cloud,
      selectorMemory,
      getRunSecret,
      urlAnalyzerPro,
      dbHelpers,
      hostFromUrl,
      get dbPool() {
        return dbPool;
      }
    });
  }
  return playwrightJobs;
}

async function runExecutionJob(job) {
  const kind = job.kind || "execution";
  if (kind === "cms-screenshot" || kind === "cms-bulk") {
    const cms = require("@zero/executor/cmsCapture");
    const deps = { cloud, artifactsRoot };
    return kind === "cms-bulk"
      ? cms.captureCmsSignalBulk(job, deps)
      : cms.captureCmsScreenshot(job, deps);
  }
  const run = await getRun(job.runId);
  if (!run) throw new Error(`Run not found: ${job.runId}`);
  const jobs = getPlaywrightJobs();
  let result;
  if (kind === "webAnalyzer") {
    result = await jobs.generateWebAnalysis(run);
    run.artifacts.webAnalysis = result;
  } else if (kind === "accessibility") {
    result = await jobs.generateAccessibilityReport(run);
    run.artifacts.accessibilityReport = result;
  } else if (kind === "performance") {
    result = await jobs.generatePerformanceReport(run);
    run.artifacts.performanceReport = result;
  } else if (kind === "security") {
    result = await jobs.generateSecurityReport(run);
    run.artifacts.securityReport = result;
  } else {
    result = await jobs.generateExecutionReport(run, Boolean(job.rerunFailedOnly));
    run.artifacts.executionReport = result;
  }
  await persistRun(run);
  return result;
}

function ensureExecutionWorker() {
  if (executionHandle) return executionHandle;
  executionHandle = startExecutionWorker({
    queue: cloud.queue,
    runJob: runExecutionJob,
    maxConcurrent: Number(process.env.ZERO_EXEC_CONCURRENCY || 2),
    maxAttempts: Number(process.env.ZERO_EXEC_ATTEMPTS || 2)
  });
  return executionHandle;
}

async function enqueueExecution(runId, opts = false) {
  const options = opts && typeof opts === "object" ? opts : { rerunFailedOnly: Boolean(opts) };
  return requestExecution(
    cloud.queue,
    {
      runId,
      rerunFailedOnly: Boolean(options.rerunFailedOnly),
      kind: options.kind || "execution"
    },
    { timeoutMs: Number(process.env.ZERO_EXEC_TIMEOUT_MS || 300000) }
  );
}

async function persistAssets(run) {
  if (!dbEnabled || !dbPool) return;
  try {
    await dbHelpers.replaceAssets(dbPool, run);
  } catch (e) {
    console.error(`Failed to persist assets for ${run.id}:`, e.message);
  }
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
  if (runs.has(id)) return runs.get(id);

  if (dbEnabled && dbPool) {
    try {
      const row = await dbHelpers.getRunById(dbPool, id);
      if (row) {
        const run = toRunShape(row);
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
    return null;
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


processRun = createProcessRun({
  getRun,
  persistRun,
  persistAssets,
  setStage,
  applyLlm,
  consolidateRequirements: pipeline.consolidateRequirements,
  generateCasesFromUploadedOnly: pipeline.generateCasesFromUploadedOnly,
  generateCasesFromManualInput: pipeline.generateCasesFromManualInput,
  generateCasesFromUrlAnalysis: pipeline.generateCasesFromUrlAnalysis,
  generateManualCases: pipeline.generateManualCases,
  generateAutomationBundle: pipeline.generateAutomationBundle,
  hostFromUrl,
  enqueueExecution,
  generateManagerReport: pipeline.generateManagerReport,
  generateDeliveryReport: pipeline.generateDeliveryReport,
  javaSeleniumBuilder,
  dbHelpers,
  get dbEnabled() { return dbEnabled; },
  get dbPool() { return dbPool; }
});

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
  enqueueExecution,
  loadRunForRequest,
  createRun,
  setRunSecret,
  maskLogin,
  toRunShape,
  setStage,
  applyLlm,
  generateManagerReport: pipeline.generateManagerReport,
  persistAssets
};

registerRecordingRoutes(app, routeCtx);
registerRunsRoutes(app, routeCtx);
registerLocatorRoutes(app, routeCtx);
registerSettingsRoutes(app, routeCtx);
registerCmsRoutes(app, routeCtx);
registerKeyRoutes(app, routeCtx);
registerHealthRoutes(app, routeCtx);

app.use("/assets", (_req, res) => {
  res.status(404).type("text/plain").send("Asset not found");
});

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

registerSpaRoutes(app);

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
    .then(() => fs.mkdir(publicDir, { recursive: true }))
    .then(() => fs.writeFile(path.join(publicDir, "record.html"), registerRecordingRoutes.RECORD_PAGE_HTML).catch(() => { }))
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

      const apiOnly = process.env.API_ONLY === "1";
      const orchOnly = process.env.ORCHESTRATOR_ONLY === "1";
      const execOnly = process.env.EXECUTION_WORKER_ONLY === "1";

      if (execOnly) {
        ensureExecutionWorker();
        console.log("Execution-worker-only mode — subscribed to execution.requested, no HTTP listen");
        return;
      }

      if (!apiOnly) ensureOrchestrator();
      if (!apiOnly && !orchOnly && process.env.SKIP_EXECUTION_WORKER !== "1") ensureExecutionWorker();

      if (orchOnly) {
        console.log("Orchestrator-only mode — subscribed to runs.requested, no HTTP listen");
        return;
      }

      if (apiOnly) {
        console.log("API-only mode — publishes runs.requested, does not subscribe to execution");
      }

      let server = null;
      let port = PORT;
      for (let attempt = 0; attempt <= 5; attempt++) {
        try {
          server = await tryListen(port);
          const uiUrl = `http://localhost:${port}`;
          console.log(`ZER0 running. Open the UI at: ${uiUrl}`);
          break;
        } catch (err) {
          if (err.code === "EADDRINUSE" && attempt < 5) {
            port = PORT + attempt + 1;
            console.warn(`Port ${port - 1} in use, trying ${port}...`);
          } else {
            console.error("Startup failed:", err.code === "EADDRINUSE" ? `Port ${port} in use. Stop the other process or set PORT=3001` : err.message);
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
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="560" viewBox="0 0 1400 560" role="img" aria-label="ZER0 Flow">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c111d"/>
      <stop offset="100%" stop-color="#121b2f"/>
    </linearGradient>
    <style>
      .title { font: 700 28px 'Segoe UI', sans-serif; fill: #d9e8ff; }
      .label { font: 600 16px 'Segoe UI', sans-serif; fill: #d8f4ff; }
      .small { font: 500 14px 'Segoe UI', sans-serif; fill: #a5c6d9; }
      .box { fill: #121b2f; stroke: #46d8d2; stroke-width: 2; rx: 14; }
      .line { stroke: #66b9ff; stroke-width: 2.5; marker-end: url(#arrow); }
    </style>
    <marker id="arrow" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">
      <polygon points="0 0, 10 4, 0 8" fill="#66b9ff"/>
    </marker>
  </defs>
  <rect x="0" y="0" width="1400" height="560" fill="url(#bg)"/>
  <text x="40" y="55" class="title">ZER0 - Architect Flow</text>
  <rect class="box" x="40" y="120" width="220" height="88"/>
  <text x="68" y="155" class="label">User Input</text>
  <text x="68" y="180" class="small">URL + Figma or TC File</text>
  <rect class="box" x="310" y="120" width="220" height="88"/>
  <text x="375" y="155" class="label">BA Agent</text>
  <text x="338" y="180" class="small">Channel Requirements</text>
  <rect class="box" x="580" y="120" width="220" height="88"/>
  <text x="623" y="155" class="label">Manual QA</text>
  <text x="602" y="180" class="small">App-specific TC</text>
  <rect class="box" x="850" y="120" width="230" height="88"/>
  <text x="883" y="155" class="label">Automation QA</text>
  <text x="865" y="180" class="small">Adaptive Locators</text>
  <rect class="box" x="1130" y="120" width="230" height="88"/>
  <text x="1170" y="155" class="label">Execution</text>
  <text x="1145" y="180" class="small">Playwright + Retries</text>
  <rect class="box" x="580" y="290" width="240" height="100"/>
  <text x="618" y="332" class="label">Manager Review</text>
  <text x="620" y="357" class="small">Architect Report</text>
  <line class="line" x1="260" y1="164" x2="310" y2="164"/>
  <line class="line" x1="530" y1="164" x2="580" y2="164"/>
  <line class="line" x1="800" y1="164" x2="850" y2="164"/>
  <line class="line" x1="1080" y1="164" x2="1130" y2="164"/>
  <line class="line" x1="1245" y1="208" x2="820" y2="290"/>
  <rect class="box" x="40" y="430" width="1320" height="90"/>
  <text x="66" y="468" class="label">Artifacts</text>
  <text x="66" y="496" class="small">requirements + manual_tc + automation_bundle + execution + manager_report</text>
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
module.exports.processRun = processRun;
module.exports.enqueueRun = enqueueRun;
module.exports.enqueueExecution = enqueueExecution;
module.exports.ensureOrchestrator = ensureOrchestrator;
module.exports.ensureExecutionWorker = ensureExecutionWorker;
