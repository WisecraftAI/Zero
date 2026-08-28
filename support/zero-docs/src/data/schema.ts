/**
 * Postgres schema as created by `@zero/db` `initAllTables`.
 * Ground truth: packages/db/lib/schema/. Keep in lockstep with docs/v1/DATABASE.md.
 */

export type SchemaGroup = 'runs' | 'projects' | 'locators' | 'providers' | 'memory';

export type FkKind = 'enforced' | 'logical';

export interface SchemaColumn {
  name: string;
  type: string;
  pk?: boolean;
  notNull?: boolean;
  def?: string;
  note?: string;
}

export interface SchemaTable {
  name: string;
  group: SchemaGroup;
  init: string;
  purpose: string;
  columns: readonly SchemaColumn[];
  unique?: readonly string[];
  indexes: readonly string[];
}

export interface SchemaRelation {
  from: string;
  fromCol: string;
  to: string;
  toCol: string;
  kind: FkKind;
  note: string;
}

export const SCHEMA_ASCII = `┌──────────────┐
│   projects   │  id PK · name · base_url
└───────┬──────┘
        │  project_id is TEXT — not a REFERENCES
   ┌────┼──────────────┬─────────────────┐
   ▼    ▼              ▼                 │
┌────────────┐  ┌───────────┐    ┌───────┴─────────┐
│ stored_    │  │ recordings│    │    qa_runs      │
│ scripts    │  │           │    │ id PK · status  │
└────────────┘  └───────────┘    │ tenant_id       │
                                 │ 9× JSONB cols   │
                                 └────────┬────────┘
                    FK ON DELETE CASCADE  │  run_id TEXT — not a REFERENCES
                                 ▼        ├──────────────┐
                          ┌────────────┐  ▼              ▼
                          │ qa_assets  │ ┌───────────┐ ┌───────────┐
                          │ (only FK)  │ │ element_  │ │ element_  │
                          └────────────┘ │ locators  │ │ logs      │
                                         └───────────┘ └─────┬─────┘
                                                             │
                                                      ┌──────┴────────┐
                                                      │ agent_memory  │
                                                      │ host + tenant │
                                                      └───────────────┘

┌─────────────────┐  ┌─────────────────┐
│  provider_keys  │  │ agent_settings  │   keyed by user_email string
│ UNIQUE(email,   │  │ UNIQUE(email,   │   — no users table
│        provider)│  │        agent)   │
└─────────────────┘  └─────────────────┘`;

export const SCHEMA_RELATIONS: readonly SchemaRelation[] = [
  {
    from: 'qa_assets',
    fromCol: 'run_id',
    to: 'qa_runs',
    toCol: 'id',
    kind: 'enforced',
    note: 'ON DELETE CASCADE — the only REFERENCES in the schema',
  },
  {
    from: 'qa_runs',
    fromCol: 'project_id',
    to: 'projects',
    toCol: 'id',
    kind: 'logical',
    note: 'nullable TEXT from input.projectId',
  },
  {
    from: 'stored_scripts',
    fromCol: 'project_id',
    to: 'projects',
    toCol: 'id',
    kind: 'logical',
    note: 'NOT NULL TEXT, no FK',
  },
  {
    from: 'recordings',
    fromCol: 'project_id',
    to: 'projects',
    toCol: 'id',
    kind: 'logical',
    note: 'NOT NULL TEXT, no FK',
  },
  {
    from: 'element_locators',
    fromCol: 'run_id',
    to: 'qa_runs',
    toCol: 'id',
    kind: 'logical',
    note: 'nullable TEXT, no FK',
  },
  {
    from: 'element_logs',
    fromCol: 'run_id',
    to: 'qa_runs',
    toCol: 'id',
    kind: 'logical',
    note: 'nullable TEXT, no FK',
  },
  {
    from: 'agent_memory',
    fromCol: 'source_run_id',
    to: 'qa_runs',
    toCol: 'id',
    kind: 'logical',
    note: 'nullable TEXT, no FK — last writer run',
  },
];

