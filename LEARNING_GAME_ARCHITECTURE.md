# Geometry Reflex Forge — Learning Game Architecture

## Status and evidence posture

This document turns research into product rules. It is an internal design contract, not a claim that a specific game mechanic is independently proven. Studies support broader principles; exact scheduler weights, rank thresholds, score multipliers, pacing, audiovisual treatment, and mode structure remain testable hypotheses.

The product is a competitive skill-training game. Its complete target loop is:

> Observe table state → identify effective stack → compare it with pot → recognize SPR → recognize streets remaining → retrieve or infer geometric sizing → act immediately.

The intended progression is:

> Understand → recognize → retrieve → discriminate → transfer → execute quickly → retain.

Accuracy and durable transfer are the constraints. Speed, score, rank, spectacle, and retention design may amplify that loop but may never replace it.

## Non-negotiable learning rules

1. Require a prediction or committed action before revealing an answer.
2. Treat every meaningful answer as retrieval practice, not merely assessment.
3. Persist concept history and schedule reviews across sessions.
4. Interleave established concepts, while allowing a short acquisition sequence for genuinely new material.
5. Fade help from strong cues to independent production according to performance, not time spent.
6. Give compact causal feedback, then require retrieval again after interference and delay.
7. Measure table transfer independently from anchor recall.
8. Introduce time pressure only after accuracy, independence, and retention are demonstrated.
9. Use confidence diagnostically; never reward confidence by itself.
10. Make rank a proof of broad skill. Easy repetition cannot substitute for missing subskills.
11. Keep rewards deterministic about correctness and informational about improvement.
12. Let every visual, animation, sound, haptic, and 3D object reinforce state, causality, or consequence.

## Mechanic → effect → principle → implementation

| Mechanic | Intended cognitive or behavioral effect | Supporting principle | Product implementation |
|---|---|---|---|
| Commit before reveal | Encode the answer through generation and focus attention on the correction | Generation and pretesting effects | All instruction begins with a prediction, manipulation, or answer. Even onboarding asks before explaining. |
| Retrieval ladder | Replace answer familiarity with durable recall | Retrieval practice / testing effect | Progress from coarse choice to close choice, cued production, typed numeric recall, and contextual action. |
| Persistent resurfacing | Maintain access after time has passed | Distributed practice / spacing | Save review time and interval per concept. Correct delayed recall expands the interval; misses shorten it. |
| Adaptive sequencing | Place practice near the learner's current retrieval boundary | Adaptive response-time scheduling | Select using due status, correctness, latency, confidence, context performance, scaffold, coverage, and recency. |
| Interleaved established skills | Train selection and discrimination, not only repetition of one procedure | Interleaving / contextual interference | Mix 2- and 3-street cases, nearby SPRs, anchor/non-anchor spots, estimation/exact tasks, and abstract/table contexts. |
| Targeted contrast | Make easily confused cases perceptually distinct | Discriminative contrast | Deliberately juxtapose SPR 4 over 3 streets (54%) with SPR 4 over 2 streets (pot), plus error-driven neighboring pairs. |
| Guidance fading | Move from understanding to independent problem solving without overload | Worked-example fading / expertise reversal | Remove displayed SPR, anchor map, choices, formula steps, and extra time only after evidence supports removal. |
| Desirable difficulty | Strengthen memory through effortful successful retrieval | Retrieval-effort account | Tighten distractors, tolerance, number complexity, contextual noise, and timing while maintaining a plausible path to success. |
| Causal feedback | Correct the mental model, not just the selected number | Corrective feedback / simulation learning | Animate the whole line. Too small leaves visible river residue; too large exhausts the stack before the final gate. |
| Confidence sampling | Detect fragile knowledge, misconceptions, and miscalibration | Metacognitive monitoring | Occasionally ask Low / Medium / Locked after commitment and before feedback. Use the answer only for diagnosis and scheduling. |
| Varied table transfer | Apply stable geometry under realistic surface variation | Transfer and variable-practice research | Replace supplied SPR with pot and effective stack, then add non-round numbers, board context, and appropriate time pressure. |
| Accuracy-gated speed | Develop fast direct access without teaching impulsive guessing | Automaticity through repeated consistent retrieval | Unlock and weight speed only after unassisted accuracy and delayed retention. Use median latency rather than the fastest tap. |
| Weakness repair | Concentrate effort on a specific improvable component | Deliberate-practice structure | Isolate a weakness briefly, provide specific feedback, reinsert it into mixed play, and schedule a delayed return. |
| Durable mastery states | Prevent short-term fluency from masquerading as mastery | Mastery learning plus spaced relearning | Later mastery bands require independent, delayed, and contextual success; attempts or XP alone never qualify. |
| Skill qualification | Make advancement a competence event with stakes | Criterion-referenced mastery and clear goals | Eligibility opens a special mixed run. Passing proves the next rank; failure generates an explicit repair route. |
| Meaningful choice | Support autonomy without permitting easy-mode farming | Self-determination theory | Offer recommended repair, rank pursuit, mastery maintenance, transfer, or speed routes while preserving overdue-review constraints. |
| Personal ghost | Create honest self-referenced competition | Personal-best goal research | Replay only the player's validated prior run as a subtle ahead/behind delta. Never invent humans or records. |
| Informational celebration | Make improvement legible without turning learning into a payout schedule | Competence feedback; limits of extrinsic rewards | Scale feedback by difficulty, independence, delay, and transfer. Correctness is always unambiguous; only presentation varies. |
| Directed tension and recovery | Sustain focus with escalating but manageable challenge | Challenge–skill balance, clear goals, perceived control | Pace normal trials → stretch → reinforcement → contrast → mastery check, with recovery after clustered failures. |
| Mechanically relevant spectacle | Add presence while preserving cognitive coherence | Cognitive load and simulation-learning findings | Stack, pot, runway, reactor, sound, and particles visualize the same causal model. Decorative effects yield to decision readability. |

