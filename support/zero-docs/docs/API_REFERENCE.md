# ZER0 developer API reference

This reference is generated from the repository's JavaScript and JSX sources
with JSDoc. It complements the architecture and operating guides: those explain
why the system is shaped this way, while this site lets maintainers inspect the
modules, functions, classes, parameters, return values, and source locations
that implement it.

## Runtime map

ZER0 is an npm-workspace monorepo with independently deployable services and
shared `@zero/*` packages:

- `web/` — React operator console, built by Vite into `dist/web/`.
- `services/api/` — Express HTTP intake, authentication, run control, assets,
  recordings, settings, and report delivery.
- `services/orchestrator/` — queue consumer and pipeline coordinator for Web
  Analyzer, domain inference, BA, Manual QA, Automation QA, Manager, and
  Delivery stages.
- `services/executor/` — Playwright execution and CMS capture worker.
- `packages/domain/` — shared run contracts, schemas, stage keys, execution
  modes, target URL handling, and output roots.
- `packages/analyzer/` — light and pro website crawling, classification, flow
  discovery, BRD generation, and test-case generation.
- `packages/cloud/` — local, AWS, GCP, Azure, and Vercel adapters for queues,
  object storage, secrets, and cache.
- `packages/db/` — PostgreSQL schema initialization and persistence helpers.
- `packages/locators/` — selector normalization, learning, and merge policy.
- `packages/builders/` — Playwright and Java/Selenium source emitters.
- `packages/brand/` — generated server-side brand assets used by reports.

## Pipeline

The normal stage order is:

1. `webAnalyzer` when no uploaded test-case file is present.
2. Optional domain inference when classification confidence is low.
3. `ba` requirements consolidation.
4. `manualQa` test design.
5. `automationQa` locator and script preparation.
6. `execution` in the Playwright worker.
7. Optional accessibility, performance, and security checks.
8. `manager` review and `delivery` output.

The API publishes `runs.requested`; the orchestrator publishes
`execution.requested`; the executor responds with `execution.completed`.
Production code should use the public `@zero/*` package exports instead of
reaching into another workspace's internal files.

## Entry points

- API process: `services/api/server.js`
- Combined local stack: `scripts/local-stack.js`
- Orchestrator process: `services/orchestrator/worker.js`
- Executor process: `services/executor/main.js`
- Web process: `web/src/main.jsx`

Conventional entry-point names such as `index.js`, `server.js`, `worker.js`, and
`main.js` are intentionally retained: their role is established by their
directory and package metadata. Domain modules and callable symbols should use
specific nouns and verbs that describe the behavior they own.

## Generate and browse

From the repository root:

```bash
npm run docs:api
npm run docs:dev
```

Open `http://localhost:5174/api/`. The generated API site is placed under
`support/zero-docs/public/api/`, copied into the documentation build by Vite,
and excluded from Git because it is reproducible.

## Related documentation

- `support/zero-docs/docs/v1/DEVELOPER_GUIDE.md` — workstation setup and local
  development.
- `support/zero-docs/docs/v1/ARCHITECTURE.md` — current runtime architecture.
- `support/zero-docs/docs/v1/DATABASE.md` — PostgreSQL schema.
- `support/zero-docs/docs/v1/DOCKER.md` — container topology and operation.
- `AGENTS.md` — repository conventions and current product behavior.
