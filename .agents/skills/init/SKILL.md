---
name: init
description: >-
  Bootstrap ZER0 agent skills by installing stack-matched pro skills into
  .cursor/skills and .agents/skills. Use when the user runs /init, asks to
  install pro skills, bootstrap skills, set up agent skills, or sync project
  skills for this repo.
disable-model-invocation: true
---

# Init — ZER0 pro skills

Install the language/tooling pro skills that match this repo’s stack into the
project so agents can discover them locally.

## Stack map (this repo)

| Area | Path / tech | Pro skill |
|------|-------------|-----------|
| Server | `services/*` (`@zero/api` · `@zero/orchestrator` · `@zero/executor`) + `packages/*` — Node CommonJS + Express | `javascript` |
| Client | `web/` (`@zero/web`) — React 18 + Vite (JSX) | `react` |
| ML (optional) | `support/ml-training/` — Python | `python-pro` |
| TC uploads | `.xlsx` / `.xls` / CSV | `xlsx` |
| Reports / PDFs | `pdfkit`, PDF artifacts | `pdf` |
| Verify | lint / build / test | `build-check` |
| Cleanup | refactor changed code | `simplify` |
| UI theme | CSS theme / contrast | `dark-mode` |
| UI craft | UX/UI foundations | `design-foundations` |

Do **not** install unrelated pro skills (e.g. `go-pro`, `rust-pro`, `angular`,
`roku`, `just-pro`, `typescript-pro`, `scss-audit`, `pwa`) unless the user
explicitly asks.

Zero-specific skills already in-repo (`zero-architecture`, `zero-diagrams`,
`architecture`, `uml`, `graphviz`, `network`, `sf-diagram-mermaid`) are left
alone.

## When invoked

1. Run the installer from the **repo root**:

```bash
bash .cursor/skills/init/scripts/install-pro-skills.sh
```

2. Confirm each expected skill exists under both:
   - `.cursor/skills/<name>/SKILL.md`
   - `.agents/skills/<name>/SKILL.md`

3. Report a short summary: installed / skipped (already present) / missing source.

## Source resolution

The script copies from the first existing source for each skill:

1. `$CLAUDE_SKILLS_DIR` or `~/.claude/skills/<name>`
2. `$CURSOR_PRO_SKILLS_DIR` or `~/.cursor/skills/language-pro/<name>` (for `*-pro` names)
3. `~/.cursor/skills/<name>`

If a skill’s source is missing, note it and continue; do not invent content.

## Options

```bash
# Force overwrite existing project copies
bash .cursor/skills/init/scripts/install-pro-skills.sh --force

# Install only a subset
bash .cursor/skills/init/scripts/install-pro-skills.sh --only javascript,react
```

## After install

Remind the user they can invoke skills with `/javascript`, `/react`, `/python-pro`,
etc., and that Zero architecture/diagram skills remain `/zero-architecture` and
`/zero-diagrams`.
