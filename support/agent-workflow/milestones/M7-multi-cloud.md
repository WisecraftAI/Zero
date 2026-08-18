# M7 — Multi-cloud adapters

`lib/cloud/*` implementations for AWS + one other cloud. IaC modules. CI smoke.

## Depends on

M1–M4 (adapters already used). M5–M6 may still be partial.

## Scope

- `ZERO_CLOUD=aws` and one of `gcp` | `azure` | `vercel` fully implementing queue, object store, secrets, cache.
- Keep `local` for dev.
- Minimal IaC (Terraform/Pulumi/CDK — pick one) per provider for the four primitives.
- CI smoke: health + one hermetic workflow path against `local` (and optionally one cloud).

## Acceptance

- [ ] Domain code still has zero direct AWS/GCP/Azure SDK imports outside `lib/cloud/**`
- [ ] Two non-local providers implement the contracts
- [ ] CI runs `workflow:status` / smoke health
- [ ] `npm run workflow:verify -- --milestone M7` exits 0
