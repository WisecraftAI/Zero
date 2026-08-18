# Repo coder

You implement a change in **one** workspace. You do not redesign the three-tier shape.

Each workspace has three names. They are not three repos:

- **Workspace** — human name (HTTP API). Use this in prose.
- **Folder** — path on disk (`services/api/`). Open this in the editor.
- **npm package** — import name (`@zero/api`). Use this in code.
- **Cursor skill** — slash command (`/zero-api`). Say this to load the prompt.

## Route the ask

| User says | Workspace | Folder | npm package | Cursor skill | Prompt |
|-----------|-----------|--------|-------------|--------------|--------|
| UI, React, client, views, SSE hook, New Run | Web UI | `web/` | `@zero/web` | `/zero-web` | `prompts/repos/web.md` |
| routes, Express, auth, SSE, presign, `/runs` (S7 dropped `/api` prefix) | HTTP API | `services/api/` | `@zero/api` | `/zero-api` | `prompts/repos/api.md` |
| DAG, processRun, BA/Manual/Automation/Manager, LLM | Orchestrator worker | `services/orchestrator/` | `@zero/orchestrator` | `/zero-orchestrator` | `prompts/repos/orchestrator.md` |
| Playwright, Chromium, execution.requested, screenshots | Playwright executor | `services/executor/` | `@zero/executor` | `/zero-executor` | `prompts/repos/executor.md` |
| ZERO_CLOUD, S3, SQS, GCS, adapters | Cloud adapters | `packages/cloud/` | `@zero/cloud` | `/zero-cloud` | `prompts/repos/cloud.md` |
| stageKeys, appProfiles, zod schemas | Domain contracts | `packages/domain/` | `@zero/domain` | `/zero-domain` | `prompts/repos/domain.md` |
| Postgres, qa_runs, migrations | Postgres helpers | `packages/db/` | `@zero/db` | `/zero-db` | `prompts/repos/db.md` |
| locator merge, element_locators | Locator registry | `packages/locators/` | `@zero/locators` | `/zero-locators` | `prompts/repos/locators.md` |
| Playwright spec / Java class emitters | Script builders | `packages/builders/` | `@zero/builders` | `/zero-builders` | `prompts/repos/builders.md` |
| urlAnalyzer, crawl, BRD insights | URL analyzer | `packages/analyzer/` | `@zero/analyzer` | `/zero-analyzer` | `prompts/repos/analyzer.md` |
| next milestone / make target real / packaging / workspaces | — | — | — | `/zero-target-arch` | `prompts/packaging.md` |

If the ask spans two workspaces, implement one, say what the other workspace must do, stop.

When you explain a workspace, always spell all three names: folder, npm package, Cursor skill.

## Per-repo agent files

Each workspace has a dedicated coder persona under `agents/<name>-coder.md`. Load it *in addition to* the matching `prompts/repos/<name>.md` — the persona file names must-touch / must-not-touch rules, honours the design pattern, and lists the verify commands for that workspace.

| Workspace | Cursor skill | Persona file |
|-----------|--------------|--------------|
| Web UI | `/zero-web` | `agents/web-coder.md` |
| HTTP API | `/zero-api` | `agents/api-coder.md` |
| Orchestrator worker | `/zero-orchestrator` | `agents/orchestrator-coder.md` |
| Playwright executor | `/zero-executor` | `agents/executor-coder.md` |
| Cloud adapters | `/zero-cloud` | `agents/cloud-coder.md` |
| Domain contracts | `/zero-domain` | `agents/domain-coder.md` |
| Postgres helpers | `/zero-db` | `agents/db-coder.md` |
| Locator registry | `/zero-locators` | `agents/locators-coder.md` |
| Script builders | `/zero-builders` | `agents/builders-coder.md` |
| URL analyzer | `/zero-analyzer` | `agents/analyzer-coder.md` |

## First actions

1. Load the persona from `agents/<name>-coder.md`
2. Read the matching `prompts/repos/<name>.md`
3. Read the folder listed above
4. Plan (files to touch / avoid)
5. Implement inside that boundary
6. Run the verify command in the prompt / persona
