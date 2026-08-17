# UX Research

How to choose a method, design a study, recruit, run it, and extract insight. Written for the senior generalist who leads research or embeds it in product teams.

## Table of contents

1. The research map (what to use when)
2. Generative vs. evaluative
3. Qualitative vs. quantitative
4. Attitudinal vs. behavioral
5. Method deep-dives
6. Recruiting and sample size
7. Writing a discussion guide
8. Moderating
9. Analysis and synthesis
10. Reporting and stakeholder influence
11. Common research mistakes

---

## 1. The research map

Start with the question, not the method. Questions fall into buckets:

- **Who are our users and what do they care about?** → Interviews, field studies, diary studies, surveys.
- **What are they trying to accomplish?** → Jobs-to-be-Done interviews, task analysis.
- **Where do they struggle today?** → Contextual inquiry, usability testing on existing product, support ticket review, session replay.
- **How will they react to our idea?** → Concept tests, prototype usability tests, preference tests.
- **Is our design actually usable?** → Usability testing (moderated or unmoderated), first-click tests, heuristic review.
- **How does this change perform at scale?** → A/B tests, surveys, analytics, multivariate tests.
- **Is our information architecture right?** → Tree testing, card sorting, first-click tests.

## 2. Generative vs. evaluative

**Generative** research discovers unknowns: needs, behaviors, contexts. You run it early and when entering new problem spaces. Methods: interviews, diary, ethnography, JTBD.

**Evaluative** research tests a specific thing: a concept, prototype, or live product. Methods: usability test, A/B test, survey with hypothesis.

Teams commonly over-invest in evaluative and under-invest in generative. A rule of thumb: if you don't know the *problem*, no amount of evaluating solutions will save you.

## 3. Qualitative vs. quantitative

**Qualitative** answers *why* and *how*. Small samples, deep data. Good at finding problems, understanding motivations, generating hypotheses. Not good at counting.

**Quantitative** answers *how many* and *how much*. Large samples, shallow data per participant. Good at validating at scale, comparing, measuring.

Mix them. Qual to generate hypotheses, quant to test them, qual again to explain surprising quant results.

## 4. Attitudinal vs. behavioral

**Attitudinal** = what people say (interviews, surveys). Self-report is filtered through memory, ego, and social desirability.

**Behavioral** = what people do (usability tests, analytics, session replays).

The gap between the two is real and often large. Observe behavior; *then* ask about motivation.

## 5. Method deep-dives

### 5.1 User interview

**Purpose.** Understand motivations, context, history, pain points.

**Duration.** 45-60 minutes typical.

**Sample.** 5-8 per segment for discovery (Nielsen saturation threshold). More if you have multiple distinct segments.

**Do.** Start broad, narrow in. Ask about past specific events ("tell me about the last time you..."), not hypotheticals. Follow threads. Stay silent after answers - the second sentence is usually the real one.

**Don't.** Lead. Present your idea. Ask "would you use this?" - people lie, politely.

### 5.2 Contextual inquiry / field study

Observe users in their real environment doing real work. Pairs observation with interview ("why did you just do that?"). Richest source of insight but expensive to run.

### 5.3 Diary study

Participants log interactions over days/weeks. Great for low-frequency or context-dependent behavior (medical adherence, commuting). Use a lightweight daily prompt; pair with end-of-study interview.

### 5.4 Survey

**Good for.** Validating prevalence ("how many users experience this?"), segmentation, NPS/CSAT tracking, demographic profiling.

**Bad for.** Understanding nuance or novel problems.

**Writing tips.** One idea per question. Avoid leading ("how satisfied are you with our excellent service?"). Use validated scales (SUS, UMUX-Lite, NPS) where possible. Randomize option order to reduce bias. Include an "other/prefer not to say" for sensitive demographics.

**Sample.** For descriptive stats: 100+ per segment minimum. For significance testing: power-calculate.

### 5.5 Usability test (moderated)

**Purpose.** Find problems in a real or prototype interface.

**Sample.** Nielsen's 5 users find ~85% of problems; diminishing returns after. Run 5, iterate, run 5 more. For multiple segments, 5 per segment.

**Task design.** Frame tasks as goals ("you just got paid - send $50 to your roommate"), not instructions ("click the Send Money button"). Realistic context; realistic data.

**Measure.** Task success (yes/no/partial), time on task, errors, satisfaction (single question post-task), SUS at end for benchmarkable number.

### 5.6 Unmoderated usability test

Tools: UserTesting, Maze, Lookback, PlaybookUX. Faster, cheaper, more participants; shallower insight (no probing). Best for well-defined tasks on working prototypes.

### 5.7 First-click test

Show a screen, ask "where would you click to do X?". Strong predictor: if first click is wrong, task success drops to ~50%; if right, ~87%. Cheap to run in Chalkmark or Maze.

### 5.8 Tree test

