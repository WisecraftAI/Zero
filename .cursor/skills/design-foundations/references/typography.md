# Typography for Product Design

Typography is the invisible interface. Get it right and users feel calm, oriented, and in control. Get it wrong and the product feels "off" even if everything else is polished.

## Table of contents

1. Anatomy of type
2. Classifications
3. Choosing typefaces for product
4. Pairing typefaces
5. Type scale
6. Leading (line height)
7. Tracking and kerning
8. Measure (line length)
9. Hierarchy with type
10. Font-weight strategy
11. Numerals, punctuation, details
12. Variable fonts and fluid typography
13. Web performance
14. Common mistakes

---

## 1. Anatomy (quick tour)

- **Baseline** - the invisible line letters sit on.
- **x-height** - height of lowercase letters (no ascenders/descenders). Larger x-height = more legible at small sizes.
- **Cap height** - height of uppercase letters.
- **Ascender / descender** - the parts of `h` / `p` going above/below.
- **Counter** - enclosed negative space in letters like `o`, `e`, `a`.
- **Aperture** - opening in letters like `c`, `a`, `e`. Open apertures = better legibility.
- **Stroke contrast** - difference between thick and thin parts. High contrast reads worse small.
- **Optical sizes** - some fonts ship variants tuned for display vs text (wider apertures, less contrast for small).

## 2. Classifications

- **Serif** - strokes on terminals. Old Style (Garamond), Transitional (Baskerville), Modern (Didot), Slab (Rockwell). Often editorial, luxury, traditional.
- **Sans-serif** - no serifs. Humanist (Inter, Gill Sans, Open Sans), Grotesque (Helvetica, Akzidenz), Geometric (Futura, Avenir, Circular), Neo-grotesque (Helvetica Neue, Arial).
- **Display** - designed for large sizes; often decorative.
- **Monospace** - fixed-width. Code, tabular data, ticket numbers.
- **Script / handwritten** - branded accents only.

## 3. Choosing typefaces for product

**Defaults to start.** For a modern product UI, a humanist or neo-grotesque sans-serif at medium weight is almost always safe: Inter, SF Pro, Roboto, Segoe UI, IBM Plex Sans, Manrope, Söhne.

