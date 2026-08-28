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

const TABLE_AGENT_MEMORY = `
  CREATE TABLE IF NOT EXISTS agent_memory (
    id BIGSERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL DEFAULT 'local',
    host TEXT NOT NULL,
    agent TEXT NOT NULL,
    memory_json JSONB NOT NULL,
    source_run_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, host, agent)
  );
`;

module.exports = {
  TABLE_QA_RUNS,
  TABLE_QA_ASSETS,
  TABLE_PROJECTS,
  TABLE_STORED_SCRIPTS,
  TABLE_RECORDINGS,
  TABLE_ELEMENT_LOCATORS,
  TABLE_ELEMENT_LOGS,
  TABLE_PROVIDER_KEYS,
  TABLE_AGENT_SETTINGS,
  TABLE_AGENT_MEMORY
};
