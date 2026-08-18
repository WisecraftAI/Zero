# M2 — Object store + signed URLs

Move large artifacts off API-local disk. Browser uploads via presigned PUT; downloads via presigned GET.

## Depends on

M1 (run metadata lives in Postgres; object keys referenced from `qa_runs` / `qa_assets`).

## Scope

- Implement `ObjectStore` in `lib/cloud/` (`local` filesystem+token first; S3/R2 later in M7).
- API intake: return upload URLs; do not stream large TC/recording bodies through the API process for the happy path.
- Screenshots, traces, reports stored via object store; API serves signed GET (or redirects), not world-readable static `/artifacts`.
- Update run download paths to use `presignGet`.

## Out of scope

- Full queue/orchestrator split (M3)
- Removing Chromium from API (M4)
- OIDC (M5) — but stop expanding public static artifact exposure

## Acceptance

- [ ] `lib/cloud` exports `ObjectStore` with `presignPut` / `presignGet` / `put` / `get`
- [ ] Default `ZERO_CLOUD=local` works without AWS credentials
- [ ] Large uploads can bypass API body streaming (presign or documented equivalent)
- [ ] Artifacts are not anonymously listable/world-readable in the target path
- [ ] `npm run workflow:verify -- --milestone M2` exits 0
