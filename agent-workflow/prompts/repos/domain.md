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

- Extract enums/schemas out of `server.js` into a module that both API and orchestrator import
- After S2: `packages/domain/**`

## You must not

- Open sockets, read `process.env` for connections, or import `pg` / `playwright`
- Reorder `stageKeys`
- Invent new channel profiles without a product ask

## Honour

- Profiles: Gray, TVNZ+, Aha, Hotstar-like, PrimeVideo-like, Generic
- Pipeline order in AGENTS.md