## First-run learning sequence

The first minute creates an action-led contrast, not a tutorial wall:

1. Show SPR 4 with three betting streets and ask the player to commit a sizing.
2. Play the selected line through flop, turn, and river.
3. Resolve the geometric line at approximately 54% and explain equal pot growth physically.
4. Preserve SPR 4 but remove one street; ask again before revealing anything.
5. Resolve the two-street line at pot size.
6. Make the contrast explicit: the stack ratio is unchanged, but the runway is shorter.
7. Let the player correctly complete one strongly cued replay.
8. Enter calibration through play and estimate subskills separately.

This sequence operationalizes generation before exposure while preventing an unsupported-error loop: an initial miss is immediately followed by a meaningful correction and a successful retrieval opportunity.

## Facility and mode architecture

Each facility exists because it trains a distinct cognitive operation.

| Facility / mode | Cognitive operation and implementation |
|---|---|
| Calibration Bay | Samples anchor recall, SPR estimation, runway intuition, formula familiarity, transfer, and latency through low-stakes mixed play. It assigns scaffolds and a recommended mission but grants no rank from the tiny sample. |
| Ratio Chamber / SPR Snap | Pot and effective stack → approximate SPR. Begin with separated ratio zones; later use neighboring and non-round values. Measure magnitude of estimation error. |
| Runway Forge | SPR + streets remaining → qualitative aggression, then exact sizing. Animated street gates make remaining runway spatially meaningful. |
| Anchor Grid / Anchor Forge | Direct retrieval of the ten mappings. Move quickly from minimal acquisition to production and interleave both paths. Perfect Ten is ten anchors, sudden death, with time valid only on a perfect run. |
| Stackoff Machine | Predict and watch a full simplified bet/call line. Correct geometry converges; under-sizing leaves residue; over-sizing exhausts early. Compare `YOUR LINE` with `GEOMETRIC LINE` at every gate. |
| Root Reactor | Reconstruct arbitrary sizing through DOUBLE → ADD ONE → ROOT → MINUS ONE → HALF. Fade ordered manipulation to a missing step, full reconstruction, then numeric production. |
| Ghost Line | Infer hidden SPR/street/sizing from a trajectory, training inverse understanding from silhouettes and pot-growth rhythm before labels. |
| Contrast Duel | Rapidly discriminate error-derived confusable pairs. Its iconic gate is SPR 4: 54% across three streets versus pot across two. |
| Table Zero | Flagship integration of stack reading, pot comparison, SPR estimation, streets, recall, and direct bet action. Information lives in-world; assistance fades. Transfer Gauntlet removes SPR labels; Precision narrows tolerance on arbitrary SPRs. |
| Reflex Rush / Stackoff Survival | Accuracy-gated automatic execution and context switching. Errors reduce momentum; an explicit critical-error allowance ends Survival with a repair diagnosis. |
| Memory Return / Weakness Hunt | Memory Return serves only due concepts. Weakness Hunt targets a fragile operation, ends in mixed retrieval, and creates a future review. Both are first-class missions, not shame states. |

