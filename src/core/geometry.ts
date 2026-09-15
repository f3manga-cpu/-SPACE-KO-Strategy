import type { LinePoint, StreetsRemaining } from "./types";

export interface AnchorDefinition {
  id: string;
  spr: number;
  streets: StreetsRemaining;
  /** The deliberately rounded landmark the player memorises. */
  percent: number;
  exactPercent: number;
  rhythm: string;
}

export interface ReactorStage {
  id: "spr" | "double" | "add-one" | "root" | "minus-one" | "half";
  label: string;
  value: number;
}

export interface LineOutcome {
  schedule: LinePoint[];
  status: "converged" | "residue" | "exhausted-early";
  stackDelta: number;
  exhaustionStreet: number | null;
}

const assertFinite = (value: number, name: string): void => {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
};

const normaliseZero = (value: number): number =>
  Math.abs(value) < 1e-10 ? 0 : value;

/** Constant fraction of the pot that geometrically stacks off in n streets. */
export function geometricBetFraction(spr: number, streets: number): number {
  assertFinite(spr, "SPR");
  assertFinite(streets, "streets");
  if (spr < 0) throw new RangeError("SPR must be non-negative");
  if (streets < 1) throw new RangeError("streets must be at least 1");
  return (Math.pow(1 + 2 * spr, 1 / streets) - 1) / 2;
}

export function geometricBetPercent(spr: number, streets: number): number {
  return geometricBetFraction(spr, streets) * 100;
}

/** Inverse of geometricBetFraction, useful for Ghost Line questions. */
export function sprFromBetFraction(fraction: number, streets: number): number {
  assertFinite(fraction, "fraction");
  assertFinite(streets, "streets");
  if (fraction < 0) throw new RangeError("fraction must be non-negative");
  if (streets < 1) throw new RangeError("streets must be at least 1");
  return (Math.pow(1 + 2 * fraction, streets) - 1) / 2;
}

export function sprFromPotStack(pot: number, effectiveStack: number): number {
  assertFinite(pot, "pot");
  assertFinite(effectiveStack, "effective stack");
  if (pot <= 0) throw new RangeError("pot must be greater than zero");
  if (effectiveStack < 0) {
    throw new RangeError("effective stack must be non-negative");
  }
  return effectiveStack / pot;
}

export function betAmount(pot: number, percent: number): number {
  assertFinite(pot, "pot");
  assertFinite(percent, "percent");
  if (pot <= 0) throw new RangeError("pot must be greater than zero");
  if (percent < 0) throw new RangeError("percent must be non-negative");
  return pot * (percent / 100);
}

/**
 * Simulate equal percentage bets.  Unlike the equation helper this accepts an
 * arbitrary answer, allowing feedback to show residue or early exhaustion.
 */
export function streetScheduleForFraction(
  pot: number,
  effectiveStack: number,
  streets: number,
  fraction: number,
): LinePoint[] {
  sprFromPotStack(pot, effectiveStack);
  assertFinite(streets, "streets");
  assertFinite(fraction, "fraction");
  if (!Number.isInteger(streets) || streets < 1) {
    throw new RangeError("streets must be a positive integer");
  }
  if (fraction < 0) throw new RangeError("fraction must be non-negative");

  let currentPot = pot;
  let remaining = effectiveStack;
  const schedule: LinePoint[] = [];

  for (let streetIndex = 1; streetIndex <= streets; streetIndex += 1) {
    const wantedBet = currentPot * fraction;
    const bet = Math.min(remaining, wantedBet);
    remaining = normaliseZero(Math.max(0, remaining - bet));
    const potAfterCall = currentPot + 2 * bet;
    schedule.push({
      streetIndex,
      potBefore: currentPot,
      bet,
      potAfterCall,
      stackRemaining: remaining,
    });
    currentPot = potAfterCall;
  }
  return schedule;
}

export function streetSchedule(
  pot: number,
  effectiveStack: number,
  streets: number,
): LinePoint[] {
  const spr = sprFromPotStack(pot, effectiveStack);
  return streetScheduleForFraction(
    pot,
    effectiveStack,
    streets,
    geometricBetFraction(spr, streets),
  );
}

