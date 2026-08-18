# Domain contracts — coding prompt

**Workspace:** Domain contracts  
**Folder:** `packages/domain/`  
**npm package:** `@zero/domain`  
**Cursor skill:** `/zero-domain`

## Purpose

Shared contracts: stage keys, channel profiles, zod schemas, typed errors, id constructors. **No I/O.**

## Design patterns

- Shared kernel / value objects
- Schema-at-the-boundary (zod in V3)
- Pure modules — no Express, Playwright, or cloud SDKs

## You may change

- Keep shared enums/schemas in `packages/domain/**` so both `@zero/api` and `@zero/orchestrator` import them
- Source of truth: `packages/domain/index.js` (`stageKeys`, `appProfiles`)

## You must not

- Open sockets, read `process.env` for connections, or import `pg` / `playwright`
- Reorder `stageKeys`
- Invent new channel profiles without a product ask

## Honour

- Profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic
- Pipeline order in AGENTS.md
