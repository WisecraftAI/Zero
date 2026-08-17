# lib/

S2 moved shared modules into npm workspaces. Prefer package names:

| Was | Now |
|-----|-----|
| `lib/cloud` | `@zero/cloud` (`packages/cloud`) |
| `lib/db.js` | `@zero/db` (`packages/db`) |
| `lib/locatorRegistry.js` | `@zero/locators` (`packages/locators`) |
| `lib/scriptBuilder.js` | `@zero/builders` (`packages/builders`) |
| `lib/urlAnalyzer*.js` | `@zero/analyzer` (`packages/analyzer`) |
| `lib/orchestrator` | `@zero/orchestrator` (`apps/orchestrator`) |
| `lib/execution` | `@zero/executor` (`apps/executor`) |
| `lib/auth.js` / middleware | `@zero/api` (`apps/api`) |

`stageKeys` / `appProfiles` live in `@zero/domain`.
