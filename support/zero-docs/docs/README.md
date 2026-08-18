# Docs index — ZER0 · AI QA Orchestration

**ZER0 is an AI-first QA orchestration platform.** Paste any public URL (autonomous mode) or add Figma/notes/CSV (guided mode). A chain of specialized agents — Web Analyzer (multi-page crawl), optional domain inference, BA, Manual QA, Automation QA, Manager — calls OpenAI, Claude, or Gemini when you configure provider keys, runs Playwright execution (`discovered_flows` or `minimal`), and delivers requirements, test cases, scripts, and executive reports in one pass.

Markdown lead briefings live next to the interactive docs site under `support/zero-docs/`.

**Git repos in this product:** **1** (`Wisecarft/Zero`)  
**npm packages in that repo:** workspaces under `services/*`, `packages/*`, and `web/` (plus root `zero`)

| Doc | Version | Read when |
|-----|---------|-----------|
| [v1/DEVELOPER_GUIDE.md](./v1/DEVELOPER_GUIDE.md) | V1 | Onboarding — lead briefing for humans & AI |
| [v1/ARCHITECTURE.md](./v1/ARCHITECTURE.md) | V1 | **Current runtime** (what ships today) |
| [v1/DATABASE.md](./v1/DATABASE.md) | V1 | **Postgres ER / schema** — tables, FKs, JSONB, indexes (`@zero/db`) |
| [v1/DOCKER.md](./v1/DOCKER.md) | V1 | **Docker / Compose** — images, ports, hybrid mode |
| [v1/COST.md](./v1/COST.md) | V1 | **Deployment cost** — infra floors, LLM caps, executor sizing |
| [v1/OPEN_SOURCE.md](./v1/OPEN_SOURCE.md) | V1 | MIT license + dependency inventory |
| [v2/ARCHITECTURE.md](./v2/ARCHITECTURE.md) | V2 | **Target vision** + production gaps |
| [../README.md](../README.md) | — | How to run the React docs site (`:5174`) |
| [../../../README.md](../../../README.md) | — | How to run the product / APIs / execution modes |
| [../../../AGENTS.md](../../../AGENTS.md) | — | Agent coding contract |
| [../../ml-training/README.md](../../ml-training/README.md) | — | Optional Python quality models |

## Versions

- **V1** — shipped runtime: pipeline, persistence, auth, LLM, HTTP surface.
- **V2** — IDE-style target + prioritized gaps (pairs with `web/public/architectureV2.html` and the Architecture tab on this site).
- **V3** — packaging / workspaces / Docker / S0–S7 + product Q1–Q4 (React sections under `src/pages/v3/` and `migration.ts`, not markdown).

Live HTML after `npm run build` + `npm start`: `/architecture.html` (V1), `/architectureV2.html` (V2).  
Source: `web/public/` — do not hand-edit the generated `dist/web/` copies.
