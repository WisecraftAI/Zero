# Layout, Grids, Spacing, Alignment

The skeleton under every screen. Good layout is invisible; bad layout is the first thing users complain about without being able to name.

## Table of contents

1. The spacing scale
2. The 4pt / 8pt grid
3. Column grids
4. Baseline grids
5. Alignment
6. Breakpoints and responsive
7. Density and compositions
8. Fluid vs fixed
9. Container and layout patterns
10. Common layout mistakes

---

## 1. The spacing scale

A spacing scale is a fixed set of values used for margins, padding, gaps. Consistency here is the biggest lever for "this feels designed" vs "this feels thrown together."

**Base unit.** 4px or 8px, typically. 4px gives finer control but risks inconsistency. 8px is coarser and safer. Most modern systems use 4px as the token increment but encourage 8px multiples for primary spacing.

**Example (4pt base):**

```
0, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
```

Tokens: `space.0, space.1, space.2 … space.20` (numeric), or t-shirt sizes `xs, sm, md, lg, xl, 2xl`.

**Rule.** Never use a spacing value not on the scale. When in doubt, round to the nearest scale stop.

## 2. The 4pt / 8pt grid

All sizes (paddings, margins, gaps, heights, corner radii) are multiples of the base unit.

**Why.** The eye notices differences smaller than 4px less; 4px increments give enough granularity while keeping the system tight. Also, multiples of 8 divide cleanly across 1x, 1.5x, 2x, 3x device densities.

**In practice.**
- Button height: 32, 40, 48.
- Icon sizes: 16, 20, 24, 32.
- Card padding: 16, 24.
- Section padding: 48, 64, 96.
- Page margin (mobile): 16 or 20. Desktop: 24, 32, 40, 80.

Exceptions exist for visual centering or optical adjustment - acknowledge and document them.

## 3. Column grids

Used for horizontal arrangement of content.

**Typical systems.**
- **Desktop:** 12 columns, 24-32px gutters, margins 40-80px.
- **Tablet:** 8-12 columns.
- **Mobile:** 4 columns, 16px gutters, 16-20px margins.
- **Ultra-wide:** cap the container at 1280-1440px so line lengths stay readable; generous side margins beyond.

**Why 12.** Divides by 2, 3, 4, 6. Easy halves, thirds, quarters.

**Spanning.** A card spans 3 columns (one quarter on 12-col). A sidebar is 3-4, main is 8-9. Media gallery is 4 x 3-col cards.

**Responsive.** Grids collapse: 12 → 8 → 4. Items reflow or stack.

**Figma / design tool tip.** Set grid styles for each breakpoint and apply consistently. Audit: if three designers work on three screens, all three should fit the same grid.

## 4. Baseline grids

Vertical rhythm for type. A baseline grid sets a consistent line height increment (e.g. 4px or 8px) that all text baselines should snap to.

**Practice.** Body text at 16px / 24px line height → baseline step is 8px. Every heading and spacing value multiples of 8 so text remains aligned across columns.

