# Mentorship, Coaching, and Teaching Design

How a senior designer develops juniors. Not just reviewing work - building judgment.

## Table of contents

1. The goal: building judgment
2. Modes of teaching
3. Running a good critique
4. Giving feedback
5. Reviewing portfolios
6. Onboarding a junior
7. Career ladder and growth
8. Common junior struggles (and how to unblock)
9. A sample curriculum
10. What not to do

---

## 1. The goal: building judgment

Juniors can copy patterns; seniors decide when to break them. The difference is judgment - and judgment is built from three things:

- **Principles** - knowing the laws, heuristics, and conventions.
- **Exposure** - seeing many products, many contexts, many failures.
- **Reflection** - articulating why something works or doesn't.

Your job as mentor is to stack exposure and force reflection, not to hand them the answer. A junior who gets answers grows slowly. One who gets better questions grows fast.

## 2. Modes of teaching

Different scenarios, different modes.

- **Tell** - for safety-critical knowledge. "Never ship without WCAG AA contrast." Don't Socratic-method this.
- **Show** - demonstrate. Work through a problem aloud. Verbalize your moves. Juniors rarely see senior reasoning - make it visible.
- **Co-design** - sit together, take turns driving. Low stakes, high learning.
- **Question** - "what did you notice?" "what alternatives did you try?" "what happens at the edge?" Use when they have enough foundation.
- **Challenge** - "defend that choice." Pushes them to articulate reasoning.
- **Debrief** - after a project, ask what they'd do differently.

Start with Tell/Show for fundamentals; move to Question/Challenge as they build.

## 3. Running a good critique

Critique is the most common mentorship setting. Done well, it's transformative. Done badly, it's demoralizing theater.

**Structure.**

1. **Designer sets context (3-5 min).** What problem, what users, what constraints. "I'd like feedback on X." No "what do you think?" - direct the feedback.
2. **Silent read (2-3 min).** Reviewers look without speaking. Jot private notes.
3. **Clarifying questions first.** Not opinions. "Does this assume the user has completed onboarding?"
4. **Feedback round.** Each person offers observations tied to the stated focus. One observation = one sticky.
5. **Synthesis.** Designer reflects: what surprised, what they agree with, what they'll try.
6. **Next steps.** Designer commits to 1-3 actions. Not "think about all of it."

**Rules.**

- Attack the work, not the designer.
- Separate observation from prescription. "I noticed my eye went to the banner first, then struggled to find the primary action" is more useful than "Make the button bigger."
- Name the principle when citing one: "Hick's Law - 9 top-level nav items is a lot."
- Don't solve in critique unless asked. Solving robs the designer of the problem.

**Senior designer in critique.**
- Model the behavior. Give feedback in the format you want others to.
- Don't talk first (you'll anchor the room). Ask juniors to speak first.
- Pull in what others missed at the end. Raise the ceiling, not just the floor.

## 4. Giving feedback (1:1)

**Specific, kind, actionable.**

- **Specific.** "The form has no clear primary action - both buttons are the same weight" not "the form is confusing."
- **Kind.** Address the work. Assume good intent. The junior already feels vulnerable.
- **Actionable.** They should know what to try next.

**The SBI model (Situation-Behavior-Impact).**
- Situation: "In the checkout flow..."
- Behavior: "...you placed the CTA below three secondary actions..."
- Impact: "...which I think will reduce conversion - primary should be visually dominant."

**Praise publicly, critique privately** for sensitive feedback. Public positive reinforcement normalizes excellence.

**Don't sugar-sandwich.** Fake praise → real feedback → fake praise reads as dishonest. Be direct with warmth. People prefer honesty.

**Follow up.** A week later, ask how it's going. Shows the conversation mattered.

## 5. Reviewing portfolios

Juniors want to know if they're "ready" - for a job, a promotion, a harder project. Portfolio review is the reps that build that.

**What you're assessing.**

- **Problem framing.** Did they understand and articulate the problem before designing?
- **Process.** Evidence of research, exploration, iteration. Not just final visuals.
- **Craft.** Are the visuals up to bar? Typography, hierarchy, consistency, polish.
- **Systems thinking.** Tokens, components, patterns referenced or reflected.
- **Outcomes.** What happened when it shipped? Even if modest.
- **Communication.** Can they tell the story clearly? Structure, written explanations, annotations.

