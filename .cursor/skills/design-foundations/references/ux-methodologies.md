# UX Methodologies

Frameworks for structuring design work. Each has strengths and blind spots - senior designers pick the right one for the problem and the team.

## Table of contents

1. Design Thinking
2. Double Diamond
3. Lean UX
4. Design Sprint (Google Ventures)
5. Jobs-to-be-Done (JTBD)
6. Object-Oriented UX (OOUX)
7. Continuous Discovery (Teresa Torres)
8. User-Centered Design (ISO 9241-210)
9. Goal-Directed Design (Cooper)
10. Activity-Centered Design
11. Agile + UX
12. When to use which

---

## 1. Design Thinking (IDEO / Stanford d.school)

Five non-linear phases: **Empathize → Define → Ideate → Prototype → Test.**

**Strengths.** Broad framework; good for teaching; emphasizes empathy.

**Blind spots.** Often critiqued as too slow, too linear in practice, and too focused on workshops over delivery. Use the mindset, not the ritual.

## 2. Double Diamond (UK Design Council)

Two diamonds: **Discover → Define** (problem space), then **Develop → Deliver** (solution space). Each diamond diverges, then converges.

**Strengths.** Explicitly separates problem from solution - solves the most common anti-pattern (jumping to solutions). Easy to communicate to stakeholders.

**Blind spots.** Implies a one-pass flow; reality is iterative loops within each diamond.

**Apply.** Use to structure a project timeline for a skeptical stakeholder. "We're in the first diamond - we don't have a solution yet because we don't yet know what we're solving."

## 3. Lean UX (Gothelf & Seiden)

Cycle: **Think → Make → Check.** Built on Lean Startup principles: hypotheses, MVPs, validated learning, cross-functional teams.

**Core artifact.** The hypothesis statement: "We believe [this outcome] will be achieved if [these users] attain [this benefit] with [this feature]. We will know this is true when we see [this measurable signal]."

**Strengths.** Pairs with Agile sprints. Reduces deliverable overhead (kill the 50-page spec). Embeds measurement.

**Blind spots.** Easy to skip real discovery and rationalize guesses as "hypotheses." Requires real users to test against.

## 4. Design Sprint (Jake Knapp / GV)

Five days: **Understand → Sketch → Decide → Prototype → Test.**

**Strengths.** Time-boxed, forces decisions, ends with real user feedback. Excellent for a stuck team or a big bet.

**Blind spots.** Five days is expensive; output is a concept, not a shipped product; can misfire if applied to small tweaks.

**Apply.** Reserve for genuinely ambiguous, high-stakes problems. Not for every feature.

## 5. Jobs-to-be-Done (JTBD)

**Premise.** Users "hire" a product to do a job. The job is stable; the solutions change.

**Job statement.** "When [situation], I want to [motivation], so I can [outcome]." Example: "When I'm rushing out the door, I want to pay my friend back quickly, so I can not forget."

**Two schools.**

- **Outcome-driven innovation** (Anthony Ulwick) - measurable desired outcomes, opportunity scoring.
- **Switch interview** (Clayton Christensen / Bob Moesta) - study moments of product switching to surface the job.

**Strengths.** Keeps the team focused on user goals, not features. Resists trend-chasing.

**Blind spots.** Overused as a slogan. Requires real interview discipline to be useful.

## 6. Object-Oriented UX (OOUX)

**Premise.** Before flows and screens, model the *objects* in your domain and their attributes, states, and relationships. (Sophia Prater popularized this.)

**Artifact.** Object map - objects as columns, core content / metadata / actions / relationships as rows.

**Strengths.** Produces consistent, reusable IA. Catches modeling errors early. Pairs beautifully with design systems and engineering schemas.

**Blind spots.** Requires practice; can feel abstract to stakeholders who want to see screens.

**Apply.** Any content-heavy or data-heavy product (CRM, media, healthcare, finance) benefits enormously.

## 7. Continuous Discovery (Teresa Torres)

**Premise.** Weekly contact with users, triangulated via opportunity solution trees.

**Rhythm.** 2-3 customer touchpoints per week, per team. Not one-off research studies.

**Artifact.** Opportunity solution tree: Desired outcome → Opportunities (user needs, pains, desires) → Solutions → Assumption tests.

**Strengths.** Research becomes ambient, not episodic. Product decisions always have fresh user evidence.

**Blind spots.** Requires leadership buy-in and operational scaffolding (recruiting pipeline, weekly time).

## 8. User-Centered Design (ISO 9241-210)

The formal standard. Four activities: **Understand context → Specify requirements → Produce design → Evaluate.** Iterative.

Useful as a reference in regulated environments (medical, automotive). Name-drop it when a compliance stakeholder asks "what's your design process?"

## 9. Goal-Directed Design (Alan Cooper)

**Premise.** Design for user goals, not tasks. Goals are stable; tasks are artifacts of current tools.

**Artifacts.** Personas (introduced by Cooper), context scenarios, key path scenarios.

**Strengths.** Strong persona discipline. Foundational reading (*The Inmates Are Running the Asylum*, *About Face*).

**Blind spots.** Heavy upfront modeling. Personas get misused as demographics, not behavioral patterns.

## 10. Activity-Centered Design

**Premise.** Design for the activity, not the user (Norman). People adapt; activities endure.

**When to use.** Multi-user, long-duration, habitual systems (kitchens, operating rooms, cockpits, DAWs).

## 11. Agile + UX

Reality for most in-house designers. Working inside sprints means:

- **Dual-track Agile.** Discovery track runs ahead of delivery track. Discovery = research + design exploration. Delivery = engineering builds validated ideas. Prevents designers from being perpetually behind.
- **Sprint 0 / shaping.** Design needs time before the backlog exists.
- **Definition of done for design** - handoff spec, states, empty/loading/error, accessibility notes, tokens referenced.
- **Story-level collaboration.** Pair on tickets; pre-refine with engineering; attend standups if useful.

## 12. When to use which (senior's cheat sheet)

| Situation | Pick |
|---|---|
| New, ambiguous problem space | Double Diamond framing + generative research |
| Stuck team, big decision | Design Sprint |
| Content/data-heavy product | OOUX |
| In-house product with PM + eng | Lean UX + Continuous Discovery |
| User not well understood | JTBD switch interviews |
| Regulated industry | UCD (ISO 9241-210), document everything |
| Teaching a junior | Design Thinking for the mindset, then a harder method |

The methodologies are not religions. Pick pieces, combine, and name what you're doing so the team can participate.
