# Accessibility

Inclusive design is not an add-on. Roughly 15-20% of users have a disability (WHO). Millions more have temporary or situational impairments (one-hand use, bright sun, baby asleep). Accessibility improvements benefit everyone - curb cuts, captions, voice interfaces.

Minimum bar: **WCAG 2.2 AA**. Aim for AAA where practical.

## Table of contents

1. The four principles (POUR)
2. WCAG levels and key criteria
3. Color and contrast
4. Typography and readability
5. Focus, keyboard, and input
6. Screen readers and semantics
7. Motion, animation, and autoplay
8. Forms and errors
9. Touch targets
10. Cognitive accessibility
11. Assistive tech landscape
12. Auditing and testing

---

## 1. POUR - The four principles

Every WCAG criterion ladders to one of:

- **Perceivable.** Users can perceive the information (contrast, text alternatives, captions).
- **Operable.** Users can operate the interface (keyboard, sufficient time, no seizures).
- **Understandable.** Content and UI are understandable (readable, predictable, input assistance).
- **Robust.** Content works with assistive tech, now and future (valid markup, ARIA where needed).

## 2. WCAG levels

- **A** - minimum, essential. Ignoring is legal liability.
- **AA** - industry standard. Required by most legislation (US Section 508, EU EN 301 549, Accessibility for Ontarians, etc.).
- **AAA** - best possible. Not required or expected on all content, but hit where you can.

### Criteria you must internalize

- **1.1.1 Non-text content.** Images have alt text.
- **1.3.1 Info and relationships.** Semantic structure (headings, lists, landmarks).
- **1.4.3 Contrast (minimum).** 4.5:1 for normal text, 3:1 for large (18pt / 14pt bold+).
- **1.4.11 Non-text contrast.** 3:1 for UI components and graphics.
- **2.1.1 Keyboard.** Everything operable without a mouse.
- **2.1.2 No keyboard trap.** You can always tab out.
- **2.4.3 Focus order.** Logical sequence.
- **2.4.7 Focus visible.** Always.
- **2.5.5 Target size (AAA in 2.1, AA in 2.2).** 24x24 CSS pixels minimum.
- **3.3.1 Error identification.** Errors programmatically detectable.
- **3.3.3 Error suggestion.** Suggest fixes.
- **4.1.2 Name, role, value.** All UI has proper role and accessible name.

## 3. Color and contrast

**Contrast ratios.**
- Body text: **4.5:1** min (AA), 7:1 (AAA)
- Large text (18pt+ / 24px+ or 14pt+ bold / 19px+ bold): **3:1** min (AA), 4.5:1 (AAA)
- UI components, icons, focus indicators, graphical objects: **3:1** (AA)
- Placeholder text: treated as normal text (this is often missed)

**Tools.** Stark (Figma), Contrast (Mac), Colour Contrast Analyser (TPGi), WebAIM Contrast Checker.

**Don't rely on color alone.** Red = error must also carry an icon, label, or pattern. Roughly 8% of men and 0.5% of women have some form of color vision deficiency.

**Dark mode pitfalls.** Pure white on pure black causes halation (shimmer) for astigmatism. Soften both: `#E6E6E6` on `#0F0F10` ish. Reduce saturation in dark mode - vivid colors vibrate.

**Semantic color.** Red for errors, green for success, yellow/orange for warnings, blue for info - but always with redundant cue. Blue on blue water-skis: never convey state with color shifts alone.

## 4. Typography and readability

- **Size.** 16px minimum for body; smaller only for rarely-read labels.
- **Line length.** 45-75 characters per line is the reading sweet spot. Wider lines tire the eye (tracking back).
- **Line height.** 1.4-1.6 for body. Tighter feels premium but fights dyslexia.
- **Letter spacing.** Default for body. Tight for display only.
- **Avoid justified text** in long blocks - rivers of whitespace plus bad word spacing.
- **Avoid all-caps for body text** - it's 10-15% slower to read. Fine for short labels.
- **Font choice.** Prefer humanist sans-serifs for UI (Inter, SF Pro, Roboto, Segoe UI). Atkinson Hyperlegible and OpenDyslexic are designed for visual impairments.
- **User-scalable text.** Don't block zoom. Honor `prefers-reduced-motion`, `prefers-color-scheme`, and system font scaling (iOS Dynamic Type, Android font scale).

## 5. Focus, keyboard, and input

**Every interactive element must be keyboard-accessible.** Tab, Shift+Tab, Enter, Space, Esc, arrow keys. Custom components need explicit keyboard handling.

**Focus indicator.** Always visible. 2-3px outline, 3:1 contrast with adjacent colors. Don't rely on the browser's default on buttons you've restyled. Use `:focus-visible` to avoid showing focus on mouse click but always on keyboard nav.

