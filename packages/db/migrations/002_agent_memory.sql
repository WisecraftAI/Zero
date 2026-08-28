-- Host-scoped agentic memory. One blob per (tenant, host, agent).
-- Login passwords must never be written here; callers sanitize first.

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

CREATE INDEX IF NOT EXISTS idx_agent_memory_host ON agent_memory(host);
CREATE INDEX IF NOT EXISTS idx_agent_memory_tenant_host ON agent_memory(tenant_id, host);
