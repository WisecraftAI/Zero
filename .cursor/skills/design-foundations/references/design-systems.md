# Design Systems: Tokens, Variables, Components, Variants

A design system is a shared language for product design, engineering, and content. It's the biggest multiplier a senior designer delivers - not screens, but the system that lets the next ten teams ship screens.

## Table of contents

1. What's in a design system
2. Tokens
3. Variables (Figma / code)
4. Primitives, semantic, component tokens (3-tier)
5. Components - structure and properties
6. Variants vs properties vs slots
7. Naming conventions
8. Governance and contribution
9. Versioning and release
10. Documentation that works
11. Anti-patterns and pitfalls

---

## 1. What's in a design system

Layered from most fundamental to most specific:

1. **Brand and voice** - mission, personality, tone. Influences everything above it.
2. **Design tokens** - atomic values: colors, spacing, type, radius, elevation, motion.
3. **Primitives / utilities** - layout stacks, clusters, grids, text blocks.
4. **Components** - buttons, inputs, cards, modals, nav. With states, variants, properties.
5. **Patterns** - compositions for common flows: empty states, forms, checkout, auth.
6. **Content guidelines** - voice, grammar, microcopy rules, terminology dictionary.
7. **Accessibility standards** - target sizes, contrast, semantics, keyboard patterns.
8. **Governance** - who decides, contribution process, release cadence.

Not all systems need all eight at year one. Every mature system does.

## 2. Tokens

A **design token** is a named, platform-agnostic value: `color.brand.primary = #2B5DFA`. Tokens are the single source of truth - designers reference them in Figma, engineers reference them in code, both pull from the same definition.

**Categories.**
- **Color** - palette, semantic roles, surfaces, text, borders, gradients.
- **Typography** - font family, size, weight, line-height, tracking.
- **Spacing** - padding, margin, gap increments.
- **Sizing** - widths, heights, max-widths.
- **Radius** - corner radii.
- **Elevation / shadow** - named shadow presets.
- **Border** - widths, styles.
- **Opacity** - standard opacity values.
- **Motion** - durations, easings.
- **Z-index** - layers for overlays.
- **Breakpoints** - responsive thresholds.

**File format.** W3C Design Tokens Format Module (JSON-based, now an emerging standard). Tools: Style Dictionary, Tokens Studio (Figma plugin), Specify, Diez. Export to CSS variables, iOS, Android, React Native, Tailwind config.

**Example (JSON, W3C-style):**

```json
{
  "color": {
    "blue": {
      "500": { "$value": "#2B5DFA", "$type": "color" }
    }
  },
  "space": {
    "md": { "$value": "16px", "$type": "dimension" }
  }
}
```

## 3. Variables (Figma / code)

Figma Variables (2023+) brought runtime tokens to design. A variable has:

- **Name** - `color.brand.primary`.
- **Type** - color, number, string, boolean.
- **Collections** - groupings with modes (e.g. Light / Dark, Brand A / Brand B, Comfortable / Compact).
- **Scopes** - what layers it can bind to (fill, stroke, text, width, etc.).

**Modes** are the game-changer. One variable, multiple values across modes. Swap mode at the frame, page, or component level.

**Engineering.** CSS Custom Properties (`--color-brand-primary: #2B5DFA;`) with mode overrides via `[data-theme="dark"]`. iOS: Asset Catalog with appearance variants. Android: `attrs.xml` + themes.

## 4. Three-tier token architecture

The industry-converging best practice. Three tiers of tokens, each abstracting the one below.

### Tier 1: Primitive / raw

The palette. Every color, every size, irrespective of role.

- `color.blue.500 = #2B5DFA`
- `space.4 = 16px`
- `font.size.300 = 16px`

Use: never directly in product code. Only in tier 2.

### Tier 2: Semantic / alias

Intent-based names. What is this color *for*?

- `color.text.primary = color.gray.900`
- `color.bg.surface = color.white`
- `color.action.primary = color.blue.500`
- `color.action.primary.hover = color.blue.600`
- `color.border.subtle = color.gray.200`
- `color.danger = color.red.500`
- `space.card.padding = space.4`

Use: in components.

### Tier 3: Component

Component-specific overrides, when semantic isn't specific enough.

- `button.primary.bg = color.action.primary`
- `button.primary.bg.hover = color.action.primary.hover`
- `card.radius = radius.md`

Use: when a component has consistent styling that deserves its own name and isn't worth duplicating.

**Why three tiers.**
- Primitive: change a palette color once, everything updates.
- Semantic: swap themes (light/dark, brand variants) by redefining semantics.
- Component: fine-tune a button without touching the palette.

## 5. Components - structure and properties

A well-designed component has:

- **Clear purpose.** One job. If it does two things, it's two components.
- **Defined states.** Resting, hover, focus, active, disabled, loading, error, selected.
- **Accessibility baked in.** Proper roles, keyboard behavior, focus indicators, contrast.
- **Responsive behavior.** How it behaves at different container widths.
- **Configurable properties.** Size, variant, icon, label, leading/trailing elements.
- **Slot-based content.** Parts that can hold arbitrary content (e.g. Card has `header`, `body`, `footer` slots).
- **Clear API.** Props named consistently with the rest of the system.