**What to check.**
- **Legibility at 14-16px.** Test body copy at small sizes. Humanist sans beats geometric here (Futura "l" looks like "I" at 13px; Inter's "l" has a tail).
- **Character set.** Does it cover your locales? Latin Extended, Cyrillic, Greek, Arabic, CJK. Some typefaces ship regional variants.
- **Weight range.** Minimum 3 (regular, medium, bold). Better: 9 (from Thin to Black).
- **Numerals.** Proportional (default, for text) and tabular (for tables, prices, timers). OpenType features: `tnum`, `lnum`, `onum`.
- **Italics.** Real italics, not mechanically slanted obliques.
- **Variable font version.** Huge performance and flexibility win.

**Licensing.** Free vs paid vs subscription. Google Fonts = free + easy CDN. Adobe Fonts, Monotype, foundries (Klim, Commercial Type, Colophon) for paid. Check whether the license covers apps (desktop, mobile) vs just web.

## 4. Pairing typefaces

**Pair purposefully.** Most products need 1 typeface, maybe 2. Three is rare and hard.

**Classic pair.**
- **Serif heading + sans body** - traditional, editorial feel.
- **Sans heading + serif body** - unconventional, friendly.
- **One family, two weights** - safe, clean, modern. Use Inter Regular for body, Inter SemiBold 700 for headings.

**Rules.**
- Contrast enough to tell apart, similar enough to harmonize (x-height match, era match).
- Don't pair two fonts from the same classification (two geometric sans) - too similar.
- Don't mix moods (rustic serif + technical mono + bubbly display). Choose a voice.

**Mono as a 3rd.** Frequently justified for code, tables, numerical UI. JetBrains Mono, IBM Plex Mono, SF Mono, Iosevka.

## 5. Type scale

A **modular type scale** grows by a ratio. Ratios:

- 1.125 (Major Second) - subtle, for dense UI.
- 1.2 (Minor Third) - common for web UI.
- 1.25 (Major Third) - punchy.
- 1.333 (Perfect Fourth) - marketing sites.
- 1.5 (Perfect Fifth) - editorial, strong hierarchy.
- 1.618 (Golden Ratio) - dramatic, display-heavy.

**Starting scale (1.25 ratio, 16px base):**

| Role | Size | Weight |
|---|---|---|
| Caption / overline | 12 | 500 |
| Small / footnote | 13 | 400 |
| Body | 16 | 400 |
| Body emphasis | 16 | 600 |
| Subheading | 20 | 500 |
| H5 | 20 | 600 |
| H4 | 24 | 600 |
| H3 | 30 | 600 |
| H2 | 38 | 600 |
| H1 | 48 | 700 |
| Display | 60+ | 700 |

**Fewer steps, used consistently** beats many steps, used ad hoc. Aim for 6-8 steps.

**Responsive.** Scale drops on smaller screens - display sizes don't work on 320px. Fluid typography using CSS `clamp()` smooths the transition.

## 6. Leading (line height)

Leading is the space between lines, measured baseline to baseline. Critical for reading.

**Starting values.**
- Body text: 1.4-1.6x the font size. 16px body → 24-26px line height.
- Headings: 1.1-1.25x. Tighter as size increases.
- Display: 1.0-1.1x.
- UI labels, buttons: 1.0-1.2x (single line).

Rule of thumb: the larger the type, the tighter the leading (proportionally).

**Too tight** = rivers, eye fatigue, feel cramped.
**Too loose** = paragraphs disintegrate into stranded lines.

## 7. Tracking and kerning

- **Tracking** is uniform spacing across a word or line.
- **Kerning** is pair-specific (AV, To, Wo).

**Default tracking** is usually right for body. Consider:
- **Loosen** (+1 to +5%) small all-caps labels - they read better with air.
- **Tighten** (-1 to -3%) display headings - removes awkward gaps at large size.
- **Never tighten** body text for aesthetics - hurts legibility.

## 8. Measure (line length)

**45-75 characters per line** is the comfortable reading range. Under 45 = choppy; over 85 = eye-tracking fatigue (brain loses the line).

- Body paragraphs: aim 60-75 CPL on desktop, 40-55 on mobile.
- Tabular data: no rule - content-driven.
- Buttons: 1-4 words max.

CSS: `max-width: 65ch` is a useful default on body prose.

## 9. Hierarchy with type

Beyond size, tools:

- **Weight.** 400 body, 600 subhead, 700 heading.
- **Color / value.** Primary text darker, secondary lighter, tertiary lightest. 3 levels usually enough.
- **Style.** Italics for emphasis, monospace for code/identifiers, all-caps with tracking for category labels.
- **Space.** More space above a heading than below (heading belongs to the content below it).

**Rule.** Hierarchy should be obvious from a distance. Squint test. If everything looks like body, the hierarchy is too flat; if you see only headings, it's too punchy.

## 10. Font-weight strategy

A simple, robust weight system:

- **Regular (400)** - body.
- **Medium (500)** - labels, buttons, minor emphasis.
- **Semibold (600)** - subheadings, links.
- **Bold (700)** - headings, strong emphasis.

You rarely need more. Thin/Light can look elegant but is hard to read at small sizes and fails at low contrast. Black weights read "shouty" in UI.

## 11. Numerals, punctuation, details

- **Tabular figures** (`font-variant-numeric: tabular-nums`) for any column of numbers, timers, countdowns.
- **Lining vs old-style figures** - lining sits uniform (best for UI and tables); old-style has ascenders/descenders (editorial body text).
- **Proper punctuation.** Curly quotes `' "`, not straight. Em dashes `—` for interruptions. En dashes `–` for ranges (2024–2026). Ellipses `…` as a single character. Non-breaking spaces ` ` in "100 km" to prevent line breaks.
- **Ligatures** for common pairs (fi, fl) - default on in most modern fonts.
- **Small caps** for acronyms in running text, if your typeface has them.

## 12. Variable fonts and fluid typography

**Variable fonts** ship a single file with axes (weight, width, optical size, slant). Smaller download, any weight you want, smooth interpolation. Inter, Roboto Flex, Source Sans 3 are notable.

**Fluid typography** scales font size with viewport:

```css
font-size: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
```

Caps size at small and large, smooth in between. Reduces manual breakpoints.

## 13. Web performance

- **Host fonts yourself** or use a reliable CDN. Variable fonts save 50-70% bandwidth vs multiple files.
- **`font-display: swap`** - show fallback first, swap when loaded. Avoids invisible text.
- **Preload hero fonts.** `<link rel="preload" as="font" ...>`.
- **Fallback stacks.** System fonts as a first fallback are fast and look decent:
  ```css
  font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  ```
- **Subset fonts** to only the glyphs you use if file size matters.
- **Limit weights.** Every weight is a file. Pick 3-4.

## 14. Common mistakes

- Too many typefaces. One or two.
- Too many sizes. 6-8 steps.
- Body too small (under 14-16px) or line height too tight (1.2x).
- Justified body text - rivers and awkward spaces.
- All caps for body - 10-15% slower to read.
- Placeholder text as label - disappears on focus.
- Thin weights on colored backgrounds - poor contrast.
- Mismatched numerals in tables (proportional when tabular is needed).
- Using `px` for everything without `rem` fallback for user font-size preferences.
- Ignoring vertical rhythm - body, gap, body, gap should feel metronomic.
