# S7 — Web image (split SPA out of the API)

Give `@zero/web` its own workspace-scoped image and its own origin. Drop the `/api` path prefix from every HTTP route so the API service owns route paths natively — no longer a folder-inside-a-monolith artifact.

Before S7 the SPA was compiled into the API image and served from `/`; the browser saw one origin and every backend route was prefixed with `/api/`. After S7 the browser talks to two origins — `http://localhost:3000` (nginx serving `dist/web/`) and `http://localhost:3001` (Express API) — and the API paths are `/runs`, `/cloud/local`, `/provider-keys`, etc.

## Depends on

S5 (orchestrator image split), S6 (cloud adapters). S7 does not touch orchestrator/executor images.

## Workspaces

| | |
|--|--|
| **Web workspace** | `web/` · `@zero/web` · `/zero-web` |
| **API workspace** | `services/api/` · `@zero/api` · `/zero-api` |

## Scope

- New `web/Dockerfile` — multi-stage Vite build → nginx static serve on `:3000`.
- New `web/nginx.conf` — SPA fallback, `/assets` immutable caching, `/health` liveness. **No `/api` proxy.**
- New `web/src/apiBase.js` — single source of truth for the API origin, injected at build via `VITE_API_BASE_URL` (defaults to `http://localhost:3001`).
- Every `fetch("/api/...")` in `web/src/**` becomes `fetch(apiUrl("/..."))`.
- Every Express route path in `services/api/` drops the `/api` prefix.
- Root `Dockerfile` — drop the `web` build stage and the `COPY --from=web` line. API image no longer carries `dist/web/`.
- `services/api/src/routes/spa.js` — deleted. `registerSpaRoutes(app)` and `express.static(publicDir)` removed from `services/api/server.js`.
- `packages/cloud/local/storage.js` — signed URLs point at `/cloud/local` instead of `/api/cloud/local`.
- `packages/cloud/http.js` — router mounted at `/cloud` at the app level (was `/api/cloud`).
- Signed URL construction uses `ZERO_PUBLIC_BASE_URL` = API origin (not web origin).
- `docker-compose.yml` — new `web` service on host `:3000`; `api` service on host `:3001` with `PORT=3001`.

## Acceptance

- [ ] `web/Dockerfile` exists and produces a runnable nginx image.
- [ ] `docker compose up --build` starts `zero-web` and `zero-api` as separate containers.
- [ ] `curl http://localhost:3000/` returns the SPA HTML.
- [ ] `curl http://localhost:3000/health` returns `ok`.
- [ ] `curl http://localhost:3001/health` returns JSON health.
- [ ] `curl http://localhost:3001/runs` returns runs list JSON (auth-permitting).
- [ ] `grep -r "/api/" services/api/src/routes/` returns nothing.
- [ ] `grep -r "fetch('/api/" web/src/` returns nothing.
- [ ] All tests in `test/` pass with the new paths.
- [ ] Presigned URLs from `ZERO_CLOUD=local` end in `/cloud/local?...`, not `/api/cloud/local?...`.
- [ ] `npm run workflow:verify -- --milestone S7` exits 0.

## Out of scope

- Renaming Cursor skills or workspace folders.
- Rewriting orchestrator/executor images.
- Building a separate Vercel deployment for the web (existing `vercel.json` becomes web-only; API on Vercel needs its own project and is left as a follow-up).
- Adding a login screen to the SPA (tracked separately under `web` workspace `partial` status).

## Ripple effects to remember

- **Breaking API URL change.** Any client (external cURL scripts, saved Postman collections, prior signed URLs) that speaks `/api/...` will 404 after S7. Signed URLs issued before the deploy but consumed after will fail — that's intrinsic to the rename.
- **CORS is now real for every browser fetch.** The existing allowlist in `services/api/auth.js` already includes `http://localhost:3000` and `credentials: true`; verify for any prod deploy.
- **`/api/health/detailed` becomes `/health/detailed`.** External uptime probes must be updated.
- **`vercel.json`** currently rewrites `"/api/(.*)" → services/api/server.js`. S7 breaks this rewrite. Either drop it (Vercel hosts web only) or add per-route rewrites; the file is left with a comment for the reader.

## Verify

```bash
docker compose up --build web api
curl -sSf http://localhost:3000/ | head -1        # SPA shell
curl -sSf http://localhost:3001/health            # API JSON
curl -sSf http://localhost:3001/runs | head       # API list
```
