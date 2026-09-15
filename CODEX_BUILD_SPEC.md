# Geometry Reflex Forge — V5 Build Specification

## Product goal

Evolve the deployed React/Vite trainer into a highly interactive learning game that makes geometric bet sizing in NLHE MTTs automatic rather than merely understandable.

The user plays €10–€20 Winamax MTTs, especially SPACE KO, and already thinks in position and effective stacks. The learning target is the post-flop reflex:

> effective stack → pot → SPR → streets remaining → geometric % → actual BB action

The app must teach, drill, test, visualize, and reinforce this loop until the mapping is owned by the user.

## V5 production contract

The deployed application is the root React/Vite frontend: `index.html` loads `/src/main.tsx`, `src/App.tsx` owns the run state, and GitHub Pages publishes the generated `dist/` bundle. The older `forge-game/` frontend and the Streamlit files are retained as historical implementations; they are not the production path for V5.

The training responsibilities are deliberately separate:

- **Anchor Forge = percentage landmarks.** `SPR + streets → geometric %`; canonical rounded answers and their established tolerances remain unchanged.
- **Root Reactor = reconstruction and understanding.** `DOUBLE → +1 → square/cube ROOT → −1 → HALF` explains why a sizing exists.
- **Live Table / Table Zero = contextual execution.** `effective stack + pot + street → SPR → geometric % ↔ actual BB action` under one uninterrupted response timer.

A Live Table answer may be committed in either `% POT` or `BB`. BB submissions are converted back with `submittedPct = submittedBB / pot × 100` and graded against the same percentage-point tolerance as a percentage submission. Unit choice does not change score, difficulty, latency targets, or concept history.

## Non-negotiable mathematical truth

For heads-up bet/call action with `n` betting streets remaining and effective-stack-to-pot ratio `SPR`:

`b = ((1 + 2*SPR) ** (1/n) - 1) / 2`

where `b` is the constant bet size as a fraction of the pot.

Therefore:

- 2 streets: `b = (sqrt(1 + 2*SPR) - 1) / 2`
- 3 streets: `b = (cuberoot(1 + 2*SPR) - 1) / 2`

The production canonical implementation lives in `src/core/geometry.ts`; UI components must consume it rather than reproduce the formula.

Important anchor values:

### 3 streets
- SPR 2 → 35.5%
- SPR 3 → 45.6%
- SPR 4 → 54.0%
- SPR 5 → 61.2%
- SPR 6 → 67.6%

Memory chant: `2–35 · 3–46 · 4–54 · 5–61 · 6–68`

### 2 streets
- SPR 1 → 36.6%
- SPR 1.5 → 50.0%
- SPR 2 → 61.8%
- SPR 3 → 82.3%
- SPR 4 → 100.0%

Memory chant: `1–37 · 1.5–50 · 2–62 · 3–82 · 4–POT`

Golden anchors:
- SPR 4, 3 streets → ~54% / 54% / 54%
- SPR 4, 2 streets → pot / pot
- SPR 1.5, 2 streets → half / half

## Meaningful mnemonic

Do not merely show a formula. Engineer the explanation so each operation has semantic meaning.

Mnemonic pipeline:

1. **DOUBLE**: `2 × SPR` because two effective stacks must ultimately enter the pot.
2. **PLUS ONE**: `+1` for the pot that already exists. This yields the final pot multiple `1 + 2SPR`.
3. **ROOT**: nth root distributes required pot growth evenly across the remaining streets.
4. **MINUS ONE**: remove the original-pot portion of each street's growth multiplier.
5. **HALF**: a bet/call adds two equal contributions, so divide by two to recover one player's bet fraction.

Short reconstruction chant:

`2S + 1 → ROOT → −1 → ÷2`

Square root for 2 streets; cube root for 3 streets.

Also explain the underlying identity:

`(1 + 2b)^n = 1 + 2SPR`

because a bet of `b × pot` that is called multiplies the pot by `1 + 2b`.

## Learning design requirements

Use evidence-based memory mechanics in the interaction design, not as decorative text:

- **Active retrieval:** ask for the answer before showing it.
- **Generation effect:** user commits a numeric answer rather than choosing from obvious multiple choice.
- **Immediate corrective feedback:** show correct answer and reconstruction after each miss.
- **Error repair:** after a miss, tell the user to say the anchor mapping three times and schedule it to reappear after a short delay rather than immediately.
- **Spaced retrieval within session:** missed/weak items recur after a few other questions.
- **Adaptive weighting:** weak anchors and missed anchors appear more often.
- **Interleaving:** mix 2-street and 3-street cases.
- **Dual coding:** pair numbers with visual pot-growth representations.
- **Chunking:** teach the two anchor chants as small ordered ladders.
- **Transfer-appropriate practice:** include actual pot and effective-stack values, requiring the user to derive SPR and then the sizing.
- **Mastery visibility:** show per-anchor strength/miss counts, but do not turn the app into a noisy dashboard.

