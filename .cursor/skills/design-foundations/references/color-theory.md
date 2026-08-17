# Color Theory for Product Design

Color does four jobs in UI: it carries **brand**, establishes **hierarchy**, signals **state** (semantic), and structures **space** (surface, elevation). Each job has rules. Mixing them up is the most common cause of "my palette isn't working."

## Table of contents

1. Color models (RGB, HSL, LCH, OKLCH)
2. Color harmony
3. The four jobs of color in UI
4. Semantic color
5. Building a product palette
6. Surfaces and elevation
7. Dark mode
8. Contrast and accessibility
9. Color for data viz
10. Brand vs functional color
11. Common mistakes

---

## 1. Color models

- **RGB / HEX.** Device-oriented. Not human-readable. `#F8A23B` - is that warm or cool? Who knows.
- **HSL / HSV.** Hue, saturation, lightness. Human-friendly, but uneven perceptually - `hsl(60, 100%, 50%)` yellow looks much lighter than `hsl(240, 100%, 50%)` blue despite same lightness value.
- **LCH / OKLCH.** Perceptually uniform. Two colors with the same L value actually look equally bright. Modern standard; supported in CSS. `oklch(0.7 0.18 145)` - lightness, chroma, hue.

**Senior move.** Define your palette in OKLCH for perceptual predictability. Generate HEX or RGB for legacy consumers.

## 2. Color harmony

Classical relationships on the color wheel:

- **Monochromatic** - one hue, variations in saturation/lightness. Safe, calm, can feel boring.
- **Analogous** - neighboring hues (e.g. blue, teal, green). Harmonious, serene.
- **Complementary** - opposites (blue/orange, red/green). High contrast, vibrant; tiring in large doses.
- **Split-complementary** - a color plus the two adjacent to its complement. Contrast with less tension.
- **Triadic** - three hues evenly spaced. Balanced and vibrant.
- **Tetradic / square** - four hues evenly spaced. Hard to balance.

**In UI, harmony matters less than clarity.** A strict triadic palette with no neutral grays is unusable. Most product palettes are: one brand hue + a semantic set (success/warning/error/info) + a generous gray ramp + a few accents.

**The 60-30-10 rule.** 60% dominant (often neutral), 30% secondary, 10% accent. A starting heuristic, not a law.

## 3. The four jobs of color in UI

Name them explicitly in tokens - don't conflate.

| Job | Example tokens |
|---|---|
| Brand / expression | `color-brand-primary`, `color-brand-gradient-hero` |
| Hierarchy / emphasis | `color-text-primary`, `color-text-secondary`, `color-text-disabled` |
| Semantic / state | `color-success`, `color-warning`, `color-danger`, `color-info` |
| Surface / structure | `color-surface-1`, `color-surface-2`, `color-surface-overlay`, `color-border` |

The same blue can be a brand, a primary action, and an info state - if so, give it *different tokens* pointing at the same base color. Tokens express *intent*; when brand changes, you don't rewrite every usage.

## 4. Semantic color

Conventional meanings in Western / global tech contexts:

- **Green** - success, positive, go.
- **Red** - error, destructive, stop, danger.
- **Yellow / amber** - warning, caution.
- **Blue** - information, neutral action, trust.

**Pitfalls.**
- Red/green is the most common color vision deficiency - never convey state by color alone. Use icons, labels, or patterns.
- In finance, red = negative (US) but red = positive (China, Japan). Localize or allow user preference.
- Don't hijack semantic colors for brand. If your brand is red, your error state needs to look clearly different (more saturated, paired with an alert icon, or shifted hue).

**State color needs shades.** For a red error, you usually need: background (softest), border (mid), fill/icon (strong), text on-background (highest contrast). Five or so steps.

## 5. Building a product palette

A sound product palette has:

**1. A neutral ramp.** 10-12 steps of gray from white/near-white to near-black. Slightly tinted grays (warm or cool) feel more intentional than pure grays. Steps should feel perceptually even (use OKLCH).

**2. A brand primary.** One color, with a ramp of 9-11 steps from very light tint to very dark shade. Name them numerically: `blue-50, blue-100 … blue-900`.

**3. Semantic colors.** Success (green), warning (amber), danger (red), info (blue - can be the same as brand or a distinct blue). Each with its own ramp.

