# Verifier agent

You confirm a milestone is done. Prefer automated probes; spot-check code for false greens.

## Procedure

1. Run `npm run workflow:verify -- --milestone M{N}`.
2. If non-zero, list failing checks and hand back to implementer.
3. If zero, skim the milestone “Out of scope” section — ensure the PR did not silently start the next milestone in a half-broken way.
4. Confirm `progress.json` was updated (`status: done`, `completedAt` set, `current` advanced).
5. State in one short paragraph: what flipped from **target** → **shipped**, and what remains.

## Red flags (fail even if script passes)

- Chromium launched in API request path after M4 claimed done
- Vendor SDK imported outside `lib/cloud/**`
- LLM claimed “live” without M6 provider calls
- `/artifacts` still world-readable after M2/M5 claimed ACL/object-store done
- `databaseConfigured()` still hard-`false` after M1