export const SCHEMA_TABLES: readonly SchemaTable[] = [
  {
    name: 'qa_runs',
    group: 'runs',
    init: 'initRunsTables',
    purpose: 'Durable run row. JSONB columns hold each pipeline artifact.',
    indexes: ['idx_qa_runs_project(project_id)', 'idx_qa_runs_created(created_at DESC)', 'idx_qa_runs_tenant(tenant_id)'],
    columns: [
      { name: 'id', type: 'TEXT', pk: true },
      { name: 'project_id', type: 'TEXT', note: 'logical → projects.id' },
      { name: 'status', type: 'TEXT', notNull: true, def: "'queued'" },
      { name: 'input_json', type: 'JSONB', note: 'passwords stripped' },
      { name: 'stages_json', type: 'JSONB' },
      { name: 'requirements_json', type: 'JSONB', note: 'BA' },
      { name: 'manual_tc_json', type: 'JSONB', note: 'Manual QA' },
      { name: 'automation_bundle_json', type: 'JSONB', note: 'Playwright + Java text' },
      { name: 'execution_report_json', type: 'JSONB' },
      { name: 'manager_report_json', type: 'JSONB' },
      { name: 'delivery_report_json', type: 'JSONB' },
      { name: 'cms_signal_json', type: 'JSONB' },
      { name: 'tenant_id', type: 'TEXT', note: 'ADD COLUMN IF NOT EXISTS' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'qa_assets',
    group: 'runs',
    init: 'initRunsTables',
    purpose: 'Generated files as text. replaceAssets deletes + reinserts per run.',
    indexes: ['idx_qa_assets_run(run_id)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'run_id', type: 'TEXT', notNull: true, note: 'FK → qa_runs(id) CASCADE' },
      { name: 'asset_type', type: 'TEXT', notNull: true },
      { name: 'asset_name', type: 'TEXT', notNull: true },
      { name: 'content_text', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'projects',
    group: 'projects',
    init: 'initProjectsTables',
    purpose: 'IDE-style project. Helpers exist; no /projects routes yet.',
    indexes: [],
    columns: [
      { name: 'id', type: 'TEXT', pk: true },
      { name: 'name', type: 'TEXT', notNull: true },
      { name: 'base_url', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'stored_scripts',
    group: 'projects',
    init: 'initProjectsTables',
    purpose: 'Java/Selenium (or other) script text saved against a project.',
    indexes: ['idx_stored_scripts_project(project_id)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'project_id', type: 'TEXT', notNull: true, note: 'logical → projects.id' },
      { name: 'tc_id', type: 'TEXT', notNull: true },
      { name: 'language', type: 'TEXT', notNull: true, def: "'java'" },
      { name: 'framework', type: 'TEXT', notNull: true, def: "'selenium'" },
      { name: 'content_text', type: 'TEXT', notNull: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'recordings',
    group: 'projects',
    init: 'initProjectsTables',
    purpose: 'Recorder session JSON. In-memory Maps still shadow this table.',
    indexes: ['idx_recordings_project(project_id)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'project_id', type: 'TEXT', notNull: true, note: 'logical → projects.id' },
      { name: 'recording_json', type: 'JSONB', notNull: true },
      { name: 'analyzed_at', type: 'TIMESTAMPTZ' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'element_locators',
    group: 'locators',
    init: 'initElementTables',
    purpose: 'Learned selectors by host. Third link in profile → memory → DB merge.',
    unique: ['(host, element_key, selector_value)'],
    indexes: ['idx_element_locators_host(host)', 'idx_element_locators_host_key(host, element_key)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'host', type: 'TEXT', notNull: true },
      { name: 'element_key', type: 'TEXT', notNull: true },
      { name: 'selector_type', type: 'TEXT', notNull: true },
      { name: 'selector_value', type: 'TEXT', notNull: true },
      { name: 'xpath', type: 'TEXT' },
      { name: 'role', type: 'TEXT' },
      { name: 'label', type: 'TEXT' },
      { name: 'run_id', type: 'TEXT', note: 'logical → qa_runs.id' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'element_logs',
    group: 'locators',
    init: 'initElementTables',
    purpose: 'Raw POST /element-log snapshots (url + elements JSON).',
    indexes: ['idx_element_logs_host(host)', 'idx_element_logs_run(run_id)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'run_id', type: 'TEXT', note: 'logical → qa_runs.id' },
      { name: 'host', type: 'TEXT', notNull: true },
      { name: 'url', type: 'TEXT', notNull: true },
      { name: 'snapshot_json', type: 'JSONB', notNull: true },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'provider_keys',
    group: 'providers',
    init: 'initProviderTables',
    purpose: 'Encrypted LLM keys. List helpers never return encrypted_key.',
    unique: ['(user_email, provider)'],
    indexes: ['idx_provider_keys_user(user_email)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'user_email', type: 'TEXT', notNull: true },
      { name: 'provider', type: 'TEXT', notNull: true },
      { name: 'encrypted_key', type: 'TEXT', notNull: true },
      { name: 'last_4', type: 'TEXT' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
      { name: 'last_used_at', type: 'TIMESTAMPTZ' },
    ],
  },
  {
    name: 'agent_settings',
    group: 'providers',
    init: 'initProviderTables',
    purpose: 'Per-agent provider / model / prompt for BA, Manual, Automation, Manager.',
    unique: ['(user_email, agent)'],
    indexes: ['idx_agent_settings_user(user_email)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'user_email', type: 'TEXT', notNull: true },
      { name: 'agent', type: 'TEXT', notNull: true },
      { name: 'provider', type: 'TEXT' },
      { name: 'model', type: 'TEXT' },
      { name: 'prompt', type: 'TEXT' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
  {
    name: 'agent_memory',
    group: 'memory',
    init: 'initAgentMemoryTables',
    purpose:
      'Host-scoped agentic memory. One JSON blob per tenant+host+agent. Recalled on later runs; classification keys are not stored.',
    unique: ['(tenant_id, host, agent)'],
    indexes: ['idx_agent_memory_host(host)', 'idx_agent_memory_tenant_host(tenant_id, host)'],
    columns: [
      { name: 'id', type: 'BIGSERIAL', pk: true },
      { name: 'tenant_id', type: 'TEXT', notNull: true, def: "'local'" },
      { name: 'host', type: 'TEXT', notNull: true },
      { name: 'agent', type: 'TEXT', notNull: true, note: 'ba | manualQa | automationQa | manager | execution' },
      { name: 'memory_json', type: 'JSONB', notNull: true },
      { name: 'source_run_id', type: 'TEXT', note: 'logical → qa_runs.id' },
      { name: 'created_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
      { name: 'updated_at', type: 'TIMESTAMPTZ', notNull: true, def: 'NOW()' },
    ],
  },
];

export const SCHEMA_GROUPS: ReadonlyArray<{ id: SchemaGroup; label: string }> = [
  { id: 'runs', label: 'Runs' },
  { id: 'projects', label: 'Projects' },
  { id: 'locators', label: 'Locators' },
  { id: 'providers', label: 'LLM settings' },
  { id: 'memory', label: 'Agent memory' },
];

export const SCHEMA_ASSETS: ReadonlyArray<{ type: string; name: string; when: string }> = [
  { type: 'manual_test_cases', name: 'manual_test_cases.json', when: 'always' },
  { type: 'automation_script', name: 'generated.spec.ts', when: 'always' },
  { type: 'manager_report', name: 'manager_report.json', when: 'always' },
  { type: 'automation_script_java', name: 'generated.java', when: 'when Java text exists' },
];
