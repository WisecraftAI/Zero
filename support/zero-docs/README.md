# @zero/docs

**ZER0 AI QA orchestration — product & technical documentation.**

React doc site (`:5174`) for showing what ZER0 is: a multi-agent AI pipeline (Web Analyzer → BA → Manual QA → Automation QA → Manager) powered by OpenAI, Claude, and Gemini, plus Playwright execution and shippable reports. Architecture, deployment, and LLD tabs support engineers; **Overview** is what you show stakeholders.

**Stack:** React 19 · Vite 6 · TypeScript strict · SCSS Modules · Vitest

Markdown lead briefings (moved from the old root `docs/` folder):

| Path | Version | Content |
|------|---------|---------|
| [`docs/v1/`](./docs/v1/) | V1 | Current runtime — `DEVELOPER_GUIDE.md` (**new PC / Day-0**), `ARCHITECTURE.md`, `DATABASE.md`, `DOCKER.md`, `OPEN_SOURCE.md` |
| [`docs/v2/`](./docs/v2/) | V2 | Target vision + production gaps — `ARCHITECTURE.md` |
| [`docs/README.md`](./docs/README.md) | — | Index |

V3 packaging (workspaces, Docker, S0–S7), product Q1–Q5 (Q5 open), and UX U1–U2 live in the React Architecture tab (`src/pages/v3/`, `migration.ts`), not as markdown.

## Run

```bash
cd zero-docs
npm install
npm run dev          # http://localhost:5174 · HMR, no Docker rebuild
```

Docker (bind-mounted Vite — save a file, the page updates):

```bash
# from repo root
docker compose up docs
# http://localhost:5174
```

Baked nginx image (ship only): `docker build -t zero-docs ./zero-docs`

## Ship

```bash
npm run verify       # typecheck · lint · lint:styles · test · build
npm run preview      # serve the built bundle from dist/
```

## What's inside

| Path                         | Owns                                                                                          |
| ---------------------------- | --------------------------------------------------------------------------------------------- |
| `src/styles/_tokens.scss`    | Design tokens as SCSS vars **and** `:root` custom properties. Single source of truth.         |
| `src/styles/_mixins.scss`    | `up(bp)` / `down(bp)` media queries, `focus-ring`, `scroll-x`, `surface`, `brand-heading`.    |
| `src/styles/_reset.scss`     | Element reset + body background + `prefers-reduced-motion`.                                   |
| `src/styles/_typography.scss`| `.section` / `.compact` / `.prose` — shared page rhythm.                                      |
| `src/styles/index.scss`      | Entry — imported once from `main.tsx`.                                                        |
| `src/components/layout/`     | Hero, Tabs, SubTabs, JumpNav, Footer — the shell.                                             |
| `src/components/ui/`         | Card, Note, Diagram, Mermaid, FlawItem, PipelineStage, Honesty, ProvidersTable, CodeBlock — primitives. |
| `src/pages/`                 | One page per top-level tab. `v3/` splits into sections + LLD sub-tabs.                        |
| `src/data/`                  | Repo catalog + M1–M7 / S0–S7 / Q1–Q5 / U1–U2 scores. Q5 is open.            |
| `src/hooks/`                 | `useHashTab`, `useMediaQuery`.                                                                |
| `test/`                      | Vitest + Testing Library + jsdom.                                                             |

## Toolchain

Every choice here is a professional Vite 6 default, not a fresh-out-of-`create-react-app` shape.

| Concern              | Choice                                                    | Why                                                                                              |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Bundler / dev server | **Vite 6** + `@vitejs/plugin-react`                       | Sub-second HMR; native ESM; production build via Rollup.                                         |
| Styles               | **SCSS Modules** with `sass-embedded` (modern compiler)   | Nesting, mixins, `@use`, real breakpoint helpers. CSS Modules keep class names locally-scoped.   |
| CSS minifier         | Lightning CSS                                             | Faster than PostCSS + cssnano; ships automatically with Vite 6.                                  |
| Type safety          | **`typescript@5.7`** with `strict + exactOptionalPropertyTypes` | Zero `any`, zero unchecked side-effects.                                                    |
| In-editor feedback   | **`vite-plugin-checker`** (TS + ESLint flat config)       | Errors overlay in the dev server; no separate watch needed.                                      |
| Linting              | **ESLint 9 flat config**, typescript-eslint type-checked  | Catches unbound methods, floating promises, unsafe access at lint time.                          |
| Style linting        | **`stylelint@16` + `stylelint-config-standard-scss`**     | Enforces SCSS style conventions.                                                                 |
| Tests                | **Vitest 2** + Testing Library 16 + jsdom + jest-dom      | Same primitives as prod, ~10× faster than Jest.                                                  |
| Path aliases         | `@/*` → `src/*` (Vite + tsconfig + eslint parser aware)   | No `../../../` imports.                                                                          |

## Conventions

- **SCSS Modules per component** — `Foo.tsx` + `Foo.module.scss`, colocated.
- **Import shape** — always `@use '@/styles/mixins' as *;` (or `... as m;`) instead of a global `additionalData` injection. Explicit imports = predictable compile.
- **Tokens** — read from CSS custom properties (`var(--panel)`) inside `.module.scss`, or from SCSS variables (`$s-4`) when you need compile-time math.
- **Breakpoints** — `@include up(md) { ... }`. Mobile-first only; `down()` exists but is discouraged.
- **Type imports** — `import type { X } from ...` (enforced by `consistent-type-imports`).
- **No default exports** for components — makes refactors safer, autocompletion clearer.
- **Hash routing** — tab state lives in `location.hash`; no router dependency.
- **No dead features** — a component that doesn't render is deleted, not hidden.

## Extending

Add a new tab:

1. Add a component under `src/pages/`.
2. Register it in `src/tabs.ts`.
3. Wire the branch in `src/App.tsx`.

Repo catalog and milestone scores live in `src/data/repos.ts` and `src/data/migration.ts` — keep those honest when the tree changes.

Regenerate live package docs from disk (run before `npm run build` or via `prebuild`):

```bash
# from support/zero-docs/ — or use the same script names at the repo root
npm run docs            # LLD workspace facts → src/data/generated.ts
npm run analyser-doc    # packages/analyzer → src/data/analyzerDoc.generated.ts
npm run packages-doc    # domain · db · locators · builders · cloud → src/data/packagesDoc.generated.ts
```

The **Packages** tab renders `analyzerDoc` + `packagesDoc` so facade re-exports and `lib/` modules stay in sync with the repo.

Add a new V3 section:

1. Add `src/pages/v3/sections/YourSection.tsx`.
2. Register in `src/pages/v3/index.tsx`.
3. Add a `JumpNav` entry.

Add a new LLD sub-tab:

1. Add `src/pages/v3/lld/YourApp.tsx` using the shared `./Lld.module.scss`.
2. Register in the `LLD_TABS` array in `src/pages/v3/index.tsx`.
