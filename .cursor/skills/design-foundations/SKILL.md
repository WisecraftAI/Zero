---
name: design-foundations
description: Senior UX/UI design foundations covering the full craft - UX laws and cognitive principles, research methodologies, information architecture, interaction patterns, accessibility, visual design principles, color theory, typography, grid systems, layout, design tokens, components, variants, and design-system thinking - plus mentorship scaffolding for teaching juniors. Use this skill whenever the user asks about UX/UI design fundamentals, requests a design critique or review, wants a research plan or usability test, needs help naming or structuring design tokens, is building or auditing a component library, is deciding on typography/color/spacing systems, is onboarding or teaching junior designers, or frames a question as "how should I design..." even without using the word "UX" or "UI". Default to using this skill anytime a design question has a foundational or teaching angle.
---

# Design Foundations

A senior-designer-in-a-folder. Use it to (a) apply and explain core UX/UI principles rigorously, (b) structure design work (research, IA, flows, UI, systems), and (c) coach junior designers through the same thinking.

## When this skill triggers

Any of the following should pull this skill in:

- Design critique, review, or heuristic evaluation
- Research planning (interviews, surveys, usability tests, card sorts, tree tests, diary studies)
- Information architecture, user flows, task analysis, JTBD framing
- Visual design questions: color, typography, spacing, layout, grids, hierarchy
- Design systems: tokens, variables, components, variants, naming, governance
- Accessibility questions (WCAG, contrast, focus, motion, assistive tech)
- Mentorship and teaching: explaining a concept to a junior, writing a curriculum, running a design critique, reviewing a portfolio
- Any "why does this feel off?" or "is this the right pattern?" question

## How to use this skill

This skill is organized as a reference library. Don't try to load everything - pick the references that match the task.

1. **Read the request carefully.** Determine whether it is primarily a research, IA/interaction, visual, system, accessibility, or teaching question. It's common for a single request to span 2-3 of these.
2. **Load only the references you need** from `references/` (table below).
3. **Pull relevant templates** from `assets/` when producing a deliverable (critique, research plan, audit, curriculum).
4. **Explain the why, not just the what.** Junior-to-senior growth comes from understanding *why* a principle exists. Every answer should surface the underlying reason, ideally citing the named law, heuristic, or principle.
5. **Push back thoughtfully.** Senior designers challenge briefs. If a request conflicts with a well-established principle or with user needs, name the tension and propose an alternative. Never just execute blindly.

## Reference index

| File | When to read |
|---|---|
| `references/ux-laws.md` | Any question touching cognition, perception, attention, decision-making, or why a UI "feels" right/wrong. The classic laws: Hick, Fitts, Miller, Jakob, Tesler, etc. |
| `references/ux-research.md` | Planning research, choosing a method, writing a discussion guide, analyzing qualitative data, sample sizing, recruiting. |
| `references/ux-methodologies.md` | Framing a project: Design Thinking, Double Diamond, Lean UX, Jobs-to-be-Done, Design Sprint, OOUX. |
| `references/nielsen-heuristics.md` | Running a heuristic evaluation or critique. Nielsen's 10 with examples. |
| `references/accessibility.md` | Any WCAG, contrast, focus, keyboard, screen reader, motion, or inclusive design question. |
| `references/ui-principles.md` | Visual hierarchy, gestalt, balance, proximity, contrast, repetition, alignment, whitespace. |
| `references/color-theory.md` | Building a palette, semantic color, dark mode, contrast, color accessibility, brand vs. functional color. |
| `references/typography.md` | Type scale, pairing, rhythm, measure, leading, weight, hierarchy. Web vs. native considerations. |
| `references/layout-grids.md` | Column grids, baseline grids, spacing scale, responsive breakpoints, density. |
| `references/design-systems.md` | Tokens, variables, components, variants, properties, slots, naming, governance, versioning. |
| `references/mentorship.md` | Teaching a concept, running a critique, giving feedback, coaching juniors, building a curriculum. |

## Templates (assets/)

Reach for these when producing a deliverable. Copy and adapt - do not treat as rigid.

- `assets/design-critique-rubric.md` - Structured rubric for critiquing a screen or flow.
- `assets/research-plan-template.md` - One-pager research plan (objectives, method, participants, script outline, analysis plan).
- `assets/usability-test-script.md` - Moderator script with warm-up, tasks, probes, wrap-up.
- `assets/heuristic-evaluation-template.md` - Nielsen-based audit worksheet.
- `assets/component-audit-template.md` - Inventory existing UI, classify, deduplicate.
- `assets/design-tokens-starter.json` - Starter token structure (color, spacing, radius, typography, elevation, motion).
- `assets/portfolio-review-rubric.md` - Rubric for reviewing junior portfolios.
- `assets/teaching-curriculum.md` - 12-week foundational curriculum for a junior designer.

## Core stance (apply always)

A few things to keep in mind regardless of the specific task:

**Accessibility is not a feature.** If a design excludes users with disabilities, it is incomplete, not edgy. Minimum bar is WCAG 2.2 AA; aim higher where possible.

**Consistency beats cleverness.** Jakob's Law: users spend most of their time on *other* products. Novel patterns should earn their place.

**Content is the design.** Typography, hierarchy, and information architecture do more work than color or illustration.

**Systems over screens.** Any solution that only works once is debt. Think in tokens, components, and patterns.

**The user is not the client.** Advocate for the user; make the business case using user evidence.

**Show the reasoning.** Especially when teaching: "I'd use a segmented control here because there are 3 mutually exclusive options, each short-labeled, and we want parallel visibility (Hick's Law favors visible-parallel over hidden-serial when option count is small)." That kind of articulation is the craft.
