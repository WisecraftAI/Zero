# Autonomous any-URL QA — product north star (Q1–Q5) · **Q5 reopened**

User provides **URL only**. No CSV, no channel picker, no BA notes. ZERO should:

1. **Crawl** the site (multi-page, bounded) ✓ Q1
2. **Understand** domain **and sub-domain** (rules first, AI when uncertain) ✓ Q4 · ⧗ Q5
3. **Generate** major functional test cases from the resolved pair ✓ Q2 · ⧗ Q5
4. **Execute** top critical flows in Playwright ✓ Q3
5. **Report** pass/fail + manager summary ✓

Q5 is the quality gate the first four left open: site understanding must use one canonical
classification contract, meet an offline accuracy benchmark, and demonstrably improve the tests
written for different funnels inside the same domain.

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
| **Q5** | Trustworthy site understanding and test-plan quality | `/zero-analyzer`, `/zero-orchestrator` |

## Loop

Same as `WORKFLOW.md`: DETECT → PLAN → IMPLEMENT → VERIFY → ADVANCE `progress.json`.

```bash
npm run workflow:status    # prints Q1–Q5 after packaging probes
npm run workflow:verify -- --milestone Q1
```

Update `support/agent-workflow/progress.json` `product` section only after verify exits 0.

Operator console work is a separate track (**U1–U2**). See `prompts/ui-ux.md`.
