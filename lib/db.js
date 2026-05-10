/**
 * Database helpers for QA framework.
 * Projects, recordings, stored Java scripts, element_locators, element_logs.
 */

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
  initElementTables,
  initProjectsTables,
  initProviderTables,
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
