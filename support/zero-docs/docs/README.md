# Docs index — ZER0 · AI QA Orchestration

**ZER0 is an AI-first QA orchestration platform.** Paste any public URL (autonomous mode) or add Figma/notes/CSV (guided mode). A chain of specialized agents — Web Analyzer (multi-page crawl), optional domain inference, BA, Manual QA, Automation QA, Manager — calls OpenAI, Claude, or Gemini when you configure provider keys, runs Playwright execution (`discovered_flows` or `minimal`), and delivers requirements, test cases, scripts, and executive reports in one pass.

Markdown lead briefings live next to the interactive docs site under `support/zero-docs/`.

**Git repos in this product:** **1** (`Wisecarft/Zero`)  
**npm packages in that repo:** workspaces under `services/*`, `packages/*`, and `web/` (plus root `zero`)

| Doc | Version | Read when |
|-----|---------|-----------|
| [v1/DEVELOPER_GUIDE.md](./v1/DEVELOPER_GUIDE.md) | V1 | **New PC setup** + lead briefing for humans & AI (§2 Day-0) |
| [v1/ARCHITECTURE.md](./v1/ARCHITECTURE.md) | V1 | **Current runtime** (what ships today) |
| [v1/DATABASE.md](./v1/DATABASE.md) | V1 | **Postgres ER / schema** — tables, FKs, JSONB, indexes (`@zero/db`) |
| [v1/DOMAIN_TEST_PLANS.md](./v1/DOMAIN_TEST_PLANS.md) | V1 | **Taxonomy reference** — one test plan per domain, the sites each covers, sub-domain variants (`npm run taxonomy-doc`) |
| [v1/DOCKER.md](./v1/DOCKER.md) | V1 | **Docker / Compose** — images, ports, hybrid mode |
| [v1/DEPLOY.md](./v1/DEPLOY.md) | V1 | **Cheapest cloud demo** — per-cloud steps ([AWS](./v1/deploy/AWS.md) · [GCP](./v1/deploy/GCP.md) · [Azure](./v1/deploy/AZURE.md) · [PaaS](./v1/deploy/PAAS.md)), teardown, cost safety |
| [v1/COST.md](./v1/COST.md) | V1 | **Deployment cost** — demo tier vs production floors, LLM caps, executor sizing |
| [v1/PRODUCTION_AWS.md](./v1/PRODUCTION_AWS.md) | V1 | **Cost-optimized production on AWS** — decision doc: scale-to-zero vs single node, daily batch trigger, blockers |
| [v1/OPEN_SOURCE.md](./v1/OPEN_SOURCE.md) | V1 | MIT license + dependency inventory |
| [API_REFERENCE.md](./API_REFERENCE.md) | Live source | Generated module and symbol reference (`npm run docs:api`) |
| [v2/ARCHITECTURE.md](./v2/ARCHITECTURE.md) | V2 | **Target vision** + production gaps |
| [../README.md](../README.md) | — | How to run the React docs site (`:5174`) |
| [../../../README.md](../../../README.md) | — | How to run the product / APIs / execution modes |
| [../../../AGENTS.md](../../../AGENTS.md) | — | Agent coding contract |
| [../../ml-training/README.md](../../ml-training/README.md) | — | Optional Python quality models |

## Versions

- **V1** — shipped runtime: S7 four-image deploy (`:3000` web / `:3001` API), Q1–Q4 autonomous pipeline, U1–U3 operator console and RTK Query store, host-scoped `agent_memory`, persistence, auth, LLM, HTTP surface (`docs/v1/ARCHITECTURE.md`).
- **V2** — IDE-style target + remaining ops/product gaps (pairs with `web/public/architectureV2.html` and the Architecture tab on this site).
- **V3** — packaging / workspaces / Docker / S0–S7 + product Q1–Q4 (React sections under `src/pages/v3/` and `migration.ts`, not markdown; all tracks done).

Live HTML after `npm run build` + `npm start`: `/architecture.html` (V1), `/architectureV2.html` (V2).  
Source: `web/public/` — do not hand-edit the generated `dist/web/` copies.

Generated developer API documentation is available at `/api/` on the docs site
after running `npm run docs:api`. Its source is the checked-in JavaScript/JSX;
the generated HTML under `support/zero-docs/public/api/` is reproducible and
intentionally ignored by Git.
