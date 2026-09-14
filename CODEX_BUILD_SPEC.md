# Geometry Reflex Lab — Codex Build Specification

## Product goal

Rebuild this Streamlit app into a highly interactive educational trainer that makes geometric bet sizing in NLHE MTTs automatic rather than merely understandable.

The user plays €10–€20 Winamax MTTs, especially SPACE KO, and already thinks in position and effective stacks. The learning target is the post-flop reflex:

> effective stack → pot → SPR → streets remaining → geometric % pot → actual bb bet

The app must teach, drill, test, visualize, and reinforce this loop until the mapping is owned by the user.

## Non-negotiable mathematical truth

For heads-up bet/call action with `n` betting streets remaining and effective-stack-to-pot ratio `SPR`:

`b = ((1 + 2*SPR) ** (1/n) - 1) / 2`

where `b` is the constant bet size as a fraction of the pot.

Therefore:

- 2 streets: `b = (sqrt(1 + 2*SPR) - 1) / 2`
- 3 streets: `b = (cuberoot(1 + 2*SPR) - 1) / 2`

The current `streamlit_app.py` uses an incorrect geometric-sizing expression based on `(pot + stack) / pot`. Replace it.

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
- Session state may reset when the Streamlit session resets; persistence is optional, not required for V1.

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
`37 / 11.4 → SPR → geometric % → actual bb bet`

Include a live calculator and a transfer quiz mode.

### 5. Street-by-street stackoff visualization
Given pot, effective stack and streets, show for every street:
- pot before bet
- bet in bb
- bet as % pot
- pot after call
- remaining effective stack

The last street must exhaust the effective stack (up to floating-point tolerance).

### 6. Interactive 3D geometry map
Use Plotly 3D.
- X = SPR
- Y = streets remaining
- Z = geometric bet %
- highlight the real ridges for 2 and 3 streets
- plot anchor points with labels
- allow rotate / pan / zoom
- provide a slider to highlight a selected SPR and a 2-vs-3 street switch
- explain what moving across the surface means

The surface between 2 and 3 streets can be used as an educational interpolation, but label that only integer street counts are actual poker decisions.

### 7. SPACE KO tools preservation
The existing app has useful bounty conversion / all-in equity utilities. Preserve these in a separate tab so they do not interfere with the geometry-memory loop. Treat the legacy bounty-pool assumption as approximate and label it as such.

Remove or repair the broken hand logger: the current file references `s_token` and `s_blinds` after those inputs were commented out. Do not ship runtime NameErrors.

## Architecture

Prefer a small pure-Python math module plus Streamlit UI.

Suggested files:
- `geometry.py`: pure formula, SPR calculation, schedule generation, nearest anchor
- `streamlit_app.py`: application and session-state learning scheduler
- `tests/test_geometry.py`: deterministic unit tests for all math
- `requirements.txt`: Streamlit, Plotly, pandas, pytest if needed only for CI/dev

Do not put core math only inside UI callbacks.

## Acceptance tests

At minimum verify:

1. `SPR 1.5, 2 streets == 50%` exactly (within floating tolerance).
2. `SPR 4, 2 streets == 100%` exactly.
3. `SPR 4, 3 streets ≈ 54.0041911526%`.
4. `pot=10, stack=40, streets=3` produces total hero contributions of 40bb and ends with 0bb remaining.
5. Final pot for that case is 90bb: starting 10bb + two 40bb stacks.
6. Invalid negative SPR / zero pot inputs are rejected cleanly.
7. Streamlit app imports and starts without NameError.
8. 3D Plotly visualization renders without requiring external data.
9. Mobile layout does not depend on desktop hover.

## Product standard

This should not feel like a calculator with educational copy attached. It should feel like a deliberately engineered learning instrument.

The key measure of success is whether, after repeated use, the user sees `SPR 4 + 3 streets` and reflexively thinks `54%`, while still being able to reconstruct the answer from first principles when an unfamiliar SPR appears.
