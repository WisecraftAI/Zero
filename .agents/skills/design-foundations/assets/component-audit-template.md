# Component Audit Template

When a design system is behind the product, or a product has grown without one, an audit is the first step. Inventory everything, find duplicates, name what should exist, plan consolidation.

## Phase 1: Inventory

Walk every screen (production app, design files, marketing site, admin panel). Capture every unique UI element.

| # | Name (working) | Where it appears | Variants found | Screenshot / link |
|---|---|---|---|---|
| 1 | Button primary | Checkout, signup, profile | 3 sizes, 2 colors, icon/no-icon | |
| 2 | Card | Dashboard, library, pricing | 2 sizes, 4 variants | |
| 3 | Text input | Signup, settings, search | 2 sizes, error state missing | |

**Hunt methodically.**
- Forms and form fields
- Buttons and actions
- Navigation (primary, secondary, breadcrumbs)
- Cards and tiles
- Lists and tables
- Modals, drawers, sheets, popovers
- Feedback (toasts, banners, snackbars, inline alerts)
- Tags, chips, badges
- Avatars, thumbnails, media
- Empty states, error states, loading states
- Typography styles
- Icons

## Phase 2: Classify

For each item, tag:

- **Keep** - well-designed, widely used.
- **Consolidate** - duplicate of existing; merge.
- **Retire** - obsolete; plan removal.
- **Refactor** - needs rework before entering system.
- **Create** - gap; doesn't exist but should.

## Phase 3: Find duplicates

Group items that should be one component. Common duplicates:

- Three button styles that differ only in border radius.
- Two date pickers.
- Multiple card layouts for same use case.
- Different empty-state illustrations saying the same thing.
- Several inconsistent form field styles.

**Output.** "We have 14 button variants across the product. Proposal: consolidate to 5 variants x 3 sizes x 2 states = standard primary/secondary/ghost/destructive/link."

## Phase 4: Naming and grouping

Establish a vocabulary. Shared with engineering.

- Primitive components (atoms): Button, Input, Icon, Avatar, Tag.
- Composite components (molecules): InputGroup, Card, MenuItem.
- Patterns (organisms): Form, DataTable, ListView, Header.
- Templates: page layouts.

## Phase 5: States matrix

For each "keep" or "refactor" component, list required states:

| Component | Default | Hover | Focus | Active | Disabled | Loading | Error | Selected | Empty |
|---|---|---|---|---|---|---|---|---|---|
| Button | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | - | - | - |
| Input | ✓ | ✓ | ✓ | - | ✓ | - | ✓ | - | - |
| Card | ✓ | ✓ | - | - | - | ✓ | ✓ | - | ✓ |

Note any missing states - they will be the first round of fixes.

## Phase 6: Tokenization audit

For each component, list the tokens it needs. Catch mismatches.

- Button primary: `color-action-primary-bg`, `color-on-action`, `radius-md`, `space-3` padding, `font-body-md`, `font-weight-medium`.
- If values are hardcoded (`#2B5DFA`, `8px`), flag. Everything should map to tokens.

## Phase 7: Accessibility audit

Per component:
- [ ] Contrast checked
- [ ] Focus state visible
- [ ] Keyboard accessible
- [ ] Screen-reader accessible name
- [ ] Touch target adequate

## Phase 8: Roadmap

Prioritize. What to build first:

1. **Highest traffic first.** Button, Input, Card, Nav.
2. **Highest inconsistency.** Components with the most variants in the wild.
3. **Highest risk.** Components that affect accessibility or legal compliance (forms, dialogs).

**Timeline.**
- Month 1: Tokens + 5 primitives.
- Month 2: 10 more primitives + 3 compositions.
- Month 3: Patterns + documentation + governance.

## Phase 9: Migration plan

Old components don't vanish overnight. Plan:

- Deprecate with notice in code (linters warn on old imports).
- Migration guide per component.
- Deadline for full removal.
- Auto-codemods for common patterns.

## Deliverables

- [ ] Inventory spreadsheet
- [ ] Consolidation plan (with proposed new component names)
- [ ] States matrix
- [ ] Token audit (hardcoded → token)
- [ ] A11y audit
- [ ] Prioritized roadmap
- [ ] Migration plan