**Modern reality.** Baseline grids are hard in web CSS (line-boxes don't expose baseline alignment easily) and expensive in engineering time. Many systems approximate with strict spacing + leading rather than true baseline snapping. Design tools (Figma) show baselines; ship is "close enough" usually.

**When it matters most.** Editorial design, multi-column text layouts, data-dense UIs side-by-side.

## 5. Alignment

**Rule.** Every element aligns to something. Rogue positions are visible and look sloppy.

**Types.**
- **Edge alignment** (left, right, top, bottom). Most UI uses left-alignment for text in LTR.
- **Center alignment.** For short display text, modals, empty states. Not for body paragraphs - ragged left is fatiguing.
- **Optical alignment.** Sometimes the math-aligned is wrong. Round shapes may need nudging; Chevron icons in a button often need +0.5 or +1px shift right. Trust the eye.

**Principles.**
- Pick one alignment per block and stick with it.
- Mixed alignments (left label, right value in a row) are fine as a pattern; use consistently.
- Text hierarchy usually left-aligns; numbers right-align; currency symbols attach to numbers.

## 6. Breakpoints and responsive

**Common breakpoints.**
- Mobile: 320-480
- Large mobile: 481-640
- Tablet: 641-1024
- Desktop: 1025-1440
- Large desktop: 1441+

**Mobile-first.** Design and code the smallest first; add columns/complexity as space allows. Catches content hierarchy weaknesses that desktop layouts hide.

**Don't design for fixed devices.** Design for ranges. Content should reflow, not snap to one or two sizes.

**Adaptive vs responsive.**
- **Responsive** - continuous, fluid across all sizes.
- **Adaptive** - distinct layouts at specific breakpoints.
- Most modern sites are hybrid.

**Container queries** (modern CSS) let components respond to their parent's size, not just viewport. Powerful for design systems where one card component lives in many contexts.

## 7. Density and compositions

Density = information per square inch. Choose based on audience and context:

- **Luxury brand site:** low density, big whitespace.
- **Consumer app:** medium density, comfortable spacing.
- **Professional dashboard:** high density, tight spacing.
- **Trading terminal:** maximal density, all-over grid of modules.

**Compositions.**
- **Z-pattern.** Eye moves top-left → top-right → diagonal → bottom. Works for marketing hero sections.
- **F-pattern.** Eye moves across top, down slightly, across again, then down left side. Natural for content-heavy pages (search results, articles).
- **Rule of thirds.** Split canvas into 3x3. Place focal points on intersections.
- **Golden ratio layouts.** ~61.8/38.2 split - feels balanced without being symmetric.
- **Asymmetric.** Strong focal point plus breathing room. Modern editorial.

## 8. Fluid vs fixed

- **Fixed-width container** (e.g. max-width 1200px centered) - predictable typography, easier design.
- **Fluid** (always 100% of viewport) - uses space better on large screens, but line lengths can get long.
- **Hybrid** - fluid with max-width cap at ~1280-1440px. Standard modern approach.

**Content width.** For prose, cap at ~65ch or ~720px. For UI, cap at 1200-1440px.

## 9. Container and layout patterns

**Foundational primitives (Every Layout / Heydon Pickering).**
- **Stack** - vertical, even spacing.
- **Cluster** - horizontal group, wraps.
- **Sidebar** - main + side, collapses on small.
- **Switcher** - side-by-side that switches to stacked below threshold.
- **Cover** - hero that fills viewport height.
- **Frame** - aspect-ratio-locked (media).
- **Reel** - horizontal scrolling row (cards).
- **Grid** - auto-fit/auto-fill flex grid.
- **Center** - centered content with max-width.

These compose into any product layout. Teaching juniors these primitives is faster than teaching dozens of one-off layouts.

**App shell patterns.**
- Global nav (top or side) + content area.
- Multi-pane (list + detail, list + detail + inspector).
- Full-bleed content (media players, maps).
- Dashboard (grid of modules, often with drag-to-rearrange).

**Form layout.**
- Single column for most forms (eye travel is linear; fewer scanning errors).
- Two-column only for pairs that are conceptually twinned (first/last name, city/state/zip).
- Label above input is most forgiving; label left works for dense enterprise.

## 10. Common layout mistakes

- Using non-scale values (11px, 23px, 37px) because "it looked right in that moment." Scale discipline compounds.
- Inconsistent padding within one component across states.
- Everything fills the viewport width - long line lengths on ultrawide screens.
- Mobile layout is just the desktop layout stacked - missed opportunity to reorder by priority.
- Buttons that stretch to full container width on desktop - visual weight way off.
- Gutters and margins confused with padding - the grid is about between-column gaps, not inside-component.
- Adaptive breakpoints too few (only 2) or too many (8) - 3-5 is usually right.
- Optical tweaks not documented - designers and engineers fight over "why is this 18 not 16."
