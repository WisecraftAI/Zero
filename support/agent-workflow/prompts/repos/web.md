# Web UI — coding prompt

**Workspace:** Web UI  
**Folder:** `web/`  
**npm package:** `@zero/web`  
**Cursor skill:** `/zero-web`

## Purpose

Presentation and form validation. Never holds business rules, never proxies artifact bytes, never sees a secret.

## Design patterns

- Container / presentational views (`src/views` vs `src/components`)
- Pathname router (`src/lib/routes.js`) — `/`, `/runs`, `/runs/new`, `/runs/:id`
- Data hooks only (`src/data/`) — no `useEffect` fetch inside presentational components
- Colocated SCSS per view; theme tokens in `web/src/styles/`
- SSE via one EventSource hook; degrade to polling after two failed reconnects

## You may change

- After S2: `web/src/**` and brand files under `web/public/` (rebuild with `npm run build`)

## You must not

- Import `playwright`, `pg`, AWS/GCP SDKs, or `@zero/cloud`
- Put login passwords in localStorage or logs
- Treat `dist/web/` as source — edit `web/src/**` / `web/public/` then `npm run build`
- Change `/runs` contracts or `stageKeys` to “make the UI nicer”

## Honour

- `POST /runs` JSON + `uploads[]` then browser `PUT` to presigned URLs (S7 dropped the `/api` prefix)
- Wire `GET /runs/:id/stream` (EventSource) — UI uses `web/src/data/useRunStream.js` with poll fallback after two failed reconnects
- PDF download should send `?theme=<data-theme id>` from the operator palette (`currentThemeId()`); optional `?paper=light` keeps dark-theme accents on white
- Keep path helpers in `web/src/lib/routes.js` in lockstep with the shell nav
- Run Detail may render `FlowDiagram` from crawl/flow artifacts; do not invent a second routing scheme
- Rebuild: `npm run build` (workspace `@zero/web`)
