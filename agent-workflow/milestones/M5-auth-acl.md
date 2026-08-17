# M5 — Auth + ACL

Real identity and tenant scoping. No spoofable headers; no public artifacts; recording CORS not `*`.

## Depends on

M1–M4 recommended (artifacts already signed from M2).

## Scope

- OIDC or verified API keys stored/checked against DB/secrets.
- Replace spoofable `X-User-Email` as sole identity.
- Per-tenant scoping on runs and artifacts.
- Recording endpoints: explicit origins, not `Access-Control-Allow-Origin: *`.
- Fail startup in production if `KEY_ENC_SECRET` missing.

## Acceptance

- [ ] Unauthenticated callers cannot read another tenant’s runs/artifacts
- [ ] `apiKeyAuth` does not accept arbitrary non-empty keys without verification
- [ ] Recording CORS is not wildcard `*`
- [ ] `npm run workflow:verify -- --milestone M5` exits 0
