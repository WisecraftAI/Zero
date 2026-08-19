# Autonomous any-URL QA — product north star (Q1–Q5) · **Q5 open**

User provides **URL only**. No CSV, no channel picker, no BA notes. ZERO should:

1. **Crawl** the site (multi-page, bounded) ✓ Q1
2. **Understand** domain **and sub-domain** (rules first, AI when uncertain) ✓ Q4 · ⧗ Q5
3. **Generate** major functional test cases from the resolved pair ✓ Q2 · ⧗ Q5
4. **Execute** top critical flows in Playwright ✓ Q3
5. **Report** pass/fail + manager summary ✓

Q5 closes the seam the first four left: the taxonomy is one level deep, so understanding stops at "this is an e-commerce site" and every e-commerce site gets the same tests.

## AI placement (strict)

| Stage | AI? |
|-------|-----|
| Crawl, element detection, known domain types | **No** — Playwright + rules |
| Major case generation | **No** in Q2 — templates from type + flows |
| Flow execution | **No** — deterministic Playwright |
| Low-confidence domain (`confidence < 0.5` or GENERIC) | **Yes** — one `domainInference` LLM call (Q4) |
| Unresolved sub-domain under a confident domain | **Yes** in Q5 — one enum-constrained `domainSubdomain` call, sub-domain only |
| BA / Manual / Manager enrich | **Optional** — existing M6 agents |

## Milestone order (do not skip)

| Id | Name | Skill focus |
|----|------|-------------|
| **Q1** | Deep crawl | `/zero-analyzer`, `/zero-executor` |
| **Q2** | Domain-driven test generation | `/zero-analyzer`, `/zero-orchestrator` |
| **Q3** | Flow execution | `/zero-executor`, `/zero-domain`, `/zero-builders` |
| **Q4** | AI inference gate | `/zero-orchestrator` |
| **Q5** | Domain + sub-domain classification | `/zero-analyzer`, `/zero-orchestrator` |

## Loop

Same as `WORKFLOW.md`: DETECT → PLAN → IMPLEMENT → VERIFY → ADVANCE `progress.json`.

```bash
npm run workflow:status    # prints Q1–Q5 after packaging probes
npm run workflow:verify -- --milestone Q1
```

Update `support/agent-workflow/progress.json` `product` section only after verify exits 0.
