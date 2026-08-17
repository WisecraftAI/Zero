---
name: zero-diagrams
description: >-
  Create Mermaid, ASCII, and HTML diagrams for ZER0 — pipeline flowcharts,
  sequence diagrams, component topology, locator merge, DB ER sketches, and
  run lifecycle. Use when the user asks for a diagram, flowchart, sequence,
  architecture visualization, Mermaid, or ASCII art for Zero / ai-qa-orchestrator.
  Prefer this over sf-diagram-mermaid for non-Salesforce Zero work.
---

# ZER0 Diagrams

## When this skill owns the task

Any diagram request about this repo’s QA orchestration pipeline, APIs, data model, or UI↔server flow.
For Salesforce-specific Mermaid conventions, see `sf-diagram-mermaid` instead.
For layered HTML architecture panels, see `architecture` + `zero-architecture`.

## Defaults

1. Prefer **Mermaid** in fenced ` ```mermaid ` blocks for chat and Markdown docs
2. Prefer **ASCII / preformatted** inside `public/architecture.html` (already styled)
3. Prefer **HTML layered panels** only when publishing rich arch pages (follow `architecture` skill + Zero HTML path)
4. Keep labels tied to real names: stages, files, routes, tables

## Diagram type picker

| Need | Mermaid type |
|------|----------------|
| Pipeline / control flow | `flowchart LR` or `TD` |
| Request lifecycle | `sequenceDiagram` |
| Module dependencies | `flowchart` or `C4Context`-style boxes |
| DB entities | `erDiagram` |
| Run state | `stateDiagram-v2` |

Use `flowchart` (not deprecated `graph`). Top-down for stacks; left-right for pipelines.

## Canonical Zero diagrams

### Pipeline

```mermaid
flowchart LR
  UI[React SPA] --> API[Express server.js]
  API --> BA[BA]
  BA --> MQ[Manual QA]
  MQ --> AQ[Automation QA]
  AQ --> EX[Playwright]
  EX --> MG[Manager]
  MG --> DL[Delivery]
  API --> LIB[lib/]
  LIB --> PG[(Postgres optional)]
  EX --> ART[artifacts/]
```

### Locator merge

```mermaid
flowchart TD
  P[Channel profile selectors] --> M[Merge]
  MEM[In-memory learned] --> M
  DB[Postgres element_locators] --> M
  M --> SCR[Playwright / Java scripts]
```

### Sequence (start run)

```mermaid
sequenceDiagram
  participant U as UI
  participant S as server.js
  participant PW as Playwright
  U->>S: POST /api/runs
  S->>S: BA → Manual → Automation
  S->>PW: execution checks
  PW-->>S: results + screenshots
  S->>S: Manager → Delivery
  U->>S: GET /api/runs/:id
```

## Quality bar

- Every node should map to a real path, stage, or API — no vague “backend”
- Note optional pieces (Postgres, a11y/perf stages, CMS capture) as optional
- If embedding in HTML, keep diagrams readable on mobile (short labels)
- When updating docs, sync the same diagram story across chat, `AGENTS.md`, and `architecture.html` if the user asked to publish
