/** Mermaid charts rendered on the docs site. Keep in lockstep with runtime paths (S7: no /api prefix). */

export const SCHEMA_ER_MERMAID = `erDiagram
  projects ||--o{ qa_runs : "project_id logical"
  projects ||--o{ stored_scripts : "project_id logical"
  projects ||--o{ recordings : "project_id logical"
  qa_runs ||--|{ qa_assets : "run_id CASCADE"
  qa_runs ||--o{ element_locators : "run_id logical"
  qa_runs ||--o{ element_logs : "run_id logical"
  qa_runs ||--o{ agent_memory : "source_run_id logical"

  projects {
    text id PK
    text name
    text base_url
    timestamptz created_at
  }

  qa_runs {
    text id PK
    text project_id "logical to projects.id"
    text tenant_id
    text status "default queued"
    jsonb input_json
    jsonb stages_json
    jsonb requirements_json
    jsonb manual_tc_json
    jsonb automation_bundle_json
    jsonb execution_report_json
    jsonb manager_report_json
    jsonb delivery_report_json
    jsonb cms_signal_json
    timestamptz created_at
    timestamptz updated_at
  }

  qa_assets {
    bigserial id PK
    text run_id FK "qa_runs.id CASCADE"
    text asset_type
    text asset_name
    text content_text
    timestamptz created_at
  }

  stored_scripts {
    bigserial id PK
    text project_id "logical to projects.id"
    text tc_id
    text language "default java"
    text framework "default selenium"
    text content_text
    timestamptz created_at
  }

  recordings {
    bigserial id PK
    text project_id "logical to projects.id"
    jsonb recording_json
    timestamptz analyzed_at
    timestamptz created_at
  }

  element_locators {
    bigserial id PK
    text host
    text element_key
    text selector_type
    text selector_value
    text xpath
    text role
    text label
    text run_id "logical to qa_runs.id"
    timestamptz created_at
  }

  element_logs {
    bigserial id PK
    text run_id "logical to qa_runs.id"
    text host
    text url
    jsonb snapshot_json
    timestamptz created_at
  }

  provider_keys {
    bigserial id PK
    text user_email
    text provider
    text encrypted_key
    text last_4
    timestamptz created_at
    timestamptz updated_at
    timestamptz last_used_at
  }

  agent_settings {
    bigserial id PK
    text user_email
    text agent
    text provider
    text model
    text prompt
    timestamptz updated_at
  }

  agent_memory {
    bigserial id PK
    text tenant_id "default local"
    text host
    text agent
    jsonb memory_json
    text source_run_id "logical to qa_runs.id"
    timestamptz created_at
    timestamptz updated_at
  }`;

export const RUN_SEQUENCE_MERMAID = `sequenceDiagram
  autonumber
  actor U as UI
  participant API as "@zero/api"
  participant PG as Postgres
  participant Q as Queue
  participant O as "@zero/orchestrator"
  participant X as "@zero/executor"

  U->>API: POST /runs
  API->>PG: upsert qa_runs
  API-->>U: 202 runId + uploads[]
  U->>API: PUT files then POST /runs/:id/commit
  API->>Q: publish runs.requested
  Q->>O: consume
  O->>O: BA then Manual then Automation
  O->>Q: publish execution.requested
  Q->>X: consume
  X->>X: Playwright + screenshots
  X->>Q: execution.completed
  O->>PG: upsert JSONB artifacts + qa_assets
  O->>O: Manager then Delivery
  U->>API: GET /runs/:id/stream
  API-->>U: SSE stage ticks`;

export const WEB_START_SEQUENCE_MERMAID = `sequenceDiagram
  autonumber
  actor User
  participant NewRun as NewRunView
  participant API as "@zero/api"
  participant Store as Object store
  participant SSE as GET /runs/:id/stream

  User->>NewRun: submit
  NewRun->>API: POST /runs
  API->>API: INSERT qa_runs
  API->>Store: presignPut x N
  API-->>NewRun: 202 runId + uploads[]
  NewRun->>Store: PUT tc.csv
  NewRun->>Store: PUT recording (optional)
  NewRun->>API: POST /runs/:id/commit
  API->>API: publish runs.requested
  NewRun->>SSE: EventSource
  SSE-->>User: stage ticks`;

export const API_CREATE_SEQUENCE_MERMAID = `sequenceDiagram
  autonumber
  actor Client
  participant Handler as POST /runs
  participant DB as Postgres
  participant Store as Object store
  participant Queue as runs.requested

  Client->>Handler: POST /runs
  Handler->>Handler: auth + validate
  Handler->>DB: upsert qa_runs
  DB-->>Handler: row
  Handler->>Store: presignPut x N
  Store-->>Handler: signed URLs
  Handler-->>Client: 202 runId + uploads[]
  Note over Handler,Queue: commit path publishes after uploads
  Handler->>Queue: publish runs.requested`;

export const ORCH_SEQUENCE_MERMAID = `sequenceDiagram
  autonumber
  participant Q as runs.requested
  participant O as processRun
  participant LLM as llm facade
  participant XQ as execution.requested
  participant PG as qa_runs JSONB

  Q->>O: consume runId
  O->>PG: load run
  O->>PG: recall agent_memory for host
  opt no TC file and short notes
    O->>O: webAnalyzer crawl
  end
  O->>LLM: BA
  O->>LLM: Manual QA
  O->>LLM: Automation QA
  O->>XQ: publish execution.requested
  XQ-->>O: execution.completed
  opt a11y / perf / security
    O->>O: extra Playwright passes
  end
  O->>LLM: Manager
  O->>O: Delivery
  O->>PG: upsert stages_json + reports
  O->>PG: upsert agent_memory (no classification keys)`;

export const EXEC_BATCH_SEQUENCE_MERMAID = `sequenceDiagram
  autonumber
  participant Q as execution.requested
  participant Job as runJob
  participant Sem as semaphore
  participant Sec as secrets
  participant PW as Chromium
  participant Store as Object store

  Q->>Job: consume
  Job->>Sem: acquire slot
  Sem-->>Job: ok
  Job->>Sec: pull login secret
  Sec-->>Job: runtime password
  Job->>PW: launch browserContext
  loop each TC
    Job->>PW: play + screenshot
    Job->>Store: put artifact
  end
  Job->>Job: learned selectors upsert
  Job->>PW: close context
  Job->>Sem: release
  Job->>Q: publish execution.completed`;
