# Open source inventory — ZER0

ZER0 is intended to ship as **open source under MIT** (see root `LICENSE` and `"license": "MIT"` in `package.json`).

This document lists the **one Git repository**, the packages inside it, and the **third-party open-source dependencies** humans and AI should know about when working on or redistributing the project.

---

## Repository footprint

| Item | Count | Detail |
|------|------:|--------|
| Git repositories | **1** | `https://github.com/Wisecarft/Zero.git` (`origin`) |
| npm packages in-repo | **11** | root `zero` + workspaces: `@zero/api`, `@zero/orchestrator`, `@zero/executor`, `@zero/web`, `@zero/cloud`, `@zero/db`, `@zero/domain`, `@zero/locators`, `@zero/builders`, `@zero/analyzer` |
| Optional Python area | **1** | `support/ml-training/` (Python stdlib only; not a separate Git repo) |
| Git remotes | **1** | `origin` only |

Not part of this remote: other folders under a local `Product/code/` tree (aha, canela, etc.).

---

## Project license

| File | License |
|------|---------|
| This repository | **MIT** — see [`LICENSE`](../LICENSE) |

When you contribute, you contribute under MIT unless a file says otherwise.

---

## Runtime / app dependencies

Declared across workspace `package.json` files (root + `services/*` + `packages/*`). Versions are ranges; lockfile pins installs. Typical roles:

| Package | Typical license* | Role in ZER0 |
|---------|------------------|--------------|
| [express](https://www.npmjs.com/package/express) | MIT | HTTP server (`@zero/api`) |
| [playwright](https://www.npmjs.com/package/playwright) | Apache-2.0 | Browser automation (`@zero/executor`, analyzer) |
| [pg](https://www.npmjs.com/package/pg) | MIT | Postgres client (`@zero/db`) |
| [multer](https://www.npmjs.com/package/multer) | MIT | Multipart uploads (TC / recording files) |
| [xlsx](https://www.npmjs.com/package/xlsx) | Apache-2.0 | Excel TC parsing |
| [pdfkit](https://www.npmjs.com/package/pdfkit) | MIT | PDF report download |
| [dotenv](https://www.npmjs.com/package/dotenv) | BSD-2-Clause | Env loading |
| [cors](https://www.npmjs.com/package/cors) | MIT | CORS |
| [helmet](https://www.npmjs.com/package/helmet) | MIT | Security headers |
| [compression](https://www.npmjs.com/package/compression) | MIT | Response compression |
| [express-rate-limit](https://www.npmjs.com/package/express-rate-limit) | MIT | Rate limiting |
| [express-validator](https://www.npmjs.com/package/express-validator) | MIT | Request validation helpers |
| [winston](https://www.npmjs.com/package/winston) | MIT | Logging |
| [morgan](https://www.npmjs.com/package/morgan) | MIT | HTTP access log |
| [uuid](https://www.npmjs.com/package/uuid) | MIT | IDs |
| [axios](https://www.npmjs.com/package/axios) | MIT | HTTP client |
| [node-cache](https://www.npmjs.com/package/node-cache) | MIT | Short-lived cache |
| [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken) | MIT | JWT / auth |
| [swagger-jsdoc](https://www.npmjs.com/package/swagger-jsdoc) / [swagger-ui-express](https://www.npmjs.com/package/swagger-ui-express) | MIT | `/api-docs` |
| [cloudinary](https://www.npmjs.com/package/cloudinary) | MIT | Media/cloud helper (optional integration surface) |

\*Confirm with `npm license` / package `LICENSE` files at release time; SPDX on npm can change.

Vendor cloud SDKs (AWS / GCP / etc.) live only under `@zero/cloud` (`packages/cloud/`).

### Root / workspace devDependencies

| Package | Role |
|---------|------|
| [eslint](https://www.npmjs.com/package/eslint) | Lint |
| [jest](https://www.npmjs.com/package/jest) | Test runner |
| [nodemon](https://www.npmjs.com/package/nodemon) | Dev reload for API |

---

## Web UI dependencies (`web/`)

| Package | Typical license* | Role |
|---------|------------------|------|
| [react](https://www.npmjs.com/package/react) / [react-dom](https://www.npmjs.com/package/react-dom) | MIT | SPA UI |
| [vite](https://www.npmjs.com/package/vite) | MIT | Dev server + build |
| [@vitejs/plugin-react](https://www.npmjs.com/package/@vitejs/plugin-react) | MIT | React plugin |

---

## Python (`support/ml-training/`)

`requirements.txt` states **no third-party dependencies** — Python standard library only for train/predict scripts. Safe for constrained environments; optional relative to the Node app.

---

## Browser / tooling binaries

- **Chromium** via Playwright install (`npx playwright install chromium`) — subject to Playwright/Chromium licensing; required for local execution and CMS capture.

---

## Deploy configs (not separate repos)

| File | Purpose |
|------|---------|
| `vercel.json` | Vercel build routing (note: long Playwright runs fit long-lived hosts better than serverless) |
| `docker-compose.yml` | Local / Compose stack (API, orchestrator, executor, docs, workflow, infra) |

---

## Attribution expectations

1. Keep the MIT `LICENSE` at repo root.  
2. Do not strip upstream copyright notices from vendored copies.  
3. Before a public release, run a license scan (`npx license-checker` or equivalent) and attach NOTICE if any dependency requires it.  
4. Agent skills under `.cursor/skills/` / `.agents/skills/` may carry their own upstream credits (e.g. `sf-diagram-mermaid/CREDITS.md`) — preserve those files.

---

## Quick links

- Human/AI onboarding: [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)  
- Runtime vs vision: [ARCHITECTURE.md](./ARCHITECTURE.md)  
- Operator README: [../README.md](../README.md)
