# Geometry Forge Arena — Learning/Game Architecture

## Product thesis

Geometry Forge Arena is a competitive skill-training game whose underlying skill is geometric poker bet sizing. The experience is designed so that the rewarding game action is the learning behavior itself: retrieve, commit, see the consequence, adapt, return later, and transfer under table-like conditions.

## Learning loop

PERCEIVE → GENERATE → COMMIT → EXPERIENCE → INFORMATIVE FEEDBACK → REINFORCE → ADAPT → SPACE → TRANSFER → SPEED

The game avoids answer-first teaching. Correctness feedback is immediate, but exposure follows a committed attempt.

## Mini-games and trained subskills

- **Anchor Forge** — canonical mapping retrieval. Guidance fades from nearby-choice discrimination to free recall and light timed pressure.
- **SPR Snap** — rapid pot/effective-stack ratio perception.
- **Runway Duel** — discrimination between two- and three-street geometry; teaches that shorter runway requires steeper growth.
- **Live Table** — contextual transfer from raw pot/stack/street information to a bet-size action.
- **Ranked Gauntlet** — interleaves all subskills and provides personal-best competition.

## Evidence-informed mechanics

- Retrieval practice → answers are generated before reveal.
- Interleaving → Ranked Gauntlet mixes ratio, anchor, runway, and transfer tasks.
- Spacing → missed anchors reappear after interference; older successful anchors regain scheduling priority.
- Guidance fading → Anchor Forge moves from choices to typed recall to timed recall.
- Immediate informative feedback → wrong sizing produces visible residue or premature stack exhaustion rather than only red text.
- Transfer → Live Table removes explicit SPR.
- Automaticity → time pressure is introduced only after anchor mastery stabilizes.
- Desirable difficulty → scheduler weights weak and due anchors while preserving variation.
- Competence motivation → rank, mastery map, personal records, and new-PB events reflect demonstrated skill.
- Autonomy → player can choose modes or deliberately hunt the weakest anchor.
- Flow / challenge-skill matching → each anchor has its own scaffold level; challenge increases with mastery.

## Reward language

The reward is deterministic and contingent on correctness. A correct line produces stack/pot convergence, audiovisual resolution, haptic feedback when available, mastery growth, score movement and rank movement. Harder/unassisted retrievals score more than scaffolded recognition.

No loot boxes, fake social competitors, arbitrary virtual currency, or random correctness rewards are used.

## Competitive model

Rank is derived from demonstrated skill, not raw activity. The rating combines:
- anchor mastery,
- lifetime accuracy,
- Live Table transfer accuracy,
- response speed at successful retrieval.

The Ranked Gauntlet stores a personal best and best completion time. The user's previous benchmark becomes the competitive target.

## Persistence

Learning history is stored locally in the browser. Per anchor the game tracks mastery, attempts, correct responses, misses, last successful retrieval and latency. Session state remains transient; durable competence survives refreshes and later visits.

## Canonical anchors

Three streets:
- SPR 2 → 35%
- SPR 3 → 46%
- SPR 4 → 54%
- SPR 5 → 61%
- SPR 6 → 68%

Two streets:
- SPR 1 → 37%
- SPR 1.5 → 50%
- SPR 2 → 62%
- SPR 3 → 82%
- SPR 4 → 100%

General formula:

b = ((1 + 2S)^(1/n) - 1) / 2

Mnemonic:

DOUBLE → +1 → ROOT → −1 → HALF

## Acceptance standard

A build is not complete unless:
- mobile 390×844 has zero horizontal overflow,
- desktop 1440×900 has zero horizontal overflow,
- correct retrieval triggers visible reinforcement,
- mastery persists,
- SPR Snap is playable,
- Live Table accepts a correct computed line,
- Ranked Gauntlet launches,
- no browser console errors occur in the acceptance run.
