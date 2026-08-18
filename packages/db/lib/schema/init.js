const {
  TABLE_QA_RUNS,
  TABLE_QA_ASSETS,
  TABLE_PROJECTS,
  TABLE_STORED_SCRIPTS,
  TABLE_RECORDINGS,
  TABLE_ELEMENT_LOCATORS,
  TABLE_ELEMENT_LOGS,
  TABLE_PROVIDER_KEYS,
  TABLE_AGENT_SETTINGS
} = require("./tables");

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

async function initAllTables(pool) {
  await initRunsTables(pool);
  await initElementTables(pool);
  await initProjectsTables(pool);
  await initProviderTables(pool);
}

module.exports = {
  initAllTables,
  initRunsTables,
  initElementTables,
  initProjectsTables,
  initProviderTables
};
