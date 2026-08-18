# Per-repo coding prompts

One prompt per **workspace**. Each workspace has three names — they are not three repos:

| Name kind | Meaning | Example (HTTP API) |
|-----------|---------|-------------------|
| **Workspace** | Human name. Use this in prose. | HTTP API |
| **Folder** | Path on disk. Open this in the editor. | `services/api/` |
| **npm package** | Import name in code and in `package.json`. | `@zero/api` |
| **Cursor skill** | Slash command that loads this prompt. Say this to the agent. | `/zero-api` |

S2 created the folders. Edit the **folder**. Further image splits are S3–S5.

| Workspace | Folder | npm package | Cursor skill | Prompt |
|-----------|--------|-------------|--------------|--------|
| HTTP API | `services/api/` | `@zero/api` | `/zero-api` | [api.md](./api.md) |
| Orchestrator worker | `services/orchestrator/` | `@zero/orchestrator` | `/zero-orchestrator` | [orchestrator.md](./orchestrator.md) |
| Playwright executor | `services/executor/` | `@zero/executor` | `/zero-executor` | [executor.md](./executor.md) |
| Web UI | `web/` | `@zero/web` | `/zero-web` | [web.md](./web.md) |
| Cloud adapters | `packages/cloud/` | `@zero/cloud` | `/zero-cloud` | [cloud.md](./cloud.md) |
| Domain contracts | `packages/domain/` | `@zero/domain` | `/zero-domain` | [domain.md](./domain.md) |
| Postgres helpers | `packages/db/` | `@zero/db` | `/zero-db` | [db.md](./db.md) |
| Locator registry | `packages/locators/` | `@zero/locators` | `/zero-locators` | [locators.md](./locators.md) |
| Script builders | `packages/builders/` | `@zero/builders` | `/zero-builders` | [builders.md](./builders.md) |
| URL analyzer | `packages/analyzer/` | `@zero/analyzer` | `/zero-analyzer` | [analyzer.md](./analyzer.md) |

Role agents (any repo): `agents/planner.md` → `agents/implementer.md` → `agents/verifier.md`.
Router: `agents/repo-coder.md`.
