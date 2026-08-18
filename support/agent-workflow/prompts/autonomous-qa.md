# Autonomous any-URL QA — product north star (Q1–Q4) · **complete**

User provides **URL only**. No CSV, no channel picker, no BA notes. ZERO should:

1. **Crawl** the site (multi-page, bounded) ✓ Q1
2. **Understand** domain type (rules first, AI when uncertain) ✓ Q4
3. **Generate** major functional test cases ✓ Q2
4. **Execute** top critical flows in Playwright ✓ Q3
5. **Report** pass/fail + manager summary ✓

## AI placement (strict)

| Stage | AI? |
|-------|-----|
| Crawl, element detection, known domain types | **No** — Playwright + rules |
| Major case generation | **No** in Q2 — templates from type + flows |
| Flow execution | **No** — deterministic Playwright |
| Low-confidence domain (`confidence < 0.5` or GENERIC) | **Yes** — one `domainInference` LLM call (Q4) |
| BA / Manual / Manager enrich | **Optional** — existing M6 agents |

## Milestone order (do not skip)

| Id | Name | Skill focus |
|----|------|-------------|
| **Q1** | Deep crawl | `/zero-analyzer`, `/zero-executor` |
| **Q2** | Domain-driven test generation | `/zero-analyzer`, `/zero-orchestrator` |
| **Q3** | Flow execution | `/zero-executor`, `/zero-domain`, `/zero-builders` |
| **Q4** | AI inference gate | `/zero-orchestrator` |

## Loop

Same as `WORKFLOW.md`: DETECT → PLAN → IMPLEMENT → VERIFY → ADVANCE `progress.json`.

```bash
npm run workflow:status    # prints Q1–Q4 after packaging probes
npm run workflow:verify -- --milestone Q1
```

Update `support/agent-workflow/progress.json` `product` section only after verify exits 0.
