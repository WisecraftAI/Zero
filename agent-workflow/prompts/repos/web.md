# Web UI — coding prompt

**Workspace:** Web UI  
**Folder:** `web/`  
**npm package:** `@zero/web`  
**Cursor skill:** `/zero-web`

## Purpose

Presentation and form validation. Never holds business rules, never proxies artifact bytes, never sees a secret.

## Design patterns

- Container / presentational views (`src/views` vs `src/components`)
- Data hooks only (`src/data/` in V3) — no `useEffect` fetch inside presentational components
- Colocated CSS / SCSS per view
- SSE via one EventSource hook; degrade to polling after two failed reconnects

## You may change

- After S2: `web/src/**` only (rebuild with `npm run build`)

## You must not

- Import `playwright`, `pg`, AWS/GCP SDKs, or `@zero/cloud`
- Put login passwords in localStorage or logs
- Treat `public/` as source (rebuild with `npm run build`)

## Honour

- `POST /api/runs` JSON + `uploads[]` then browser `PUT` to presigned URLs
- Wire `GET /api/runs/:id/stream` (EventSource) — today the UI still polls
- Rebuild: `npm run build` (workspace `@zero/web`)
