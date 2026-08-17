/**
 * Database helpers for QA framework.
 * Runs/assets, projects, recordings, stored scripts, element_locators, element_logs.
 */

function isDatabaseConfigured(env = process.env) {
  return Boolean(env.DATABASE_URL || env.PGHOST);
}

const TABLE_QA_RUNS = `
  CREATE TABLE IF NOT EXISTS qa_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    status TEXT NOT NULL DEFAULT 'queued',
    input_json JSONB,
    stages_json JSONB,
    requirements_json JSONB,
    manual_tc_json JSONB,
    automation_bundle_json JSONB,
    execution_report_json JSONB,
    manager_report_json JSONB,
    delivery_report_json JSONB,
    cms_signal_json JSONB,
    tenant_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const TABLE_QA_ASSETS = `
  CREATE TABLE IF NOT EXISTS qa_assets (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES qa_runs(id) ON DELETE CASCADE,
    asset_type TEXT NOT NULL,
    asset_name TEXT NOT NULL,
    content_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const TABLE_PROJECTS = `
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    base_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const TABLE_STORED_SCRIPTS = `
  CREATE TABLE IF NOT EXISTS stored_scripts (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    tc_id TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'java',
    framework TEXT NOT NULL DEFAULT 'selenium',
    content_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const TABLE_RECORDINGS = `
  CREATE TABLE IF NOT EXISTS recordings (
    id BIGSERIAL PRIMARY KEY,
    project_id TEXT NOT NULL,
    recording_json JSONB NOT NULL,
    analyzed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const TABLE_ELEMENT_LOCATORS = `
  CREATE TABLE IF NOT EXISTS element_locators (
    id BIGSERIAL PRIMARY KEY,
    host TEXT NOT NULL,
    element_key TEXT NOT NULL,
    selector_type TEXT NOT NULL,
    selector_value TEXT NOT NULL,
    xpath TEXT,
    role TEXT,
    label TEXT,
    run_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(host, element_key, selector_value)
  );
`;

const TABLE_ELEMENT_LOGS = `
  CREATE TABLE IF NOT EXISTS element_logs (
    id BIGSERIAL PRIMARY KEY,
    run_id TEXT,
    host TEXT NOT NULL,
    url TEXT NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const TABLE_PROVIDER_KEYS = `
  CREATE TABLE IF NOT EXISTS provider_keys (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    provider TEXT NOT NULL,
    encrypted_key TEXT NOT NULL,
    last_4 TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ,
    UNIQUE(user_email, provider)
  );
`;

const TABLE_AGENT_SETTINGS = `
  CREATE TABLE IF NOT EXISTS agent_settings (
    id BIGSERIAL PRIMARY KEY,
    user_email TEXT NOT NULL,
    agent TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    prompt TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(user_email, agent)
  );
`;

async function initProjectsTables(pool) {
  await pool.query(TABLE_PROJECTS);
  await pool.query(TABLE_STORED_SCRIPTS);
  await pool.query(TABLE_RECORDINGS);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_stored_scripts_project ON stored_scripts(project_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_recordings_project ON recordings(project_id)");
}

async function initRunsTables(pool) {
  await pool.query(TABLE_QA_RUNS);
  await pool.query(TABLE_QA_ASSETS);
  await pool.query("ALTER TABLE qa_runs ADD COLUMN IF NOT EXISTS tenant_id TEXT");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_qa_runs_project ON qa_runs(project_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_qa_runs_created ON qa_runs(created_at DESC)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_qa_runs_tenant ON qa_runs(tenant_id)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_qa_assets_run ON qa_assets(run_id)");
}

/** Full schema init — call once at startup when a pool is available. */
async function initAllTables(pool) {
  await initRunsTables(pool);
  await initElementTables(pool);
  await initProjectsTables(pool);
  await initProviderTables(pool);
}

function sanitizeRunInput(input) {
  const clean = { ...(input || {}) };
  delete clean.tcFileBuffer;
  delete clean.loginPassword;
  delete clean.password;
  if (clean.tcFileContent) clean.tcFileContent = "[stored-in-artifacts]";
  if (clean.login && typeof clean.login === "object") {
    const { password: _pw, ...loginSafe } = clean.login;
    clean.login = loginSafe;
  }
  return clean;
}

async function upsertRun(pool, run) {
  const a = run.artifacts || {};
  const input = sanitizeRunInput(run.input);

  await pool.query(
    `INSERT INTO qa_runs (
       id, project_id, status, input_json, stages_json, requirements_json,
       manual_tc_json, automation_bundle_json, execution_report_json,
       manager_report_json, delivery_report_json, cms_signal_json,
       created_at, updated_at, tenant_id
     ) VALUES (
       $1,$2,$3,$4::jsonb,$5::jsonb,$6::jsonb,$7::jsonb,$8::jsonb,$9::jsonb,
       $10::jsonb,$11::jsonb,$12::jsonb,$13::timestamptz,$14::timestamptz,$15
     )
     ON CONFLICT (id) DO UPDATE SET
       project_id = EXCLUDED.project_id,
       status = EXCLUDED.status,
       input_json = EXCLUDED.input_json,
       stages_json = EXCLUDED.stages_json,
       requirements_json = EXCLUDED.requirements_json,
       manual_tc_json = EXCLUDED.manual_tc_json,
       automation_bundle_json = EXCLUDED.automation_bundle_json,
       execution_report_json = EXCLUDED.execution_report_json,
       manager_report_json = EXCLUDED.manager_report_json,
       delivery_report_json = EXCLUDED.delivery_report_json,
       cms_signal_json = EXCLUDED.cms_signal_json,
       tenant_id = EXCLUDED.tenant_id,
       updated_at = EXCLUDED.updated_at`,
    [
      run.id,
      input.projectId || null,
      run.status,
      JSON.stringify(input),
      JSON.stringify(run.stages || {}),
      JSON.stringify(a.requirements ?? null),
      JSON.stringify(a.manualTestCases ?? null),
      JSON.stringify(a.automationBundle ?? null),
      JSON.stringify(a.executionReport ?? null),
      JSON.stringify(a.managerReport ?? null),
      JSON.stringify(a.deliveryReport ?? null),
      JSON.stringify(a.cmsSignalReport ?? null),
      run.createdAt || new Date().toISOString(),
      run.updatedAt || new Date().toISOString(),
      run.tenantId || input.tenantId || "local"
    ]
  );
}

async function getRunById(pool, id) {
  const r = await pool.query("SELECT * FROM qa_runs WHERE id = $1", [id]);
  return r.rows[0] || null;
}

async function listRunRows(pool, limit = 50, tenantId = null) {
  if (tenantId) {
    const r = await pool.query(
      `SELECT * FROM qa_runs
        WHERE tenant_id = $2 OR (tenant_id IS NULL AND $2 = 'local')
        ORDER BY created_at DESC LIMIT $1`,
      [limit, tenantId]
    );
    return r.rows;
  }
  const r = await pool.query(
    "SELECT * FROM qa_runs ORDER BY created_at DESC LIMIT $1",
    [limit]
  );
  return r.rows;
}

async function replaceAssets(pool, run) {
  if (!run.artifacts || !run.artifacts.automationBundle) return 0;

  const script = run.artifacts.automationBundle.generatedPlaywrightScript || "";
  const javaScript = run.artifacts.automationBundle.generatedSeleniumJava || "";
  const manualTc = JSON.stringify(run.artifacts.manualTestCases || {}, null, 2);
  const manager = JSON.stringify(run.artifacts.managerReport || {}, null, 2);

  await pool.query("DELETE FROM qa_assets WHERE run_id = $1", [run.id]);

  const rows = [
    ["manual_test_cases", "manual_test_cases.json", manualTc],
    ["automation_script", "generated.spec.ts", script],
    ["manager_report", "manager_report.json", manager]
  ];
  if (javaScript) {
    rows.push(["automation_script_java", "generated.java", javaScript]);
  }

  const placeholders = rows.map((_, i) => {
    const n = i * 3;
    return `($1,$${n + 2},$${n + 3},$${n + 4})`;
  });
  const params = [run.id, ...rows.flat()];

  await pool.query(
    `INSERT INTO qa_assets (run_id, asset_type, asset_name, content_text)
     VALUES ${placeholders.join(",")}`,
    params
  );
  return rows.length;
}

async function listAssetsByRunId(pool, runId) {
  const r = await pool.query(
    "SELECT asset_type, asset_name, content_text FROM qa_assets WHERE run_id = $1 ORDER BY id",
    [runId]
  );
  return r.rows;
}

async function initElementTables(pool) {
  await pool.query(TABLE_ELEMENT_LOCATORS);
  await pool.query(TABLE_ELEMENT_LOGS);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_element_locators_host ON element_locators(host)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_element_locators_host_key ON element_locators(host, element_key)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_element_logs_host ON element_logs(host)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_element_logs_run ON element_logs(run_id)");
}

async function initProviderTables(pool) {
  await pool.query(TABLE_PROVIDER_KEYS);
  await pool.query(TABLE_AGENT_SETTINGS);
  await pool.query("CREATE INDEX IF NOT EXISTS idx_provider_keys_user ON provider_keys(user_email)");
  await pool.query("CREATE INDEX IF NOT EXISTS idx_agent_settings_user ON agent_settings(user_email)");
}

async function listProviderKeys(pool, userEmail) {
  const r = await pool.query(
    `SELECT provider, last_4, created_at, updated_at, last_used_at
       FROM provider_keys
      WHERE user_email = $1
      ORDER BY provider`,
    [userEmail]
  );
  return r.rows;
}

async function upsertProviderKey(pool, { userEmail, provider, encryptedKey, last4 }) {
  await pool.query(
    `INSERT INTO provider_keys (user_email, provider, encrypted_key, last_4, created_at, updated_at)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     ON CONFLICT (user_email, provider)
     DO UPDATE SET encrypted_key = EXCLUDED.encrypted_key,
                   last_4 = EXCLUDED.last_4,
                   updated_at = NOW()`,
    [userEmail, provider, encryptedKey, last4]
  );
}

async function deleteProviderKey(pool, userEmail, provider) {
  await pool.query(
    "DELETE FROM provider_keys WHERE user_email = $1 AND provider = $2",
    [userEmail, provider]
  );
}

async function getEncryptedProviderKey(pool, userEmail, provider) {
  const r = await pool.query(
    "SELECT encrypted_key FROM provider_keys WHERE user_email = $1 AND provider = $2",
    [userEmail, provider]
  );
  return r.rows[0]?.encrypted_key || null;
}

async function listAgentSettings(pool, userEmail) {
  const r = await pool.query(
    `SELECT agent, provider, model, prompt, updated_at
       FROM agent_settings
      WHERE user_email = $1
      ORDER BY agent`,
    [userEmail]
  );
  return r.rows;
}

async function upsertAgentSettings(pool, { userEmail, agent, provider, model, prompt }) {
  await pool.query(
    `INSERT INTO agent_settings (user_email, agent, provider, model, prompt, updated_at)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (user_email, agent)
     DO UPDATE SET provider = EXCLUDED.provider,
                   model = EXCLUDED.model,
                   prompt = EXCLUDED.prompt,
                   updated_at = NOW()`,
    [userEmail, agent, provider || null, model || null, prompt || null]
  );
}

async function createProject(pool, { id, name, baseUrl }) {
  const pid = id || `proj-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  await pool.query(
    "INSERT INTO projects (id, name, base_url) VALUES ($1, $2, $3) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, base_url = EXCLUDED.base_url",
    [pid, name || "Unnamed", baseUrl || null]
  );
  return pid;
}

async function listProjects(pool) {
  const r = await pool.query("SELECT id, name, base_url, created_at FROM projects ORDER BY created_at DESC");
  return r.rows;
}

async function getProject(pool, projectId) {
  const r = await pool.query("SELECT * FROM projects WHERE id = $1", [projectId]);
  return r.rows[0] || null;
}

async function insertStoredScript(pool, { projectId, tcId, language, framework, contentText }) {
  await pool.query(
    "INSERT INTO stored_scripts (project_id, tc_id, language, framework, content_text) VALUES ($1, $2, $3, $4, $5)",
    [projectId, tcId, language || "java", framework || "selenium", contentText]
  );
}

async function getStoredScriptsByProject(pool, projectId) {
  const r = await pool.query(
    "SELECT id, tc_id, language, framework, content_text, created_at FROM stored_scripts WHERE project_id = $1 ORDER BY created_at DESC",
    [projectId]
  );
  return r.rows;
}

async function insertRecording(pool, { projectId, recordingJson }) {
  const r = await pool.query(
    "INSERT INTO recordings (project_id, recording_json) VALUES ($1, $2::jsonb) RETURNING id",
    [projectId, JSON.stringify(recordingJson)]
  );
  return r.rows[0].id;
}

async function upsertLocator(pool, { host, elementKey, selectorType, selectorValue, xpath, role, label, runId }) {
  const q = `
    INSERT INTO element_locators (host, element_key, selector_type, selector_value, xpath, role, label, run_id)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (host, element_key, selector_value)
    DO UPDATE SET xpath = COALESCE(EXCLUDED.xpath, element_locators.xpath),
                  role = COALESCE(EXCLUDED.role, element_locators.role),
                  label = COALESCE(EXCLUDED.label, element_locators.label),
                  run_id = EXCLUDED.run_id,
                  created_at = NOW()
  `;
  await pool.query(q, [
    host,
    elementKey,
    selectorType || "css",
    selectorValue,
    xpath || null,
    role || null,
    label || null,
    runId || null
  ]);
}

async function getLocatorsByHost(pool, host) {
  const result = await pool.query(
    `SELECT element_key, selector_type, selector_value, xpath, role, label
     FROM element_locators
     WHERE host = $1
     ORDER BY created_at DESC`,
    [host]
  );
  const byKey = {};
  for (const row of result.rows) {
    if (!byKey[row.element_key]) byKey[row.element_key] = [];
    byKey[row.element_key].push({
      selectorType: row.selector_type,
      selectorValue: row.selector_value,
      xpath: row.xpath,
      role: row.role,
      label: row.label
    });
  }
  return byKey;
}

async function insertElementLog(pool, { runId, host, url, snapshotJson }) {
  const result = await pool.query(
    `INSERT INTO element_logs (run_id, host, url, snapshot_json)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING id`,
    [runId || null, host, url, JSON.stringify(snapshotJson)]
  );
  return result.rows[0].id;
}

async function getElementLogsByHost(pool, host, limit = 10) {
  const result = await pool.query(
    `SELECT id, run_id, url, snapshot_json, created_at
     FROM element_logs
     WHERE host = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [host, limit]
  );
  return result.rows;
}

module.exports = {
  isDatabaseConfigured,
  sanitizeRunInput,
  initAllTables,
  initRunsTables,
  initElementTables,
  initProjectsTables,
  initProviderTables,
  upsertRun,
  getRunById,
  listRunRows,
  replaceAssets,
  listAssetsByRunId,
  upsertLocator,
  getLocatorsByHost,
  insertElementLog,
  getElementLogsByHost,
  createProject,
  listProjects,
  getProject,
  insertStoredScript,
  getStoredScriptsByProject,
  insertRecording,
  listProviderKeys,
  upsertProviderKey,
  deleteProviderKey,
  getEncryptedProviderKey,
  listAgentSettings,
  upsertAgentSettings
};
