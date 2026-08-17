# S0 — Containerize what exists

One `Dockerfile` + `docker-compose.yml` for the monolith, plus Postgres / Redis / MinIO. No code moves.

## Status

**Done.** Compose boots the app image + sidecars. Docs `:5174`, workflow `:5175`.

## Depends on

Nothing.

## Acceptance

- [x] Root `Dockerfile` exists
- [x] `docker-compose.yml` includes Postgres
- [x] `npm run workflow:verify -- --milestone S0` exits 0