**Anatomy diagram.** Every non-trivial component gets one - labeled parts, call-outs for spacing, notes about states.

## 6. Variants vs properties vs slots

Figma vocabulary (engineering has its own but the concepts map):

**Variant** - a discrete visual variation of a component. Example: Button variants `Primary / Secondary / Tertiary / Ghost / Danger`.

**Property** - a configurable axis. Boolean (`hasIcon`), enum (`size: sm | md | lg`), instance swap (`icon: <IconSwap>`), text (`label`).

**Slot** - a region where arbitrary content can be placed. Maps to `children` in React, `<slot>` in Vue.

**Rule.** Prefer properties and slots over explosion-of-variants. A button with 5 visual variants x 3 sizes x 2 states x 2 icon positions = 60 variants in Figma. If some of those are really *properties*, the combinatorial blow-up shrinks.

**Boolean properties** with toggles are cleaner for things like `disabled`, `hasLeadingIcon`.

**Instance-swap properties** are powerful for icons, avatars, anything composable.

## 7. Naming conventions

Good names make systems usable. Bad names breed inconsistency.

**Principles.**
- **Intent over appearance.** `color.action.primary` not `color.blue.500`.
- **Predictable patterns.** `[category].[subcategory].[role].[state]`.
- **No abbreviations** that save typing but lose clarity. `bg` is OK (universal); `srf-2-alt` is not.
- **Plural or singular consistently.** Usually singular (`space.md`, not `spaces.md`).
- **Numeric steps for ramps.** `50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950`. Not `light, lighter, lightest, dark, darker, darkest`.
- **States at the end.** `button.primary.bg.hover` not `button.hover.primary.bg`.

**Examples of good names:**

- `color.surface.1`
- `color.text.primary`
- `color.text.secondary`
- `color.text.on-action`
- `color.border.subtle`
- `color.border.strong`
- `color.action.primary`
- `color.action.primary.hover`
- `color.action.destructive`
- `color.feedback.success`
- `color.feedback.warning`
- `color.feedback.danger`
- `space.4` (= 16px)
- `radius.md`
- `elevation.raised`
- `motion.duration.fast`
- `motion.ease.standard`

## 8. Governance and contribution

A system is a product. Someone owns it. It has users (designers and engineers). Feedback mechanisms, roadmap, release cycles.

**Ownership models.**
- **Centralized.** A dedicated DS team owns everything. Slow to evolve, consistent.
- **Federated / contribution-based.** Central team + contributing teams. Faster; needs rigorous review.
- **Embedded.** Design system designers embed in product teams, carry patterns back.

**Contribution process.**
1. **Request / proposal** - need surfaces from product team.
2. **Triage** - DS team reviews. Is this already covered? Should it be system-level or team-local?
3. **Design / spec** - prototype, gather feedback, validate with other teams.
4. **Review gate** - design review, a11y review, eng review.
5. **Merge** - to canonical library.
6. **Release** - versioned, changelog, migration guide if breaking.
7. **Deprecation** - old patterns phased out with timeline.

**Defaults.**
- Not everything belongs in the system. Team-specific patterns live in team libraries.
- Promotion threshold: used by 3+ teams or likely to be.

## 9. Versioning and release

- Use **semantic versioning**: major (breaking), minor (additive), patch (fix).
- **Changelogs** are mandatory and user-facing.
- **Deprecation notices** precede removal by at least one major version.
- **Migration guides** for breaking changes.
- **Automated codemods** for common migrations when possible.

## 10. Documentation that works

Bad docs kill adoption. Great docs do:

- **Live examples** rendered from the same source as production components.
- **Props table** with types, defaults, descriptions.
- **When to use / when not to use.** Critical. A button spec with no guidance is a buffet of footguns.
- **Accessibility notes** per component.
- **Do / Don't examples** with real screenshots.
- **Copy guidelines** for components that take text (buttons, empty states, errors).
- **Code + Figma parity.** Side-by-side. Named identically. Properties matching.

Tools: Storybook, Zeroheight, Supernova, Backlight, custom docs sites. Storybook + MDX + autodocs is a common stack.

## 11. Anti-patterns and pitfalls

- **One token per component.** Over-specified; defeats the point. Lean on semantic aliases.
- **No semantic tier.** Product code references primitives directly. Theme changes become a grep-and-replace.
- **Component library without patterns.** Teams ship components in new and creative ways you didn't intend. Document the compositions.
- **Adoption without enforcement.** Linters, design review, CI checks catch drift.
- **Design system as a side project.** Chronic under-investment. Pitch it as a platform; measure adoption, time saved, defect rate.
- **Overgrown variant trees.** If your Figma component has 200 variants, refactor.
- **Fighting platform conventions.** Don't fight iOS/Android/Web. Borrow their patterns where possible; extend, don't replace.
- **Design tokens that look nothing like production.** Engineers can't implement what designers spec because tokens don't map to build output. Automate the export pipeline from day one.