export function analyseLine(
  pot: number,
  effectiveStack: number,
  streets: number,
  fraction: number,
  toleranceBb = 0.01,
): LineOutcome {
  const schedule = streetScheduleForFraction(pot, effectiveStack, streets, fraction);
  const last = schedule.at(-1);
  const remaining = last?.stackRemaining ?? effectiveStack;
  const exactFraction = geometricBetFraction(
    sprFromPotStack(pot, effectiveStack),
    streets,
  );
  const exhaustion = schedule.find(
    (step) => step.stackRemaining <= toleranceBb && step.streetIndex < streets,
  );

  let status: LineOutcome["status"];
  if (Math.abs(fraction - exactFraction) <= 0.002) {
    status = "converged";
  } else if (fraction > exactFraction) {
    // Even when the excess is only exposed by a smaller forced all-in on the
    // final street, the chosen constant geometry exhausted its runway.
    status = "exhausted-early";
  } else {
    status = "residue";
  }

  return {
    schedule,
    status,
    stackDelta: remaining,
    exhaustionStreet: exhaustion?.streetIndex ?? null,
  };
}

export function rootReactorStages(spr: number, streets: number): ReactorStage[] {
  assertFinite(spr, "SPR");
  assertFinite(streets, "streets");
  if (spr < 0) throw new RangeError("SPR must be non-negative");
  if (streets < 1) throw new RangeError("streets must be at least 1");
  const doubled = 2 * spr;
  const plusPot = doubled + 1;
  const rooted = Math.pow(plusPot, 1 / streets);
  const minusExisting = rooted - 1;
  return [
    { id: "spr", label: "SPR", value: spr },
    { id: "double", label: "DOUBLE", value: doubled },
    { id: "add-one", label: "+ ONE POT", value: plusPot },
    {
      id: "root",
      label: streets === 2 ? "SQUARE ROOT" : streets === 3 ? "CUBE ROOT" : `${streets}th ROOT`,
      value: rooted,
    },
    { id: "minus-one", label: "− ONE POT", value: minusExisting },
    { id: "half", label: "HALF", value: minusExisting / 2 },
  ];
}

const RAW_ANCHORS: ReadonlyArray<
  Omit<AnchorDefinition, "id" | "exactPercent" | "rhythm">
> = [
  { spr: 2, streets: 3, percent: 35 },
  { spr: 3, streets: 3, percent: 46 },
  { spr: 4, streets: 3, percent: 54 },
  { spr: 5, streets: 3, percent: 61 },
  { spr: 6, streets: 3, percent: 68 },
  { spr: 1, streets: 2, percent: 37 },
  { spr: 1.5, streets: 2, percent: 50 },
  { spr: 2, streets: 2, percent: 62 },
  { spr: 3, streets: 2, percent: 82 },
  { spr: 4, streets: 2, percent: 100 },
];

export const anchorConceptId = (streets: StreetsRemaining, spr: number): string =>
  `anchor:${streets}:${spr}`;

export const ANCHORS: readonly AnchorDefinition[] = Object.freeze(
  RAW_ANCHORS.map((anchor) =>
    Object.freeze({
      ...anchor,
      id: anchorConceptId(anchor.streets, anchor.spr),
      exactPercent: geometricBetPercent(anchor.spr, anchor.streets),
      rhythm: `${anchor.spr}–${anchor.percent === 100 ? "POT" : anchor.percent}`,
    }),
  ),
);

export const THREE_STREET_ANCHORS = ANCHORS.filter(
  (anchor) => anchor.streets === 3,
);
export const TWO_STREET_ANCHORS = ANCHORS.filter(
  (anchor) => anchor.streets === 2,
);

export function getAnchor(
  spr: number,
  streets: StreetsRemaining,
): AnchorDefinition | undefined {
  return ANCHORS.find(
    (anchor) => anchor.streets === streets && Math.abs(anchor.spr - spr) < 1e-9,
  );
}

export function nearestAnchor(
  spr: number,
  streets: StreetsRemaining,
): AnchorDefinition {
  assertFinite(spr, "SPR");
  const pool = streets === 2 ? TWO_STREET_ANCHORS : THREE_STREET_ANCHORS;
  return pool.reduce((nearest, anchor) =>
    Math.abs(anchor.spr - spr) < Math.abs(nearest.spr - spr) ? anchor : nearest,
  );
}

export function qualitativeBetBand(
  percent: number,
): "small" | "medium" | "large" | "pot" | "overbet" {
  assertFinite(percent, "percent");
  if (percent < 0) throw new RangeError("percent must be non-negative");
  if (percent < 45) return "small";
  if (percent < 67) return "medium";
  if (percent < 92) return "large";
  if (percent <= 110) return "pot";
  return "overbet";
}

export const THREE_STREET_RHYTHM = "2–35 · 3–46 · 4–54 · 5–61 · 6–68";
export const TWO_STREET_RHYTHM = "1–37 · 1.5–50 · 2–62 · 3–82 · 4–POT";
export const ROOT_REACTOR_MNEMONIC = "DOUBLE → +1 → ROOT → −1 → HALF";
