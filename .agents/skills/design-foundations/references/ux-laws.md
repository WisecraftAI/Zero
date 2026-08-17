# UX Laws and Cognitive Principles

These are the named laws and principles that senior designers quote by reflex. Each entry includes: what it says, why it's true, how to apply it, and when it bites.

## Table of contents

1. Hick's Law
2. Fitts's Law
3. Miller's Law
4. Jakob's Law
5. Tesler's Law (Law of Conservation of Complexity)
6. Postel's Law (Robustness Principle)
7. Doherty Threshold
8. Goal-Gradient Effect
9. Zeigarnik Effect
10. Serial Position Effect
11. Peak-End Rule
12. Von Restorff (Isolation) Effect
13. Law of Proximity (Gestalt)
14. Law of Similarity (Gestalt)
15. Law of Common Region (Gestalt)
16. Law of Continuity (Gestalt)
17. Law of Closure (Gestalt)
18. Law of Prägnanz (Gestalt)
19. Law of Uniform Connectedness (Gestalt)
20. Aesthetic-Usability Effect
21. Cognitive Load (Sweller)
22. Working Memory and Chunking
23. Recognition over Recall
24. Occam's Razor / Minimalism
25. Pareto Principle
26. Parkinson's Law
27. Flow (Csikszentmihalyi)
28. Weber-Fechner Law
29. Selective Attention / Inattentional Blindness
30. Banner Blindness

---

## 1. Hick's Law

**Statement.** The time to make a decision grows logarithmically with the number of equally-probable choices: T = b · log2(n+1).

**Why.** Each option costs cognitive effort to evaluate. Log, not linear, because humans prune and chunk.

**Apply.** Limit choices per decision point. Group related options. Use progressive disclosure. For navigation, prefer 5-7 top-level items. Use defaults and smart suggestions to collapse the decision.

**When it bites.** Over-applied, it leads to hidden features and "where is everything?" menus. Balance with discoverability (Fitts, visibility).

## 2. Fitts's Law

**Statement.** Time to acquire a target = a + b · log2(D/W + 1), where D is distance and W is target width.

**Why.** Motor control: smaller and farther targets are harder to hit.

**Apply.** Make primary actions large and near likely pointer/finger positions. Minimum touch target: 44x44pt (Apple HIG) / 48x48dp (Material). Place destructive actions far from confirms. Edges and corners have effectively infinite width on desktop (the cursor stops there) - use for global actions (Windows Start, Mac menu bar).

**When it bites.** "Make everything big" crowds the UI and fights hierarchy. Size by importance.

## 3. Miller's Law

**Statement.** The average person holds 7 ± 2 items in working memory.

**Caveat.** Miller's original paper was about channel capacity, not UI chunk limits. The practical takeaway survives: chunk information.

**Apply.** Group related fields (e.g., address block). Chunk phone numbers, card numbers, OTPs. Keep lists scanable; paginate or section long ones.

## 4. Jakob's Law

**Statement.** Users spend most of their time on other sites/apps. They prefer yours to work the same way.

**Apply.** Follow established patterns for core interactions (login, search, cart, navigation). Novelty is expensive - spend it on your differentiator, not on a clever hamburger.

**When it bites.** Some products genuinely need new patterns (spatial tools, AI interfaces). Earn them with usability testing.

## 5. Tesler's Law (Conservation of Complexity)

**Statement.** Every system has an irreducible amount of complexity. The question is who absorbs it: user, designer, or engineer.

**Apply.** When you hide complexity from the user, engineering absorbs it. Smart defaults, inference, and automation cost backend effort but save user effort. This is usually worth it for high-frequency tasks.

## 6. Postel's Law (Robustness Principle)

**Statement.** "Be conservative in what you send, liberal in what you accept." (Originally networking.)

**Apply to UX.** Accept many input formats (phone with or without dashes, dates in multiple formats, capitalization variants). Normalize silently. Never punish users for formatting.

## 7. Doherty Threshold

**Statement.** Productivity soars when a system responds to user action in under 400ms.

**Apply.** Treat 100ms as "instant," 1s as "flow preserved," 10s as "attention lost." Use optimistic UI, skeletons, and progressive rendering. Show progress, not spinners, for anything over 1s.

## 8. Goal-Gradient Effect

**Statement.** Motivation to complete a goal increases as the goal approaches.

**Apply.** Progress indicators (checkout, onboarding, profile completion). "Endowed progress" - start the user at 20% complete ("2 of 10 done") to trigger the effect earlier.

## 9. Zeigarnik Effect

**Statement.** People remember unfinished tasks better than finished ones.

**Apply.** Incomplete onboarding checklists, "draft saved" indicators, resumable flows. Careful: persistent nags become stress.

