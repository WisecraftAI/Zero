# ZER0 — Developer README

Day-to-day cheat sheet for working in this repo. Full onboarding (Day-0, team map, persistence, first tasks) lives in [support/zero-docs/docs/v1/DEVELOPER_GUIDE.md](./support/zero-docs/docs/v1/DEVELOPER_GUIDE.md). Product/operator overview: [README.md](./README.md). Agent contract: [AGENTS.md](./AGENTS.md).

**Stack:** Node **20.x**, npm workspaces, CommonJS on the server (`require`), ESM React in `web/` (`"type": "module"`).

---

## First-time setup

```bash
cp .env.example .env
npm install
npx playwright install chromium
```

Run each command on its **own line**. zsh with `INTERACTIVE_COMMENTS` off will treat `# comments` as arguments and break `vite build` (`Could not resolve entry module "#/index.html"`). Fix once with `setopt interactive_comments` if you want inline comments.

`.env` is enough to boot. Leave `DATABASE_URL` unset for memory + `dist/artifacts/` persistence. Never commit `.env`.

---

## How to run (pick one)

| Mode | Command | UI | Pipeline workers |
|------|---------|----|------------------|
| **Local all-in-one** (no Docker) | `npm run build` then `npm run start:all` | Vite: `npm run client` → [http://localhost:5173](http://localhost:5173) | API + orchestrator + executor in one process |
| **API only** | `npm start` | SPA will not progress runs | Intake only — runs stay queued |
| **Hybrid** | `docker compose up -d postgres redis` then `npm run start:all` | Same as local | Host app + Compose Postgres/Redis |
| **Full Compose** | `docker compose up --build` | [http://localhost:3000](http://localhost:3000) | Split images: web, API, orchestrator, executor |

Dev UI hot reload (with `start:all` already running):

```bash
npm run client
```

Fetches go to `VITE_API_BASE_URL` (default `http://localhost:3001`). Rebuild the SPA after changing that env var (`npm run build`).

### Ports

| Origin | What |
|--------|------|
| `:3000` | SPA via nginx (Compose only) |
| `:3001` | Express API (`PORT`) — no `/api` prefix |
| `:5173` | Vite dev UI (`npm run client`) |
| `:5174` | Docs site (Compose `docs` or `npm run docs:dev`) |
| `:5175` | Agent-workflow status (Compose `workflow`) |

Health: `GET http://localhost:3001/health` · `GET http://localhost:3001/health/detailed` · Swagger: [http://localhost:3001/api-docs](http://localhost:3001/api-docs)

---

## npm scripts (repo root)

| Script | Purpose |
|--------|---------|
| `npm start` | API only (`services/api/server.js`) |
| `npm run start:all` | API + orchestrator + executor (`scripts/local-stack.js`) |
| `npm run orchestrator` | Orchestrator worker only |
| `npm run execution` | Playwright executor only |
| `npm run dev` | Nodemon on the API |
| `npm run build` | Vite client → `dist/web/` |
| `npm run client` | Vite `:5173` |
| `npm test` | Jest (health smoke, one pipeline start, Postgres persist when reachable) |
| `npm run test:smoke` | Smoke file only |
| `npm run lint` | ESLint |
| `npm run set-db` | DB helper |
| `npm run workflow:status` | Current target-arch milestone |
| `npm run workflow:verify` | Verify a milestone (`-- --milestone Q5`) |

UI source is `web/src/**`. Do not hand-edit `dist/web/assets`. After UI changes, use `npm run client` or `npm run build`.

---

## Where to change code

| Goal | Path | Module |
|------|------|--------|
| UI / views / CSS | `web/src/` | `@zero/web` |
| HTTP routes, auth, SSE, presign | `services/api/src/routes/` | `@zero/api` |
| DAG, agents, LLM | `services/orchestrator/` | `@zero/orchestrator` |
| Playwright jobs | `services/executor/` | `@zero/executor` |
| Queue / object store / secrets | `packages/cloud/` | `@zero/cloud` |
| Stage keys, profiles, schemas | `packages/domain/` | `@zero/domain` |
| Postgres | `packages/db/` | `@zero/db` |
| Locator merge | `packages/locators/` | `@zero/locators` |
| Playwright / Java script text | `packages/builders/` | `@zero/builders` |
| Crawl / URL analysis | `packages/analyzer/` | `@zero/analyzer` |

Services **must not** `require` sibling `services/*`. Shared code goes through `@zero/*`.

Cursor skills: `/zero-web`, `/zero-api`, `/zero-orchestrator`, `/zero-executor`, and matching `/zero-*` package skills. Run `/init` if pro skills are missing.

---

## Pipeline (what actually runs)

Order (`stageKeys`): optional `webAnalyzer` → `ba` → `manualQa` → `automationQa` → `execution` → optional a11y/perf/security → `manager` → `delivery`.

- **Autonomous:** URL only, no TC file (notes optional) → crawl → optional domain LLM → cases → `discovered_flows`.
- **Guided:** URL + Figma / TC file / BA notes.
- **CSV default execution is `minimal`** (load URL + wait for body). `EXECUTION_MODE=full` is brittle; use for selector tuning only.
- BA / Manual / Automation / Manager use templates always; LLM enriches when a decrypted provider key exists (`ZERO_LLM=off` forces templates).

Passwords from the UI are runtime-only (`runSecrets`); do not log or persist them.

---

## Persistence

- Always: in-memory `Map` + `dist/artifacts/<runId>/run.json`.
- Postgres when `DATABASE_URL` or `PGHOST` is set **and reachable**; otherwise silent fallback to memory + files.
- Compose default: `DATABASE_URL=postgres://zero:zero@localhost:5432/zero`. If `:5432` is taken: `POSTGRES_PORT=15432 docker compose up -d postgres` and point the URL at `localhost:15432`.
- Object store: `ZERO_CLOUD=local` → `dist/artifacts/cloud-store` + signed `/cloud/local` URLs.

Schema: [support/zero-docs/docs/v1/DATABASE.md](./support/zero-docs/docs/v1/DATABASE.md). Docker: [support/zero-docs/docs/v1/DOCKER.md](./support/zero-docs/docs/v1/DOCKER.md).

---

## Verify a change

```bash
curl -s http://localhost:3001/health
npm test
```

| Change type | Extra check |
|-------------|-------------|
| UI | Exercise the flow in the browser (`:5173` or `:3000`). Rebuild if you are not on Vite. |
| API route | Hit the path on `:3001` (no `/api` prefix). Confirm auth stays off locally unless you set `ZERO_AUTH=on`. |
| Pipeline | `npm run start:all` (not `npm start`). Start a New Run and watch SSE / run detail. |
| Executor / crawl | `npx playwright install chromium`; optional headed via UI checkbox or `RUN_HEADED=true`. |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Runs never leave intake | Use `npm run start:all` or Compose — `npm start` is API-only |
| Blank UI / missing JS | `npm run build` from repo root |
| Vite `#/index.html` error | Rebuild without inline `#` comments |
| CORS from Vite | `VITE_API_BASE_URL=http://localhost:3001` then rebuild |
| Playwright missing | `npx playwright install chromium` |
| Postgres errors | Unset `DATABASE_URL` or start Compose postgres and match the URL |
| Auth 401 locally | Leave `ZERO_AUTH` unset unless you also set keys + `KEY_ENC_SECRET` |

---

## More docs

| Doc | Use |
|-----|-----|
| [DEVELOPER_GUIDE.md](./support/zero-docs/docs/v1/DEVELOPER_GUIDE.md) | New PC, Day-0, ownership, sample exercise |
| [ARCHITECTURE.md (v1)](./support/zero-docs/docs/v1/ARCHITECTURE.md) | Runtime architecture |
| [ARCHITECTURE.md (v2)](./support/zero-docs/docs/v2/ARCHITECTURE.md) | Target / production gaps |
| [support/zero-docs/docs/README.md](./support/zero-docs/docs/README.md) | Docs index |
| [support/agent-workflow/README.md](./support/agent-workflow/README.md) | Packaging + product milestones |