**Focus order.** Visual order = DOM order. Modals trap focus; closing returns focus to the trigger.

**Skip links.** "Skip to main content" as first focusable element, revealed on focus.

**Don't remove focus outlines without replacement.** `outline: none` without `:focus-visible` is one of the most common accessibility sins.

## 6. Screen readers and semantics

**Use semantic HTML.** `<button>`, `<nav>`, `<main>`, `<h1>`-`<h6>`, `<ul>`, `<table>`. The platform does enormous amounts of a11y work for free when you use the right element.

**ARIA is a last resort.** First rule of ARIA: don't use ARIA if semantic HTML can do the job. `role="button"` on a `<div>` is a smell.

**Landmarks.** `<header>`, `<nav>`, `<main>`, `<aside>`, `<footer>`. Screen reader users navigate by them.

**Headings.** Hierarchical (no skipping levels), one `<h1>` per page typically, describe the section.

**Accessible names.**
- Buttons: visible text wins. Icon-only buttons need `aria-label`.
- Form fields: `<label>` associated with input.
- Images: meaningful `alt`. Decorative images: `alt=""` (empty, not omitted).

**Live regions.** `aria-live="polite"` for status updates (save confirmations, toast). `assertive` sparingly (errors that block).

**Testing.** VoiceOver (Mac/iOS), NVDA (Windows, free), TalkBack (Android), JAWS (Windows, paid). Test with the screen reader, not just automated tools.

## 7. Motion, animation, and autoplay

- **Respect `prefers-reduced-motion`.** Swap parallax, auto-scrolling carousels, and complex page transitions for fades or cuts.
- **No flashes above 3Hz** - seizure risk.
- **Autoplay video/audio** - avoid. At minimum, start muted, provide obvious pause.
- **Micro-interactions.** Under 400ms, under 200ms is safer.
- **Essential motion.** If motion conveys information (e.g. stock line going up), provide an alternate representation.

## 8. Forms and errors

- **Label every field** (visibly; `placeholder` is not a label - it disappears).
- **Group related fields** with `<fieldset>` and `<legend>`.
- **Validate inline** after blur, not on every keystroke (except for length counters and strong passwords).
- **Error messages.** Appear near the field, start with what happened, suggest a fix. Don't rely on color alone - use an icon and text.
- **Required fields.** Mark with text, not just asterisks (or explain the asterisk).
- **Autocomplete.** Use `autocomplete="email"`, `autocomplete="tel"`, `autocomplete="street-address"` etc. Huge quality-of-life boost.
- **Error summary at top** for long forms - linked to the offending fields.

## 9. Touch targets

- **44x44pt** (Apple HIG), **48x48dp** (Material), **24x24 CSS px** (WCAG 2.2 AA minimum with spacing exceptions).
- Spacing between adjacent targets prevents mis-taps.
- Tappable area can be larger than visual via padding/hit-box expansion.

## 10. Cognitive accessibility

Often overlooked. Covers: dyslexia, ADHD, autism, memory impairments, cognitive load from tiredness or stress.

- **Plain language.** 8th-grade reading level for most consumer UI. Hemingway App, readability scores.
- **Short sentences.** One idea per sentence.
- **Predictable patterns.** Same action, same place.
- **No surprises.** Warn before destructive actions, changes in context (opening new windows, auto-redirects).
- **Timeouts.** Warn before session expiry; allow extension.
- **Progress indicators.** For multi-step flows.
- **Summaries.** Jargon glossaries, TL;DRs.

## 11. Assistive tech landscape

- **Screen readers** - VoiceOver, NVDA, JAWS, TalkBack.
- **Screen magnifiers** - ZoomText, macOS Zoom.
- **Switch controls** - single-switch, dual-switch scanning. Respect keyboard accessibility and logical focus order.
- **Voice control** - Voice Control (iOS/macOS), Dragon. Requires clear, consistent accessible names.
- **Eye tracking** - needs generous target sizes and dwell-click friendly UI.
- **High-contrast mode** - Windows High Contrast, macOS Increase Contrast. Don't bake text into images; respect system colors.

## 12. Auditing and testing

**Automated (catches ~30%).**
- axe DevTools, WAVE, Lighthouse, Stark.
- Run on every build. Linters for JSX (eslint-plugin-jsx-a11y).

**Manual.**
- Keyboard-only walkthrough of every flow.
- Screen reader walkthrough.
- 200% zoom test.
- Color-blind simulation (Chrome DevTools has this).
- Reading level check.

**With real users.**
- Include people with disabilities in usability testing. Agencies: Fable, Access Works, Applause. Your best source of truth.

**Compliance ≠ usability.** A site can pass WCAG and still be unusable. Test with humans.