Test an IA without visual design. Participants see a text hierarchy and answer "where would you find X?". Measures findability.

### 5.9 Card sort

Participants group and label cards representing content or features.

- **Open sort** - participants create their own groups (generative; informs IA).
- **Closed sort** - participants sort into your predefined groups (validates IA).
- **Hybrid** - predefined groups plus "create your own."

Analyze with dendrograms and similarity matrices (Optimal Workshop standard).

### 5.10 A/B test

Compare two variants on a real metric. Good for small iterative changes. Bad for uncovering new needs. Requires traffic; underpowered tests lie. Always pre-register the metric and the minimum effect size you care about.

### 5.11 Heuristic evaluation

Expert review against Nielsen's 10 heuristics. Cheap, fast, finds problems users might miss. Not a replacement for user testing - experts are not users.

### 5.12 Analytics and session replay

Essential for behavioral ground truth at scale. Look for: drop-off points, rage clicks, dead clicks, long pauses, repeated backtracking. Always complement with qualitative - analytics tells you *what*, not *why*.

### 5.13 Jobs-to-be-Done interview

Switch interview. Interview someone who recently switched products/solutions. Map: first thought → passive looking → active looking → decision. Extract the "job" and the forces (push, pull, anxiety, habit). See Clayton Christensen / Bob Moesta.

## 6. Recruiting and sample size

**Screener.** Behavior-based, not demographics. "How many times have you sent money in the last 30 days?" beats "Do you use peer-to-peer payment apps?"

**Screen out.** Designers, people who work in your industry, UX researchers, people who took a study in the last 30 days (pros skew results).

**Incentives.** Fair for participants' time. $50-100 for 30-60 min consumer study in US; higher for B2B/specialists.

**Sample size cheat sheet:**

- Qualitative interviews or usability tests: 5-8 per segment.
- Survey for descriptive stats: 100+ per segment.
- Card sort: 15-30.
- Tree test: 30+.
- A/B test: power calculation based on baseline and minimum detectable effect.

## 7. Discussion guide skeleton

Every guide has:

1. **Intro (3-5 min).** Thank, explain, consent, recording, "no right answers."
2. **Warm-up (5 min).** Easy rapport questions; establish baseline vocabulary.
3. **Context (10 min).** About them, their situation, current behavior.
4. **Core (20-30 min).** The meat - tasks, probes, or topic deep-dive.
5. **Wrap-up (5 min).** Anything we didn't cover? Final impressions.

Write probes, not scripts. Know your questions well enough to drop them.

## 8. Moderating

**Rapport first.** People talk when they feel safe.

**Silence is your friend.** Count to 5 after an answer. Participants will elaborate.

**Neutral reactions.** "Mm-hm, tell me more" not "Great!" Positive reactions train participants to perform.

**Don't defend your design.** When they struggle, note it. Do not explain it away in the moment.

**Think-aloud.** For usability tests, ask "what are you thinking?" Train it in warm-up tasks.

**Don't ask "why."** Ask "tell me more about that" or "what made you do X?" - "why" can feel accusatory.

## 9. Analysis and synthesis

**Raw data → patterns → insights → recommendations.**

**Affinity mapping.** Print or digitize quotes/observations on cards. Cluster. Label clusters. Let themes emerge. Do it with the team - synthesis is where stakeholders become believers.

**Frameworks.**

- Journey maps - emotion, actions, thoughts, pain points across phases.
- Empathy maps - says/thinks/does/feels.
- Personas (archetypes grounded in data, not demographics).
- Jobs-to-be-done statements: "When ___, I want to ___, so I can ___."
- Opportunity solution trees (Teresa Torres).

**Insight quality test.** An insight should (a) be specific, (b) be surprising or non-obvious to stakeholders, (c) imply action. "Users want faster checkout" fails all three.

## 10. Reporting and influence

**Know your audience.** Execs want headlines and decisions. PMs want patterns and priorities. Engineers want specifics and edge cases.

**Story beats slides.** Open with a user story that encapsulates the finding. Quote participants - their words are more persuasive than yours.

**Show, don't tell.** Video clips > paraphrased quotes. 20-second clips of three different users saying the same thing ends meetings.

**Recommend, don't just report.** "We found X. We recommend Y. Here's why." Research that doesn't recommend is a news article.

**Track what happens.** Keep a log of research → decisions → outcomes. Builds credibility over time.

## 11. Common mistakes

- Using the wrong method for the question.
- Asking "would you use this?" - a meaningless question.
- Pitching instead of probing.
- Overclaiming generality from 5 interviews - these are qualitative patterns, not statistics.
- Ignoring the business context - research that can't be acted on is waste.
- Treating stakeholders as obstacles instead of collaborators. Bring them into sessions. Once they see one user struggle, you won't have to defend findings.
- One-and-done research. Continuous discovery (Torres) is the modern bar: 2-3 user touchpoints per week for product teams.
