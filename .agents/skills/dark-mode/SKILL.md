---
name: dark-mode
description: "Audit and harden dark/light theme quality across the entire UI — contrast, tokens, toggle behavior, media handling, and accessibility. Use when users report dark mode issues, theme mismatch, poor contrast, toggle bugs, flash-of-wrong-theme, or want a full theme audit. Also triggers on 'WCAG contrast', 'color tokens', 'theme flicker', or 'prefers-color-scheme'."
version: 4.0.0
---

# Dark Mode

Deliver a theme system that is readable, consistent, and accessible in both light and dark modes — not just "dark backgrounds with white text."

## Scope

- CSS custom property (token) architecture for theming
- WCAG 2.1 AA contrast compliance (4.5:1 body text, 3:1 large text/UI)
- Dark-mode coverage for every surface, border, shadow, and media element
- Theme toggle behavior, persistence, and system-preference sync
- Flash-of-wrong-theme (FOWT) prevention
- Build safety after all style changes

## Workflow

### Phase 1 — Inventory the Token System

```bash
# Map all active SCSS modules
grep -E "@use|@import" styles/globals.scss
```

Read `styles/_variables.scss` (or equivalent) to understand the current token set. Catalog:

- All `--color-*` custom properties
- Which have both light and dark values
- Which are orphaned (defined but unused)

### Phase 2 — Find Hardcoded Colors

```bash
# Hunt for colors outside the token system
grep -rn --include="*.scss" --include="*.tsx" --include="*.css" \
  -E '#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(' src/ styles/ pages/ \
  | grep -v '_variables.scss' | grep -v 'node_modules'
```

**Decision tree for each hardcoded color:**

- Used on a themeable surface → replace with semantic token
- Decorative/brand accent → keep if intentional, but define in variables with dark override
- Inside SVG or icon → ensure it has a dark-mode equivalent (CSS filter or separate token)
- Gradient or shadow → both endpoints need dark-aware values

### Phase 3 — Validate Contrast Ratios

For every text/background pair, verify WCAG AA compliance:

| Element                               | Minimum Ratio                       | Check                      |
| ------------------------------------- | ----------------------------------- | -------------------------- |
| Body text on background               | 4.5:1                               | Primary reading surfaces   |
| Headings (18pt+ or 14pt bold)         | 3:1                                 | Section headers            |
| Interactive elements (links, buttons) | 3:1                                 | Against adjacent non-text  |
| Placeholder text                      | 4.5:1                               | Often fails — gray on gray |
| Disabled states                       | No requirement, but 2:1 recommended | Visible but diminished     |
| Focus rings                           | 3:1                                 | Against background         |

**Common dark-mode contrast failures:**

- Light gray text on dark gray background (looks fine on retina, fails on standard displays)
- Brand-blue links on dark backgrounds (often < 3:1)
- Border colors that disappear on dark surfaces
- Toast/alert backgrounds that blend into dark mode

### Phase 4 — Theme Toggle and Persistence

Verify in `src/components/layout/Header.tsx` (or equivalent):

1. `data-theme` attribute set on `document.documentElement`
2. `localStorage` read on mount (before first paint to prevent FOWT)
3. System preference detection: `window.matchMedia('(prefers-color-scheme: dark)')`
4. Toggle updates both DOM attribute and localStorage atomically
5. No flash of wrong theme on page load — preference must be read in a blocking `<script>` or layout effect

**FOWT prevention pattern (in `_document.tsx` or `_app.tsx`):**

```tsx
// Blocking script in <Head> — runs before React hydration
<script
  dangerouslySetInnerHTML={{
    __html: `
  (function() {
    var t = localStorage.getItem('theme');
    if (!t) t = window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', t);
  })();
`,
  }}
/>
```

### Phase 5 — Media and Image Handling

- Images with transparency: check they don't have invisible edges in dark mode
- Decorative SVGs: ensure fill/stroke respects `currentColor` or theme tokens
- Code blocks / pre elements: need their own dark palette that doesn't clash
- Scrollbar styling (if custom): needs dark variant
- Selection highlight (`::selection`): needs dark-aware colors

### Phase 6 — Build Verification

```bash
npx next build 2>&1
```

Every style change must survive the build. SCSS compilation errors from mistyped variable names are the most common regression.

## Quality Bar

| Surface          | Light Mode                      | Dark Mode                                     |
| ---------------- | ------------------------------- | --------------------------------------------- |
| Body text        | Dark on light (#1a1a1a on #fff) | Light on dark (#e0e0e0 on #1a1a1a)            |
| Secondary text   | Medium gray (#666)              | Muted light (#999)                            |
| Borders          | Subtle (#ddd)                   | Subtle (#333)                                 |
| Card backgrounds | Slightly off-white (#f8f8f8)    | Slightly lifted (#242424)                     |
| Shadows          | Gentle gray                     | Near-invisible or replaced with border        |
| Brand accent     | Full saturation                 | Slightly desaturated or lightened for dark bg |

- **Never use pure white (#fff) body text in dark mode** — it causes eye strain. Use #e0e0e0 or similar.
- **Never use pure black (#000) backgrounds** — use #1a1a1a or #121212 for depth perception.
- Shadows should be reduced or replaced with subtle borders in dark mode.
- Brand colors may shift hue/saturation for dark backgrounds, but must remain recognizable.

## Guardrails

- Don't add new CSS custom properties unless an existing token can't serve the purpose
- Don't change token values that affect untouched components — scope changes to the affected surface
- Don't remove dark-mode media queries or `[data-theme="dark"]` selectors without verifying no component depends on them
- Don't use `opacity` as a lazy dark-mode strategy — it creates washed-out, inaccessible colors
- Don't ship a fix that you haven't visually confirmed in both modes

## Output Format

```
## Dark Mode Audit Report

### Token Changes
| Token | Before | After | Rationale |
|-------|--------|-------|-----------|
| --color-bg-primary (dark) | #000 | #1a1a1a | Reduce eye strain, add depth |

### Hardcoded Colors Replaced
| File | Line | Before | Token |
|------|------|--------|-------|
| _chat.scss | 42 | #333 | var(--color-border) |

### Contrast Checks
| Surface | Ratio | Status |
|---------|-------|--------|
| Body text on bg (dark) | 12.6:1 | ✅ AA |
| Link on card (dark) | 4.8:1 | ✅ AA |

### Toggle Behavior
- [x] localStorage persistence
- [x] System preference fallback
- [x] No FOWT on page load

### Open Concerns
- [None / describe remaining items]
```
