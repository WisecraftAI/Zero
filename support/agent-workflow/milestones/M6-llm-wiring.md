# M6 — LLM wiring

Provider keys + agent settings actually drive BA/Manager (and Manual/Automation as designed).

## Depends on

M3 (orchestrator owns LLM calls). M5 preferred for secret access control.

## Scope

- Orchestrator agents call configured providers (Claude / OpenAI / Gemini) using decrypted keys.
- Rate limits, cost caps, prompt versioning.
- Template fallback when no key configured (deterministic path remains).
- UI must not imply live LLM agents until this ships — or clearly label template mode.

## Acceptance

- [ ] With a valid provider key, BA or Manager path invokes the provider (logged, redacted)
- [ ] Without keys, pipeline still completes via templates
- [ ] Cost/rate guardrails exist
- [ ] `npm run workflow:verify -- --milestone M6` exits 0
