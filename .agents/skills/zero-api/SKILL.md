---
name: zero-api
description: >-
  Code ZER0 HTTP intake in services/api (@zero/api): Express routes, auth,
  SSE, presign/commit, provider keys, and API keys. Use whenever the user
  asks to update the API, Express routes, /runs, SSE, auth, apiKeyManager,
  /provider-keys, /agent-settings, recordings, or @zero/api. Prefer this
  over orchestrator or executor skills when the change is HTTP — not DAG
  walk or Chromium. S7 dropped the /api prefix; paths are /runs not /api/runs.
---

# @zero/api

Stateless HTTP intake. Auth, validate, persist metadata, presign uploads, publish `runs.requested`, stream SSE. **Never launches Chromium.** Default listen `:3001`.

## When this skill owns the task

Stay inside `services/api/` for routes, middleware, and identity.

Escalate instead of stretching this service when the ask is:

- Walking `stageKeys` / LLM → `@zero/orchestrator`
- Playwright jobs → `@zero/executor`
- Queue / object store / signed `/cloud/local` internals → `@zero/cloud` (`http.js` is the router this service mounts)
- Run row DDL → `@zero/db`

Read `support/agent-workflow/prompts/repos/api.md` before editing. Treat `/api/runs` mentions in old prompts as stale — S7 owns paths natively.

## Layout

```
services/api/
  server.js                 # composition root (listen, middleware, mounts)
  auth.js                   # API keys + JWT; X-User-Email is not identity
  apiKeyManager.js          # hashed app keys for /keys (not LLM provider keys)
  encryption.js             # provider-key encrypt/decrypt
  middleware.js             # helmet, cors, rate limits, requestId
  swagger.js                # /api-docs (name, not a prefix)
  src/routes/
    runs.js                 # POST/GET /runs, commit, stream, files, download
    settings.js             # /provider-keys, /agent-settings (LLM)
    keys.js                 # /keys — product API keys
    locators.js             # /element-log, /locators
    recordings.js           # /recordings/*, /record, /recorder.js
    cms.js                  # CMS screenshot enqueue
    health.js               # /health, /health/detailed
```

## Routes (no `/api` prefix)

| Path | Role |
|------|------|
| `POST /runs` | Multipart start, or JSON with `uploads: ["tcFile"]` → presigned PUTs |
| `POST /runs/:id/commit` | After presigned uploads, publish `runs.requested` |
| `GET /runs`, `GET /runs/:id` | List / snapshot (tenant-scoped) |
| `GET /runs/:id/stream` | SSE |
| `POST /runs/:id/rerun-failed` | Re-enqueue failed execution |
| `GET /runs/:id/assets`, `/files/:name`, `/download` | Artifacts (`?format=json&url=1` for a signed URL) |
| `GET\|PUT /cloud/local` | Local signed URLs (`@zero/cloud/http`) |
| `GET\|POST\|DELETE /keys` | App API keys (`apiKeyManager`) |
| `GET\|PUT\|DELETE /provider-keys` | Encrypted LLM keys (`settings.js` + `@zero/db`) |
| `GET\|PUT /agent-settings` | Per-agent provider/model/prompt |
| `/recordings/*`, `/record`, `/recorder.js` | Recorder; CORS is an explicit origin allowlist |
| `POST /capture-cms-screenshot`, `/capture-cms-signal-bulk` | Enqueue executor CMS jobs |
| `POST /element-log`, `GET /locators` | Locator intake |
| `GET /health`, `/health/detailed`, `/api-docs` | Liveness + Swagger |

`GET /artifacts` returns 404. Use signed URLs or `/runs/:id/files/:name`.

## Auth (M5)

- Production: `ZERO_AUTH=on` (forced). Boot fails without `KEY_ENC_SECRET`.
- Identity: verified `x-api-key` (`ZERO_API_KEYS` / `ZERO_DEV_API_KEY`) or Bearer JWT. Arbitrary non-empty keys are rejected.
- **`X-User-Email` is not identity.** Do not trust it for ACL.
- Runs are tenant-scoped. `auth.attachIdentity()` then `requireAuthWhenEnabled()` on `/runs`, `/provider-keys`, `/agent-settings`.

Two persisted stores — do not mix them:

- **App keys** (`/keys` via `apiKeyManager`) — callers of *this* API.
- **LLM provider keys** (`/provider-keys` in `settings.js`) — encrypted at rest, decrypted only in the orchestrator. `PUT /provider-keys/:provider` live-probes with `apiKeyManager.testKey` (prefix check, 401/403) before encrypt/store.

## Invariants

- Do not `require("playwright")`.
- Do not import `@aws-sdk` / `@google-cloud` — `@zero/cloud` only.
- Do not serve artifact bytes as static files.
- Ask before breaking `POST /runs` or `POST /runs/:id/commit`.
- Login passwords are runtime-only (`runSecrets`); never persist them on the run row.

## How to change

1. New HTTP surface → a file under `src/routes/`, mounted from `server.js`.
2. Auth rules → `auth.js`. Rate/CORS/helmet → `middleware.js`.
3. Keep Swagger comments in sync if the public contract changes.

```bash
npm test -- test/auth.test.js test/auth.http.test.js test/orchestrator.http.test.js test/smoke.test.js test/packaging.boundaries.test.js
```