**4. Accents (optional).** A second brand hue for secondary actions, illustrations, highlights.

**5. Data viz palette (optional, distinct).** See section 9.

**Generating ramps.** Tools: Tailwind palette generator, Leonardo by Adobe, Radix UI colors, Material color system, HuePaint. Build with accessibility checks baked in.

**Naming options.**
- **Numeric** - `blue-500`. Agnostic, stable across brand changes. Recommended.
- **Semantic** - `primary-strong`. Clear intent, but brittle if brand changes.
- **Hybrid** - primitive numeric + semantic aliases: `color.primary = blue.600`. Best of both.

## 6. Surfaces and elevation

In a flat-ish modern UI, "elevation" is usually communicated through:

- Slightly lighter or darker surfaces (dark mode lightens higher layers; light mode whitens them).
- Soft shadows (in light mode).
- Borders (in dark mode, where shadows read poorly).

Material Design defines 5-6 elevation steps (0-24dp). You don't need that many - 3-5 is plenty: resting surface, raised (cards), overlay (menus/popovers), modal, tooltip.

Each elevation step is a token: `elevation-0` to `elevation-4`, paired with surface color and shadow.

## 7. Dark mode

Not just "invert the colors." Principles:

- **Pure black (#000) is rarely right.** Causes halation with astigmatism. Use `#0E1116` or similar - a deep neutral with slight blue tint.
- **Pure white (#FFF) text** on dark backgrounds is harsh. Use off-white `#E8EAED` ish.
- **Lower saturation** in dark mode. Bright reds/greens vibrate painfully.
- **Elevation reverses.** Higher layers are *lighter* in dark mode (closer to light source), *darker*-with-shadow in light mode.
- **Test real content** - photos and illustrations often need specific dark-mode variants.
- **Respect `prefers-color-scheme`** and provide a manual override.

**Build the palette once, surface twice.** Define semantic tokens (`color-text-primary`, `color-surface-1`) and map them to light and dark primitives. Components stay agnostic.

## 8. Contrast and accessibility

See `accessibility.md` for full WCAG rules.

**Quick rules.**
- Body text needs 4.5:1 against its background.
- Large text (18pt+ or 14pt+ bold) needs 3:1.
- UI components and focus indicators need 3:1.
- Placeholder text counts as text - 4.5:1.
- Don't rely on color alone to convey state.

**Common contrast failures:**
- Light gray `#9AA0A6` body text on white - fails.
- Brand-blue primary button with white text - check; some brand blues fail.
- Disabled states - WCAG doesn't require contrast for disabled controls, but making them too invisible is a UX problem.
- Placeholder grayed out - often fails.

## 9. Data visualization color

Different rules from UI color:

- **Qualitative** (categories) - distinct hues, roughly equal lightness. 6-8 max; beyond that, use a different encoding.
- **Sequential** (ordered, one-directional) - single hue, ramp from light to dark. E.g., light blue to dark blue.
- **Diverging** (negative / neutral / positive) - two hues through a neutral midpoint. E.g., red → white → blue.
- **Color-blind safe.** Viridis, ColorBrewer, Okabe-Ito palettes are designed for this.
- **Sort.** Order categories by data value, not alphabetically, in charts.
- **Don't use rainbow** (jet) palettes for sequential data - perceptually misleading (banded).

## 10. Brand vs functional color

**Brand color lives in:** hero areas, key illustrations, calls-to-action, badge, logo, key moments.

**Brand color does NOT own:** every button, every link, every icon. A UI painted entirely in the brand color is exhausting and destroys hierarchy.

**Rule.** Most of your UI is neutral. Color is a tool used deliberately to mean something - primary action, current selection, active state, alert.

## 11. Common mistakes

- Conflating brand, hierarchy, and semantic color into one system. Tokens save you.
- Picking a palette in HSL and wondering why some colors read much lighter than others. Use OKLCH.
- Using the same shade of gray for both text and borders - low hierarchy.
- Disabled states that look clickable (too dark) or invisible (too light).
- Gradients in UI where solid colors would be clearer. Gradients belong in hero art, not buttons.
- Five different shades of accent blue across the product. Consolidate.
- Dark mode by simple inversion. Build a real dark palette.
- Testing palette in Figma against the default gray canvas, then shipping onto a white background - looks different. Test on the real background.