## 10. Serial Position Effect

**Statement.** Users remember first and last items best (primacy + recency), middle worst.

**Apply.** Put critical items at start or end of lists/nav. Don't bury the key CTA in the middle of a long form. In menus, the most important items go at the extremes.

## 11. Peak-End Rule

**Statement.** People judge an experience largely by its most intense point and its end, not the average.

**Apply.** Invest in a great moment (delight at success) and a clean exit (confirmation, thank-you state). Don't leave users with a broken last impression even if the middle was fine.

## 12. Von Restorff (Isolation) Effect

**Statement.** An item that differs from its peers is more likely to be remembered.

**Apply.** One primary CTA per screen. Use color/weight to call out the one thing. If everything is highlighted, nothing is.

## 13-19. Gestalt Laws

Gestalt principles describe how humans perceive grouped visual structure.

**Proximity.** Elements close together are perceived as related. The single most powerful grouping tool - use whitespace before borders.

**Similarity.** Elements that look alike are grouped. Shape, color, size, orientation.

**Common Region.** Elements inside the same bounded area are grouped (cards).

**Continuity.** The eye follows lines and curves. Aligned elements form implicit lines - misalignment breaks groups.

**Closure.** The mind completes incomplete shapes. Enables icons, simplified logos, skeleton screens.

**Prägnanz (Simplicity).** The mind perceives the simplest possible interpretation. Reduce visual noise; the brain already does work.

**Uniform Connectedness.** Elements visually connected (by line, container, background) are grouped more strongly than by similarity alone.

Apply: *use proximity first, containers second, color/border third*. Designers over-rely on borders.

## 20. Aesthetic-Usability Effect

**Statement.** Users perceive aesthetically pleasing designs as more usable (Kurosu & Kashimura, 1995).

**Apply.** Invest in visual polish - it buys goodwill during rough edges. But: it masks problems in testing. Test ugly prototypes for brutal honesty.

## 21. Cognitive Load (Sweller)

**Types.** Intrinsic (inherent to the task), extraneous (imposed by bad design), germane (effort going toward learning).

**Apply.** Reduce extraneous load aggressively - unnecessary decoration, inconsistent patterns, unclear copy, hidden state. Preserve intrinsic load. Help germane load with scaffolding.

## 22. Working Memory and Chunking

Complement to Miller's. Users can hold ~4 chunks reliably (Cowan, 2001 - a more modern figure than 7±2). Design so users don't have to carry state between screens: confirm selections visibly, show entered data, avoid "remember this number for the next step."

## 23. Recognition over Recall

**Statement.** Recognizing is easier than recalling (Nielsen heuristic #6).

**Apply.** Menus over commands. Autocomplete over typing. Recently used, favorites, history. Show available options; don't make users remember.

## 24. Occam's Razor / Minimalism

Prefer the simpler explanation, the simpler UI. Fewer elements, fewer steps, fewer words. Every element must earn its place. "Perfection is achieved not when there is nothing more to add, but when there is nothing left to take away" (Saint-Exupéry).

## 25. Pareto Principle

**Statement.** 80% of effects come from 20% of causes.

**Apply.** 20% of features get 80% of usage. Optimize those. Don't pour equal effort into every screen - identify hot paths via analytics and weight accordingly.

## 26. Parkinson's Law

**Statement.** Work expands to fill the time available. Applied to UX: forms expand to fill the screen; users enter less detail when given less space.

**Apply.** Constrain input spaces to signal expected length. Single-line inputs for short answers, textarea for narrative.

## 27. Flow (Csikszentmihalyi)

A state of focused absorption where challenge matches skill. Great products support flow: minimal interruptions, clear goals, immediate feedback, progressive difficulty. Notifications and modals are flow killers - use sparingly.

## 28. Weber-Fechner Law

Perceived difference is logarithmic to actual difference. Applied: type scales, spacing scales, and elevation systems should grow geometrically (1.125, 1.25, 1.5, 2x) not linearly to feel evenly stepped.

## 29. Selective Attention / Inattentional Blindness

Users don't see what they're not looking for (famous "invisible gorilla" study). Error messages below the fold, helpful tips in sidebars, banners at the top - all routinely missed. Put critical info on the path of attention: near the action, inline with the field, at the moment of the decision.

## 30. Banner Blindness

Specific case of the above: users ignore anything that looks like an ad. Avoid ad-like styling for important content. Don't disguise UI as marketing or vice versa.

---

## How to quote these in critique

Good: "The 14-item top nav violates Hick's Law and Miller's chunking. Grouping into 4-5 categories would cut decision time roughly in half."

Bad: "Too many items, Hick's Law."

Always connect the law to the observed behavior and the recommended change.