## Scheduler contract

The scheduler is intentional, deterministic under a seed, and testable.
Randomness may vary surface presentation only after curriculum priorities are satisfied.

Persist per concept:

- Performance: attempts, successes, failures, current/historical accuracy, streak, lapses, and recent outcomes.
- Learning: mastery, stability, band, scaffold, independent and spaced successes, recent question forms, and sequence recency.
- Diagnosis: latency estimate/trend, confidence calibration, high-confidence errors, and low/high/conceptual error direction.
- Transfer and time: contextual attempts/accuracy, last review and successful retrieval, interval, stage, and next review.

Initial selection heuristic:

```text
priority =
  overdue_due_weight
  misconception_weight
  latency_fragility
  transfer_gap
  undercoverage
  mode_relevance
- recent_item_penalty
```

Scheduling rules:

1. A wrong answer receives feedback now, a corrective retrieval after several interfering concepts, and an early cross-session return.
2. Wrong + Locked is the highest misconception signal.
3. Correct + Low is successful but fragile; keep a shorter interval and provide feedback.
4. Correct + Locked expands spacing only when the answer was unassisted and meaningfully delayed.
5. A slow correct answer may advance accuracy but not automaticity.
6. Contextual failure raises table-transfer priority without erasing anchor memory.
7. Do not show the same missed concept repeatedly with no interference.
8. Do not target a rigid global success percentage; use a soft challenge band plus failure-cluster recovery.
9. Exact interval multipliers are telemetry-tuned hypotheses, not universal constants supplied by spacing research.

## Guidance and difficulty model

Scaffolds descend from level 3 to 0:

- Level 3: causal demonstration, widely separated choices, visible anchor/runway support.
- Level 2: concise cue and choices with meaningful but distinguishable distractors.
- Level 1: partial production, tighter tolerance, hidden answer map, optional mnemonic cue.
- Level 0: unassisted numeric or direct table action.

Difficulty can independently vary:

Distractor similarity, scaffold level, anchor distance, numeric complexity, exact versus approximate response,
table information density, tolerance, context switching, and time pressure are independent difficulty controls.

Important correction to the earlier research note: low-mastery learners should not begin with close distractors.
Close distractors increase discrimination demand and belong after coarse distinctions are reliable.
Likewise, two same-session successes are insufficient for scaffold removal or stable mastery.

## Feedback contract

Feedback has three layers:

1. **Immediate state:** tactile and audiovisual confirmation of correct or incorrect commitment.
2. **Causal consequence:** the simulated line converges, leaves residue, or exhausts early.
3. **Compact correction:** one actionable explanation, then flow resumes.

Feedback depth adapts:

- correct + strong + fast: terse resolution;
- correct + low confidence or slow: reinforce why it works;
- wrong + low confidence: concise correction and supported later return;
- wrong + high confidence: explicit misconception contrast and high scheduler priority.

Immediate feedback is used here for action clarity, causal control, and error correction—not because research shows it is universally superior.
Some multiple-choice research found better delayed retention from delayed feedback, so the game combines immediate consequence with delayed retrieval rather than making a blanket timing claim.

## Mastery world

Every concept node progresses through:

- **Dormant:** no meaningful attempt.
- **Discovered:** generated an answer and observed the causal model.
- **Unstable:** at least one success, but still scaffolded, slow, or same-session only.
- **Forged:** repeated independent success under mixed practice.
- **Stabilized:** successful retrieval after a meaningful delay.
- **Mastered:** retained, unassisted retrieval plus successful contextual transfer.

Forgetting reduces displayed node energy and increases review priority; it does not erase earned history.
The world contains the 3-street path `2 → 3 → 4 → 5 → 6` and 2-street path `1 → 1.5 → 2 → 3 → 4`.
SPR 4 is their iconic cross-system landmark.

## Rank architecture

Rank ladder:

> Unranked → Bronze → Silver → Gold → Platinum → Diamond → Master → Grandmaster → Geometry Elite

Rank is based on broad demonstrated skill, not XP. Its rating combines anchor recall, SPR recognition, runway discrimination, arbitrary precision, formula fallback, table transfer, delayed retention, independence, and accuracy-qualified pressure performance.

Design rules:

Use minimum gates or a harmonic composite so one strength cannot hide a missing skill. Require a minimum evidence count,
spaced evidence for upper ranks, no-scaffold evidence for advanced ranks, and an accuracy floor before latency contributes.
Eligibility opens a seeded qualification run. Passing records the qualification permanently; current node energy can still
signal maintenance. Track highest rank separately from current readiness.

Threshold values are product balancing parameters and must be covered by deterministic tests and revised using real performance distributions.

## Score architecture

Score rewards learning quality in this order: correctness, difficulty, independence, retention, precision, then speed.

```text
incorrect => zero base score and momentum reset

correct score =
  base
  × difficulty
  × independence
  × retention
  × precision
  × capped_speed
  × modest_streak
```

Rules:

- Incorrect answers never earn a speed benefit.
- Speed is capped and disabled below the mode's rolling accuracy gate.
- Retention depends on actual elapsed delay, not nominal item difficulty.
- Scaffolded recognition scores materially less than independent production.
- Transfer and arbitrary precision carry higher difficulty than visible-anchor recognition.
- Streak is modest so accuracy remains dominant.
- Confidence changes diagnosis and scheduling, not the answer's raw reward.
- Expose the score breakdown so it functions as competence information rather than a mysterious payout.

## Personal records and honest competition

Track validated records for clean streak, Perfect Ten, Reflex Rush/Arena score, table transfer,
SPR-recognition sequence, 20-trial accuracy, highest difficulty, daily challenge, and latency at at least 90% accuracy.

Record rules:

Only comparable seeded/ruleset runs compete directly. Persist the prior-best ghost and announce `NEW PERSONAL RECORD`
as a distinct event. Never use fabricated competitors or percentiles. Label standardized benchmarks as standards, not people.
Frame advancement as an approach goal; failure names the repairable skill instead of threatening status loss.

## Session architecture

- **Micro, 1–3 minutes:** due Memory Return or one targeted skill/PB attempt.
- **Standard, 5–10 minutes:** adaptive interleaved mission with a stretch, contrast, and consolidation beat.
- **Deep, 15–30 minutes:** campaign sectors, qualification, or repeated flagship simulation.

The return screen prioritizes one purpose: due memories, weakening node, nearby PB, or qualification readiness.
There is no punishment, lost currency, or guilt language for absence.

## Local instrumentation and evaluation

Record for every attempt:

Question type and concept IDs; difficulty and scaffold; response form and expected answer; correctness, numeric error,
tolerance, response time, retention gap, sampled confidence; session, run, mode, sequence; score breakdown; and mastery transition.

Evaluate the product using learning measures, not engagement alone:

Delayed unassisted anchor recall; retained accuracy across increasing gaps; transfer on unseen values; confidence calibration;
latency improvement without accuracy loss; error recurrence after feedback; scaffold independence; and component-skill coverage.

Time played, taps, streak length, and session count are descriptive metrics, never proof of learning.

## Evidence boundaries and safety rails

- Much retrieval and spacing work uses verbal or factual material; poker-specific outcomes require local validation.
- Interleaving often lowers practice performance and is not universally superior; similarity and task structure moderate its value.
- A short initial acquisition block can precede interleaving without becoming massed farming.
- Difficulty is desirable only when it produces useful processing and a plausible route to success.
- Faded-example evidence is clearer for near than far transfer; Table Zero must directly test far/context transfer.
- Confidence is a noisy self-report signal, not an independent mastery score.
- Immediate feedback is not universally superior to delayed feedback.
- Flow is an experience associated with challenge balance, clear goals, and control—not a guaranteed learning cause or fixed 85% success rule.
- Deliberate practice contributes to expertise but does not explain all performance variance.
- Points, ranks, badges, and leaderboards do not inherently create intrinsic motivation or learning.
- Competition can elicit helpful approach goals and harmful avoidance goals; it has no reliable positive direct effect in the aggregate.
- Games and simulations are not intrinsically superior to well-designed active instruction and may show publication bias.
- Immersion, 3D, audio, and animation must be removed or reduced when they split attention or obscure relevant state.

## Research basis

### Generation, retrieval, spacing, and transfer