**Common junior portfolio mistakes.**

- All final visuals, no process. Looks like a Dribbble portfolio.
- No user problem - "the company wanted a redesign." Who benefits?
- Every project uses "user research" as a word but shows no research artifacts.
- Redesigns of famous products with no access to their data. Fine, but frame honestly.
- No constraints acknowledged. Real work has budget, time, tech limits.
- All successes. No failures, no hard trade-offs. Unreal.

**Rubric** in `assets/portfolio-review-rubric.md`.

## 6. Onboarding a junior

**Week 1.**
- Introduce to product, users, team, tools.
- Read key docs: brand, design system, research repository.
- Meet stakeholders and peers individually.
- Shadow sessions: critique, research, planning.

**Weeks 2-4.**
- Small, bounded task. A component tweak. A polish pass. Not greenfield.
- Pair with a peer on a real project.
- Daily 15-min check-in with mentor for the first two weeks.

**Month 2.**
- Owned project - small surface, clear problem, mentor available.
- Learn the system by extending it.

**Month 3+.**
- Larger scope, more autonomy.
- Retrospective at month 3: what's working, what's not.

**Throughout.**
- Weekly 1:1 with mentor/manager.
- Learning goals: 1-2 skills to develop each month.

## 7. Career ladder and growth

Rough levels (titles vary; concepts hold):

**Junior (IC1-2).** Executes well-scoped tasks. Produces polished visuals with guidance. Follows the system. Asks good questions.

**Mid (IC3).** Owns features end-to-end. Makes sound decisions independently. Contributes to the system. Collaborates with PM and engineering fluently.

**Senior (IC4).** Owns complex products or domains. Improves the system. Mentors. Frames ambiguous problems. Influences roadmap.

**Staff (IC5).** Cross-team. Sets design direction. Makes bets. Develops seniors. Writes and speaks publicly (internally at minimum).

**Principal / Distinguished (IC6+).** Shapes the discipline inside the company. Multi-year bets. Org-level influence.

**Growth rubrics** help juniors see what "next" looks like. Publish them.

## 8. Common junior struggles

**"I can't get it past 80% polished."** Usually a taste issue - they haven't absorbed enough great work to see what's missing. Prescription: deliberate exposure (Dribbble, Mobbin, Refactoring UI, system docs), detailed critique, and pair design with a senior.

**"I keep going in circles."** Often unclear problem framing. Make them write the problem in one sentence before opening Figma. "Who is struggling with what, and why does it matter?"

**"Stakeholders keep pushing back."** Usually presenting solutions without evidence. Train them to open with problem + data + option space.

**"PM won't let me do research."** Start small. 15-minute calls. Existing analytics. Don't fight for a 6-week study; smuggle research into the week.

**"I feel like I'm copying other products."** That's learning. Copy consciously - name what they copied and why. Add their own take deliberately. Originality comes later from a large vocabulary.

**"I'm burning out."** Check workload, psychological safety, clarity of scope. Boredom or overwork both burn. Often fixed by giving them one meaningful owned thing and cutting three small annoying things.

## 9. A sample 12-week curriculum

See `assets/teaching-curriculum.md` for a detailed version. At a glance:

- Weeks 1-2: UX fundamentals - laws, heuristics, research basics.
- Weeks 3-4: Information architecture and flows.
- Weeks 5-6: Visual foundations - typography, color, layout, hierarchy.
- Weeks 7-8: Components and design systems.
- Weeks 9-10: Accessibility and inclusive design.
- Week 11: Critique and communication.
- Week 12: Capstone - a small end-to-end project.

Each week: one reading, one exercise, one critique.

## 10. What not to do

- **Don't just redesign their work.** It's ego, not mentorship.
- **Don't use sarcasm** or "this is obvious." Reliable way to shut down growth.
- **Don't hoard opportunity.** Let them present to stakeholders, run research, own the reveal.
- **Don't protect them from feedback.** Curate it - but don't sanitize it.
- **Don't mistake loyalty for competence.** Nice people can be weak designers; teach them the craft.
- **Don't mistake confidence for competence.** Bold juniors aren't always right. Pair confidence with evidence.
- **Don't stop learning.** The moment you stop, you become a bottleneck.
