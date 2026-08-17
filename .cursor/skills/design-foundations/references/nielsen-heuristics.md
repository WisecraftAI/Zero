# Nielsen's 10 Usability Heuristics

Jakob Nielsen's general principles for interaction design, updated in 2020. Use for heuristic evaluation, critique, and as a vocabulary for naming what feels off.

For each heuristic: the principle, plain-language restatement, concrete examples of violations, and how to fix.

---

## 1. Visibility of system status

**Principle.** The system should always keep users informed about what's going on, through appropriate feedback within reasonable time.

**Examples of violation.** Tapping a button and nothing happens; a file upload with no progress; a form submission with no confirmation; a loading spinner that never resolves.

**Fix.** Show loading states, progress, optimistic UI updates, success confirmations, current location (breadcrumbs, selected nav state), form validation inline, unsaved-changes indicators.

## 2. Match between system and the real world

**Principle.** Speak the users' language. Follow real-world conventions; make information appear in natural order.

**Examples of violation.** "HTTP 500" instead of "something went wrong on our end"; shopping cart that calls itself "basket" to a US audience inconsistently; date formats like YYYY-MM-DD for non-technical users; icons that mean different things in different cultures (owl = wisdom in the US, stupidity in parts of India).

**Fix.** Use familiar terminology from the user's world. Test copy with real users. Localize thoughtfully - language, dates, currency, name order, reading direction.

## 3. User control and freedom

**Principle.** Users make mistakes. Provide clearly marked "emergency exits" - undo and redo, cancel, back.

**Examples of violation.** No undo after destructive action; forms that don't let you go back without losing data; modal with no clear close; wizards that can't be exited mid-flow; irreversible actions with no confirmation.

**Fix.** Always provide a way out. Undo over confirmations where possible (Gmail's "Undo Send" is the canonical example). Clear exit paths from every state. Save drafts automatically.

## 4. Consistency and standards

**Principle.** Users should not wonder whether different words, situations, or actions mean the same thing. Follow platform and industry conventions.

**Examples of violation.** "Edit" in one place, "Modify" in another; primary button on left in one flow, right in the next; different date pickers on different pages; custom controls that look like stock ones but behave differently.

**Fix.** Design systems with named components, shared language, and clear rules. Audit UI language. Follow platform conventions (iOS HIG, Material, Fluent) unless there's a specific reason not to.

## 5. Error prevention

**Principle.** Better than good error messages is a careful design that prevents a problem from occurring. Eliminate error-prone conditions or check for them and present a confirmation option.

**Examples of violation.** Free-text date fields; no input masks; sending destructive action without confirmation; allowing incompatible selections.

**Fix.** Constrain input to valid choices (date picker vs text). Use dropdowns and defaults. Disable buttons until valid. Confirm destructive or irreversible actions. Warn before leaving unsaved changes. Use forgiving formats (Postel).

## 6. Recognition rather than recall

**Principle.** Minimize memory load. Make objects, actions, and options visible. Users should not have to remember information from one part of the dialogue to another.

**Examples of violation.** Entering info on step 1 that you have to remember for step 3; command-line style interfaces for non-expert users; bury options in settings nobody finds.

**Fix.** Show, don't hide. Autocomplete, recent items, visible selected state, persistent summaries, tooltips and help text inline. "As you type" suggestions.

## 7. Flexibility and efficiency of use

**Principle.** Accelerators - unseen by the novice user - may speed up interaction for the expert. Allow users to tailor frequent actions.

**Examples of violation.** No keyboard shortcuts; no bulk actions; no saved views or presets; power users forced through the same clicks every time.

**Fix.** Keyboard shortcuts with discoverable cues (tooltips showing key), bulk selection and actions, saved filters, custom dashboards, slash commands, quick-access toolbars, recent/favorites.

## 8. Aesthetic and minimalist design

**Principle.** Dialogues should not contain information which is irrelevant or rarely needed. Every extra unit competes with the relevant units.

**Note.** "Minimalist" does not mean sparse or trendy. It means no *unnecessary* information. A dense medical chart is minimalist if every element is needed.

**Examples of violation.** Decoration that doesn't carry information; marketing copy in functional UI; too many fonts, colors, icon styles; over-sized illustrations pushing content below fold.

**Fix.** Every element earns its place. Progressive disclosure for rarely-used controls. Clear hierarchy. Whitespace as a tool.

## 9. Help users recognize, diagnose, and recover from errors

**Principle.** Error messages should be expressed in plain language (no codes), precisely indicate the problem, and constructively suggest a solution.

**Examples of violation.** "Error 0x80070005"; "Something went wrong"; "Invalid input"; red border with no explanation; error at bottom of form when field is at top.

**Fix.** Errors should (a) identify what went wrong, (b) explain why in the user's language, (c) suggest a fix, (d) appear inline near the relevant field. Tone: not blaming. "We didn't recognize that email" not "Invalid email."

## 10. Help and documentation

**Principle.** Even though it is better if the system can be used without documentation, it may be necessary to provide help. Such information should be easy to search, focused on the user's task, and list concrete steps.

**Examples of violation.** Help buried in a support portal; generic FAQ that doesn't match the page you're on; product tours that don't let you skip.

**Fix.** Contextual help (tooltips, ? icons, inline hints). In-product search of docs. Empty states that teach. Onboarding that's skippable and resumable. Chat or email escape hatch for the stuck.

---

## Running a heuristic evaluation

**Prep.** Define the scope: which flows, on which platforms, for which persona.

**Per evaluator.** Ideally 3-5 evaluators - each catches different things (Nielsen found diminishing returns after 5).

**Process.**
1. First pass: explore freely, get familiar with the product.
2. Second pass: go screen by screen or flow by flow, noting violations against each of the 10 heuristics.
3. For each issue: describe it, cite the heuristic(s), rate severity (0-4 cosmetic to catastrophic), propose a fix.

**Severity scale (Nielsen).**
- 0: Not a problem.
- 1: Cosmetic.
- 2: Minor usability problem.
- 3: Major usability problem - high priority.
- 4: Usability catastrophe - must be fixed.

**Output.** A ranked list by severity, with screenshots and recommendations. Not just findings - prioritized action.

See `assets/heuristic-evaluation-template.md` for a worksheet.