The app's primary habit loop should be:

1. Recite the two anchor ladders.
2. Do ~10 fast retrieval trials.
3. Do ~3 real-hand transfer trials.

Make this feel like a 3-minute pre-session ritual.

## UX / ergonomics

- Mobile-first enough to work comfortably on iPhone, but excellent on desktop.
- Dark poker/SPACE KO visual language without over-decoration.
- Fast, tap-friendly controls.
- No hover-only essential information.
- Keep the primary workflow obvious; do not force the user to hunt through sidebars.
- Avoid clutter and long prose walls.
- Use tabs or a similarly clear information architecture.
- The drill screen should make the prompt visually dominant.
- After feedback, a clear single “Next retrieval” action should advance the loop.
- Learning history, mastery, latency, rank, and records persist locally with backward-compatible profile migration.

## Required experiences

### 1. Learn the loop
A visually encoded mnemonic pipeline and concise derivation. The user should understand why each operation exists.

### 2. Anchor memory ladder
Show 2-street and 3-street anchor sequences, with the three golden anchors emphasized.

### 3. Reflex drill
- Random/interleaved anchor prompts.
- Numeric answer input.
- ±3 percentage points counts as correct for anchor drill.
- Track attempts, accuracy, current streak, best streak.
- Maintain a 0–5 mastery score per anchor.
- Missed cards should reappear after a short delay and receive greater future weight.

### 4. Real-hand transfer
Inputs / drills based on actual values, for example:
- pot = 11.4bb
- effective stack = 37bb
- streets = 3

User must move through:
`37 / 11.4 → SPR → geometric % → actual BB action`

Table Zero accepts either the strategic percentage or its equivalent BB action; it never requires both.

### 5. Street-by-street stackoff visualization
Given pot, effective stack and streets, show for every street:
- pot before bet
- geometric percentage
- hero bet in BB
- villain call in BB
- pot after call
- remaining effective stack

The last street must exhaust the effective stack (up to floating-point tolerance).

### 6. Interactive 3D stackoff scene
The production `StackoffScene` uses Three.js to make the selected line's consequence tangible. It supports drag inspection, animates the remaining stack and live pot through the street gates, and pairs the scene with the explicit BB action schedule. A CSS fallback preserves the same instructional state when WebGL is unavailable.

### 7. SPACE KO tools preservation
The existing app has useful bounty conversion / all-in equity utilities. Preserve these in a separate tab so they do not interfere with the geometry-memory loop. Treat the legacy bounty-pool assumption as approximate and label it as such.

Remove or repair the broken hand logger: the current file references `s_token` and `s_blinds` after those inputs were commented out. Do not ship runtime NameErrors.

## Architecture

V5 keeps domain logic independently testable and the production UI thin:

- `src/core/geometry.ts`: geometric fraction, SPR, `% ↔ BB` conversions, and conserving street schedules.
- `src/core/questions.ts`: deterministic generation plus representation-aware answer grading.
- `src/App.tsx`: run lifecycle, latency capture, scoring, scheduler updates, and persistence orchestration.
- `src/game/GameScreen.tsx`: Live Table unit interaction and compact dual-representation feedback.
- `src/game/StackoffScene.tsx`: Three.js consequence playback plus the explicit street-by-street BB action HUD.
- `src/screens/Academy.tsx`: permanently accessible How to Play and interactive formula explanation.
- `src/core/__tests__/` and `tests/e2e/`: deterministic math/regression coverage and 390×844 / 1440×900 browser acceptance.

Profile schema and concept IDs remain compatible, so V5 display and answer-unit additions do not reset existing mastery or history.

## Acceptance tests

At minimum verify:

1. `SPR 1.5, 2 streets == 50%` exactly (within floating tolerance).
2. `SPR 4, 2 streets == 100%` exactly.
3. `SPR 4, 3 streets ≈ 54.0041911526%`.
4. `pot=10, stack=40, streets=3` produces total hero contributions of 40bb and ends with 0bb remaining.
5. Final pot for that case is 90bb: starting 10bb + two 40bb stacks.
6. Invalid negative SPR / zero pot inputs are rejected cleanly.
7. `13.4 BB × 54% = 7.236 BB`, and converting back yields `54%`.
8. Equivalent `% POT` and `BB` Live Table answers cross the same grading boundary.
9. Switching answer units does not reset committed-answer latency.
10. Post-answer feedback exposes both representations and every street's pot, bet/call, and remaining stack.
11. The production bundle builds and the browser flow passes without console errors or page overflow at 390×844 and 1440×900.

## Product standard

This should not feel like a calculator with educational copy attached. It should feel like a deliberately engineered learning instrument.

The key measure of success is whether, after repeated use, the user sees `SPR 4 + 3 streets` and reflexively thinks `54%`, while still being able to reconstruct the answer from first principles when an unfamiliar SPR appears.
