# UI Design Principles

The visual craft. How to make a screen read clearly, feel balanced, and communicate hierarchy without relying on color or decoration.

## Table of contents

1. The classic principles (CRAP+)
2. Visual hierarchy
3. Balance, tension, and composition
4. Whitespace / negative space
5. Scale and proportion
6. Rhythm and repetition
7. Density and information design
8. Affordance and signifiers
9. Skeuomorphism vs flat vs neumorphism vs material
10. States and feedback
11. Visual consistency
12. Emotional design (Norman's three levels)

---

## 1. CRAP+ - The core four (plus)

Robin Williams's mnemonic, expanded:

- **Contrast** - different things should look different.
- **Repetition** - repeat visual elements to unify.
- **Alignment** - nothing should be placed arbitrarily; every element has a visual connection.
- **Proximity** - related items grouped together.

Plus:
- **Hierarchy** - clear primary, secondary, tertiary.
- **Balance** - visual weight distributed with intention.

If a design feels off, check these six first. 90% of critique reduces to one of them.

## 2. Visual hierarchy

Hierarchy is the answer to "where do I look first?" Every screen must answer this clearly.

**Tools that create hierarchy (ranked by strength):**

1. **Size.** Biggest = most important. Page title >> section header >> body.
2. **Weight.** Bold draws the eye. Use sparingly.
3. **Color and value.** High-contrast elements pop; low-contrast recedes. A single accent color is more powerful than ten.
4. **Position.** Top and left read first in LTR layouts. Above the fold matters.
5. **Whitespace.** Isolation is hierarchy - an element alone shouts.
6. **Type style.** Serif vs sans, italics, uppercase - all signal difference.
7. **Imagery.** Faces and motion capture attention first.

**Rule of thumb.** One primary action per screen. Two secondary at most. Everything else tertiary or ambient. If you have two "primary" buttons, you have zero.

**Test.** Squint at the design. What do you see? If the hierarchy isn't obvious blurred, it isn't working.

## 3. Balance, tension, and composition

**Symmetrical balance.** Formal, calm, trustworthy. Good for enterprise, banking, institutional.

**Asymmetrical balance.** Dynamic, modern, energetic. Offset by visual weight - a large element on one side balanced by negative space or smaller elements on the other.

**Radial balance.** Elements arranged around a center. Dashboards, watch faces.

**Visual weight comes from:** size, color saturation, contrast, density, complexity, faces and eyes.

**Golden ratio (1.618) and rule of thirds.** Useful starting proportions, but not sacred. Grids and intentional spacing serve most UI work better than golden-ratio geometry.

**Tension** is intentional imbalance - good designers create and resolve it. A too-balanced layout feels static.

## 4. Whitespace / negative space

Whitespace is not empty. It's an active design element.

**Two kinds.**
- **Macro whitespace** - between major blocks. Creates breathing room, establishes hierarchy.
- **Micro whitespace** - between lines, letters, buttons. Affects legibility and perceived quality.

**Effects of increasing whitespace:**
- Perceived quality and luxury increase.
- Reading comprehension improves.
- Focus sharpens.
- Density drops (not always desired - dashboards need density).

**Common mistake.** Cramming to fit "above the fold." Users will scroll. Above the fold matters for the first impression, not for putting everything everywhere.

## 5. Scale and proportion

**Type scale** - see `typography.md`. Geometric growth (1.125, 1.25, 1.333, 1.5, 1.618) reads more evenly stepped than arithmetic.

**Spacing scale** - see `layout-grids.md`. Typically a 4pt or 8pt base.

**Proportion** within a component: image-to-text ratio in cards, icon size relative to label, padding relative to content.

**Optical adjustments.** The math says 24px but the eye says 23. Large numerals often need to be slightly smaller than their cap height would suggest. Perfectly centered is often optically off (centered letters vs centered letter-forms). Trust your eye over the measurement, within reason.

## 6. Rhythm and repetition

**Rhythm** is consistent spacing that creates visual cadence. Baseline grids, consistent margins, repeating card sizes.

**Repetition** unifies: same button style everywhere, same card shape, same corner radius, same icon stroke weight. A design system is rhythm and repetition at scale.

**Break the rhythm intentionally** for emphasis - a larger card, a different background, an illustration - to call attention. Rare breaks stand out; frequent ones just look chaotic.

## 7. Density and information design

**Low density** (lots of whitespace) - marketing, consumer apps, showcase.

**Medium density** - most product UI.

**High density** - dashboards, trading, professional tools. Edward Tufte's rules: high data-ink ratio, minimize chartjunk, small multiples, sparklines.

**Signal vs noise.** Every pixel should carry information or structure. Decoration without function = noise.

**Tables.** The default is too spacious or too tight. 40-48px row height for comfortable, 32-36px for dense. Align numbers right, text left. Tabular numerals (monospaced digits) for columns. Headers styled differently but not overpowering.

## 8. Affordance and signifiers

**Affordance** (Gibson, Norman) - the action a thing allows. A button *affords* pressing.

**Signifier** - the perceivable cue that indicates the affordance. Buttons have shadows, borders, color contrast - signifiers that say "click me."

Flat design stripped signifiers in the 2010s and usability suffered (Norman railed against this). Modern design adds them back subtly: a subtle shadow, a hover state, a cursor change, a fill change.

**Rule.** Interactive things must look interactive. Non-interactive things must not. Underlined text = link. Boxed text with subtle depth = button. Plain text = read-only.

**Hover states** reveal affordance on desktop; not available on touch. On touch, affordance must be visible at rest.

## 9. Visual styles

- **Skeuomorphism.** UI resembles real-world objects (iOS 6 and earlier). Helped transition users to touch; now mostly dated, but survives in audio apps (knobs, meters) and gaming.
- **Flat design.** Minimal shadows and gradients. Emphasizes content; sometimes too minimal for signifiers.
- **Material Design (Google).** Flat + paper metaphor + motion + elevation. Works well at scale.
- **Neumorphism.** Soft shadows, inset/outset looks. Trendy 2020; largely failed accessibility (contrast).
- **Glassmorphism.** Frosted glass, transparency. Use sparingly and watch contrast.
- **Claymorphism, Brutalism, Bento.** Style cycles. Borrow judiciously.

Senior take: pick a style that serves the content and audience, not the trend. Consumer luxury goods lean editorial and minimal; developer tools lean information-dense; children's apps lean playful and skeuomorphic.

## 10. States

Every interactive component has states. Senior designers draw them all:

- **Default / resting**
- **Hover** (desktop)
- **Focus** (keyboard; accessibility-critical)
- **Active / pressed**
- **Selected**
- **Disabled**
- **Loading**
- **Error**
- **Read-only**

For pages and views:

- **Empty state** (first use, no data) - teach and prompt next action.
- **Loading state** - skeletons > spinners for known layouts.
- **Error state** - recover, don't just report.
- **Partial / degraded state** - some data loaded, some failed.
- **Success state** - acknowledge and next-step.

Missing states is the #1 reason designs "fall apart in production."

## 11. Visual consistency

**Internal.** Same patterns used the same way across your product.

**External.** Match platform and ecosystem conventions where it doesn't hurt brand.

**Consistency vocabulary.** Shared vocabulary and definitions across design, engineering, content: what's a "drawer" vs "panel," a "toast" vs "snackbar."

**Known pattern library.** Modal, drawer, popover, toast, banner, tooltip, toolbar, nav, tabs, segmented control, accordion, pagination, breadcrumb, stepper, chip, tag, badge, card, list, table, form field, picker, slider, switch, radio, checkbox, date picker, search, menu, context menu, dropdown.

Pick your vocabulary and stick to it. Document when each is used.

## 12. Emotional design (Norman)

Three levels:

- **Visceral.** Gut reaction - color, imagery, polish. The first second.
- **Behavioral.** Pleasure of use - smooth interactions, satisfying feedback, capable.
- **Reflective.** Story you tell about the product - identity, status, meaning.

Different products lead with different levels. Luxury brands play visceral and reflective. Productivity tools win on behavioral. Games play all three.

Delight should reinforce function, not replace it. A cute empty state that doesn't teach the next action is style without substance.
