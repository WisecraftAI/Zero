-- @zero/db initial schema (forward-only). Applied by lib/schema/migrate.js.

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

CREATE TABLE IF NOT EXISTS qa_assets (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT NOT NULL REFERENCES qa_runs(id) ON DELETE CASCADE,
  asset_type TEXT NOT NULL,
  asset_name TEXT NOT NULL,
  content_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stored_scripts (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  tc_id TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'java',
  framework TEXT NOT NULL DEFAULT 'selenium',
  content_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recordings (
  id BIGSERIAL PRIMARY KEY,
  project_id TEXT NOT NULL,
  recording_json JSONB NOT NULL,
  analyzed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS element_logs (
  id BIGSERIAL PRIMARY KEY,
  run_id TEXT,
  host TEXT NOT NULL,
  url TEXT NOT NULL,
  snapshot_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE INDEX IF NOT EXISTS idx_qa_runs_project ON qa_runs(project_id);
CREATE INDEX IF NOT EXISTS idx_qa_runs_created ON qa_runs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_qa_runs_tenant ON qa_runs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qa_assets_run ON qa_assets(run_id);
CREATE INDEX IF NOT EXISTS idx_stored_scripts_project ON stored_scripts(project_id);
CREATE INDEX IF NOT EXISTS idx_recordings_project ON recordings(project_id);
CREATE INDEX IF NOT EXISTS idx_element_locators_host ON element_locators(host);
CREATE INDEX IF NOT EXISTS idx_element_locators_host_key ON element_locators(host, element_key);
CREATE INDEX IF NOT EXISTS idx_element_logs_host ON element_logs(host);
CREATE INDEX IF NOT EXISTS idx_element_logs_run ON element_logs(run_id);
CREATE INDEX IF NOT EXISTS idx_provider_keys_user ON provider_keys(user_email);
CREATE INDEX IF NOT EXISTS idx_agent_settings_user ON agent_settings(user_email);