- Generation and pretesting: Slamecka & Graf (1978), [The generation effect](https://doi.org/10.1037/0278-7393.4.6.592); Kornell, Hays, & Bjork (2009), [Unsuccessful retrieval attempts](https://doi.org/10.1037/a0015729).
- Retrieval and transfer: Roediger & Karpicke (2006), [Test-enhanced learning](https://doi.org/10.1111/j.1467-9280.2006.01693.x); Karpicke & Roediger (2008), [Critical importance of retrieval](https://doi.org/10.1126/science.1152408); Butler (2010), [Retrieval and transfer](https://doi.org/10.1037/a0019902).
- Spacing and adaptation: Cepeda et al. (2008), [Temporal ridgeline](https://doi.org/10.1111/j.1467-9280.2008.02209.x); Rawson & Dunlosky (2011), [Durable and efficient schedules](https://doi.org/10.1037/a0023956); Pavlik & Anderson (2008), [Optimal schedule model](https://doi.org/10.1037/1076-898X.14.2.101); Mettler, Massey, & Kellman (2016), [Adaptive versus fixed schedules](https://doi.org/10.1037/xge0000170).
- Interleaving and difficulty: Taylor & Rohrer (2010), [Interleaved practice](https://doi.org/10.1002/acp.1598); Kornell & Bjork (2008), [Category induction](https://doi.org/10.1111/j.1467-9280.2008.02127.x); Pyc & Rawson (2009), [Retrieval effort](https://doi.org/10.1016/j.jml.2009.01.004).

### Feedback, calibration, scaffolding, and automaticity

- Feedback and calibration: Pashler et al. (2005), [Correct-answer feedback](https://doi.org/10.1037/0278-7393.31.1.3); Butler, Karpicke, & Roediger (2007), [Type and timing](https://doi.org/10.1037/1076-898X.13.4.273); Butler, Karpicke, & Roediger (2008), [Low-confidence correction](https://doi.org/10.1037/0278-7393.34.4.918); Dunlosky & Rawson (2012), [Overconfidence and retention](https://doi.org/10.1016/j.learninstruc.2011.08.003).
- Load, fading, and transfer: Chandler & Sweller (1991), [Cognitive load and format](https://doi.org/10.1207/s1532690xci0804_2); Atkinson, Renkl, & Merrill (2003), [Fading worked steps](https://doi.org/10.1037/0022-0663.95.4.774); Paas & van Merriënboer (1994), [Example variability and transfer](https://doi.org/10.1037/0022-0663.86.1.122).
- Mastery and expertise: Bloom (1968), [Learning for mastery](https://eric.ed.gov/?id=ED053419); Logan (1988), [Automatization](https://doi.org/10.1037/0033-295X.95.4.492); Ericsson, Krampe, & Tesch-Römer (1993), [Deliberate practice](https://doi.org/10.1037/0033-295X.100.3.363); Macnamara, Hambrick, & Oswald (2014), [Deliberate-practice meta-analysis](https://doi.org/10.1177/0956797614535810).

### Motivation, competition, games, and simulation

- Needs and rewards: Deci & Ryan (2000), [Goal pursuits and psychological needs](https://doi.org/10.1207/S15327965PLI1104_01); Ryan, Rigby, & Przybylski (2006), [Motivational pull of games](https://doi.org/10.1007/s11031-006-9051-8); Deci, Koestner, & Ryan (1999), [Extrinsic-reward meta-analysis](https://doi.org/10.1037/0033-2909.125.6.627); Mekler et al. (2017), [Individual gamification elements](https://doi.org/10.1016/j.chb.2015.08.048).
- Challenge and competition: Fong, Zaleski, & Leach (2015), [Challenge–skill balance](https://doi.org/10.1080/17439760.2014.967799); Murayama & Elliot (2012), [Competition–performance relation](https://doi.org/10.1037/a0028324); Anderson & Green (2018), [Personal bests](https://doi.org/10.1073/pnas.1706530115).
- Games and simulation: Clark, Tanner-Smith, & Killingsworth (2016), [Digital games and learning](https://doi.org/10.3102/0034654315582065); Wouters et al. (2013), [Serious-games meta-analysis](https://doi.org/10.1037/a0031311); Sitzmann (2011), [Simulation-games meta-analysis](https://doi.org/10.1111/j.1744-6570.2011.01190.x); Chernikova et al. (2020), [Simulation-based learning](https://doi.org/10.3102/0034654320933544).

## Final design test

For every feature ask: Which component of the target loop does it train? What must the player retrieve, discriminate,
infer, or execute? How does feedback expose causality? When will the concept return? What evidence permits the next
scaffold, speed, mastery, or rank state? Does it improve learning or honest competition, or merely decorate activity?

If those questions have no strong answer, the feature does not belong in the Forge.
