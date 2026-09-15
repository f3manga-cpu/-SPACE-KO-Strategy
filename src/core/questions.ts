import {
  ANCHORS,
  TWO_STREET_ANCHORS,
  THREE_STREET_ANCHORS,
  anchorConceptId,
  bbToPercent,
  geometricBetPercent,
  getAnchor,
  nearestAnchor,
  percentToBb,
  qualitativeBetBand,
  rootReactorStages,
  sprFromPotStack,
  streetSchedule,
} from "./geometry";
import { createRng, pick, range, shuffle } from "./random";
import type {
  AnswerValue,
  ErrorDirection,
  LiveTableAnswerUnit,
  Question,
  QuestionChoice,
  QuestionType,
  ScaffoldLevel,
  StreetsRemaining,
} from "./types";

const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));
const round = (value: number, precision = 1): number => {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export interface QuestionGenerationOptions {
  type: QuestionType;
  seed: number;
  difficulty?: number;
  scaffoldLevel?: ScaffoldLevel;
  conceptId?: string;
}

export interface AnswerEvaluation {
  correct: boolean;
  response: AnswerValue;
  expected: AnswerValue;
  numericError: number | null;
  errorDirection: ErrorDirection;
  /** Raw value committed by the player before representation normalisation. */
  submittedValue?: AnswerValue;
  /** Representation used for a Live Table commitment. */
  responseUnit?: LiveTableAnswerUnit;
  /** Canonical percentage-of-pot value used to grade a Live Table answer. */
  responsePercent?: number | null;
}

const questionId = (type: QuestionType, seed: number, conceptId: string): string =>
  `q-${type}-${seed >>> 0}-${conceptId.replace(/[^a-z0-9]+/gi, "-")}`;

const choiceId = (value: AnswerValue): string =>
  `choice-${String(value).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

const makeChoices = (
  values: readonly AnswerValue[],
  unit: "percent" | "spr" | "bb" | "plain",
  rng: () => number,
): QuestionChoice[] =>
  shuffle(
    [...new Map(values.map((value) => [String(value), value])).values()].map((value) => ({
      id: choiceId(value),
      label:
        unit === "percent"
          ? `${value}%`
          : unit === "bb"
            ? `${value}bb`
            : String(value),
      value,
    })),
    rng,
  );

const parseAnchorId = (id?: string) => {
  if (!id) return undefined;
  const match = /^anchor:(2|3):([0-9.]+)$/.exec(id);
  if (!match) return undefined;
  return getAnchor(Number(match[2]), Number(match[1]) as StreetsRemaining);
};

const canonicalPercent = (spr: number, streets: StreetsRemaining): number =>
  getAnchor(spr, streets)?.percent ?? round(geometricBetPercent(spr, streets), 1);

function generateAnchor(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const anchor = parseAnchorId(options.conceptId) ?? pick(ANCHORS, rng);
  const responseMode = options.scaffoldLevel >= 2 ? "choice" : "numeric";
  const sameStreetAnchors = anchor.streets === 2 ? TWO_STREET_ANCHORS : THREE_STREET_ANCHORS;
  const rankedDistractors = sameStreetAnchors
    .filter((candidate) => candidate.id !== anchor.id)
    .sort(
      (left, right) =>
        Math.abs(left.percent - anchor.percent) - Math.abs(right.percent - anchor.percent),
    );
  // Strong novice scaffolds use visibly separated alternatives. Similar
  // distractors arrive only after the representation is understood.
  const neighborPercents = (options.scaffoldLevel === 3
    ? [...rankedDistractors].reverse().slice(0, 2)
    : rankedDistractors.slice(0, 3))
    .map((candidate) => candidate.percent);
  const choices = responseMode === "choice"
    ? makeChoices([anchor.percent, ...neighborPercents], "percent", rng)
    : undefined;
  return {
    id: questionId("anchor", options.seed, anchor.id),
    seed: options.seed,
    type: "anchor",
    family: anchor.streets === 2 ? "anchor-two" : "anchor-three",
    primaryConceptId: anchor.id,
    conceptIds: [anchor.id, `runway:${anchor.streets === 2 ? "two" : "three"}`],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: `SPR ${anchor.spr} · ${anchor.streets} STREETS`,
    instruction: responseMode === "choice" ? "Lock the geometric sizing" : "Recall the sizing",
    responseMode,
    expectedAnswer: anchor.percent,
    tolerance: options.scaffoldLevel === 0 ? 1 : 0.01,
    unit: "percent",
    choices,
    context: {
      spr: anchor.spr,
      streetsRemaining: anchor.streets,
      targetPercent: anchor.percent,
      nearestAnchorSpr: anchor.spr,
      landmark: true,
      line: streetSchedule(10, anchor.spr * 10, anchor.streets),
    },
    explanation: `SPR ${anchor.spr} with ${anchor.streets} streets converges at about ${anchor.percent}% pot each street.`,
    timeTargetMs: options.scaffoldLevel === 0 ? 2_400 : 3_600,
  };
}

function generateSprSnap(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const anchorMode = options.difficulty < 0.48;
  const targetSpr = anchorMode
    ? pick(ANCHORS, rng).spr
    : round(range(rng, 0.85, 6.4), 1);
  const pots = [6.4, 7.5, 8.8, 10, 11.8, 13.5, 16.2, 19.5];
  const potBb = pick(pots, rng);
  const effectiveStackBb = round(potBb * targetSpr, 1);
  const actualSpr = sprFromPotStack(potBb, effectiveStackBb);
  const expected = round(actualSpr, 1);
  const numeric = options.scaffoldLevel <= 1 && options.difficulty >= 0.35;
  const distractorStep = options.difficulty > 0.7 ? 0.3 : 0.5;
  const choices = numeric
    ? undefined
    : makeChoices(
        [
          expected,
          round(Math.max(0.2, expected - distractorStep), 1),
          round(expected + distractorStep, 1),
          round(expected + distractorStep * 2, 1),
        ],
        "spr",
        rng,
      );
  return {
    id: questionId("spr-snap", options.seed, "spr:recognition"),
    seed: options.seed,
    type: "spr-snap",
    family: "spr-recognition",
    primaryConceptId: "spr:recognition",
    conceptIds: ["spr:recognition"],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: `${effectiveStackBb}bb BEHIND · ${potBb}bb POT`,
    instruction: "Snap the effective SPR",
    responseMode: numeric ? "numeric" : "choice",
    expectedAnswer: expected,
    tolerance: options.difficulty > 0.75 ? 0.12 : 0.2,
    unit: "spr",
    choices,
    context: {
      spr: actualSpr,
      potBb,
      effectiveStackBb,
      nearestAnchorSpr: nearestAnchor(actualSpr, actualSpr <= 4 ? 2 : 3).spr,
      landmark: anchorMode,
    },
    explanation: `${effectiveStackBb} ÷ ${potBb} ≈ ${expected}, so the effective SPR is ${expected}.`,
    timeTargetMs: Math.round(4_200 - options.difficulty * 1_900),
  };
}

function streetFromConcept(id: string | undefined, rng: () => number): StreetsRemaining {
  if (id?.endsWith(":two") || id?.endsWith(":turn")) return 2;
  if (id?.endsWith(":three") || id?.endsWith(":flop")) return 3;
  return rng() < 0.5 ? 2 : 3;
}

function generateRunway(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const streets = streetFromConcept(options.conceptId, rng);
  const pool = streets === 2 ? TWO_STREET_ANCHORS : THREE_STREET_ANCHORS;
  const anchor = pick(pool, rng);
  const percent = anchor.percent;
  const qualitative = options.difficulty < 0.44;
  const band = qualitativeBetBand(percent);
  const numericChoices = makeChoices(
    [
      percent,
      ...pool
        .filter((candidate) => candidate.id !== anchor.id)
        .sort((a, b) => Math.abs(a.percent - percent) - Math.abs(b.percent - percent))
        .slice(0, 3)
        .map((candidate) => candidate.percent),
    ],
    "percent",
    rng,
  );
  const qualitativeChoices = makeChoices(
    ["small", "medium", "large", "pot", ...(band === "overbet" ? ["overbet"] : [])],
    "plain",
    rng,
  );
  return {
    id: questionId("runway", options.seed, `runway:${streets === 2 ? "two" : "three"}`),
    seed: options.seed,
    type: "runway",
    family: "runway",
    primaryConceptId: `runway:${streets === 2 ? "two" : "three"}`,
    conceptIds: [`runway:${streets === 2 ? "two" : "three"}`, anchor.id],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: `SPR ${anchor.spr} · ${streets} GATES REMAIN`,
    instruction: qualitative ? "Read the pressure the runway demands" : "Set the exact pressure",
    responseMode: qualitative ? "qualitative" : options.scaffoldLevel >= 2 ? "choice" : "numeric",
    expectedAnswer: qualitative ? band : percent,
    tolerance: qualitative ? 0 : options.scaffoldLevel === 0 ? 1.5 : 0.01,
    unit: qualitative ? "category" : "percent",
    choices: qualitative ? qualitativeChoices : options.scaffoldLevel >= 2 ? numericChoices : undefined,
    context: {
      spr: anchor.spr,
      streetsRemaining: streets,
      targetPercent: percent,
      qualitativeBand: band,
      landmark: true,
    },
    explanation: `${streets} streets must absorb SPR ${anchor.spr}; equal growth needs about ${percent}% pot per gate.`,
    timeTargetMs: qualitative ? 3_400 : 3_000,
  };
}

function generatePrecision(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const streets = streetFromConcept(options.conceptId, rng);
  const spr = round(
    streets === 2 ? range(rng, 0.75, 4.8) : range(rng, 1.55, 7.2),
    1,
  );
  const exact = geometricBetPercent(spr, streets);
  const expected = round(exact, 1);
  const tolerance = round(5 - options.difficulty * 3.5, 1);
  const choices = options.scaffoldLevel >= 2
    ? makeChoices(
        [expected, round(expected - tolerance * 1.8, 1), round(expected + tolerance * 1.8, 1), round(expected + tolerance * 3, 1)],
        "percent",
        rng,
      )
    : undefined;
  return {
    id: questionId("precision", options.seed, `precision:${streets === 2 ? "two" : "three"}`),
    seed: options.seed,
    type: "precision",
    family: "precision",
    primaryConceptId: `precision:${streets === 2 ? "two" : "three"}`,
    conceptIds: [`precision:${streets === 2 ? "two" : "three"}`, nearestAnchor(spr, streets).id],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: `SPR ${spr} · ${streets} STREETS`,
    instruction: `Forge within ±${tolerance}%`,
    responseMode: choices ? "choice" : "numeric",
    expectedAnswer: expected,
    tolerance,
    unit: "percent",
    choices,
    context: {
      spr,
      streetsRemaining: streets,
      targetPercent: exact,
      nearestAnchorSpr: nearestAnchor(spr, streets).spr,
      landmark: Boolean(getAnchor(spr, streets)),
    },
    explanation: `DOUBLE → +1 → ${streets === 2 ? "square" : "cube"} root → −1 → half gives ${expected}% pot.`,
    timeTargetMs: Math.round(6_500 - options.difficulty * 2_500),
  };
}

function generateTransfer(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const streets = streetFromConcept(options.conceptId, rng);
  const landmark = options.difficulty < 0.45;
  const pool = streets === 2 ? TWO_STREET_ANCHORS : THREE_STREET_ANCHORS;
  const spr = landmark ? pick(pool, rng).spr : round(streets === 2 ? range(rng, 0.9, 4.5) : range(rng, 1.7, 6.6), 1);
  const potBb = round(pick([6.6, 7.4, 8.8, 9.5, 11.8, 13.2, 15.5, 18.4], rng), 1);
  const effectiveStackBb = round(potBb * spr, 1);
  const actualSpr = sprFromPotStack(potBb, effectiveStackBb);
  const targetPercent = geometricBetPercent(actualSpr, streets);
  const displayedTargetPercent = round(targetPercent, 1);
  // Live Table has one strategic tolerance, expressed in percentage points.
  // BB answers are converted back to % pot before this tolerance is applied.
  const percentTolerance = 6 - options.difficulty * 3.5;
  const targetBetBb = round(percentToBb(potBb, targetPercent), 1);
  const choices = options.scaffoldLevel >= 2
    ? makeChoices(
        [
          displayedTargetPercent,
          round(Math.max(0.1, displayedTargetPercent - percentTolerance * 2), 1),
          round(displayedTargetPercent + percentTolerance * 2, 1),
          round(displayedTargetPercent + percentTolerance * 3.5, 1),
        ],
        "percent",
        rng,
      )
    : undefined;
  const conceptId = `transfer:${streets === 2 ? "turn" : "flop"}`;
  return {
    id: questionId("transfer", options.seed, conceptId),
    seed: options.seed,
    type: "transfer",
    family: "table-transfer",
    primaryConceptId: conceptId,
    conceptIds: [conceptId, "spr:recognition", nearestAnchor(actualSpr, streets).id],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: `${potBb}bb POT · ${effectiveStackBb}bb EFFECTIVE`,
    instruction: `${streets === 3 ? "FLOP" : "TURN"} — commit your bet`,
    responseMode: choices ? "choice" : "numeric",
    expectedAnswer: targetPercent,
    tolerance: percentTolerance,
    unit: "percent",
    acceptedUnits: ["percent", "bb"],
    choices,
    context: {
      spr: actualSpr,
      streetsRemaining: streets,
      potBb,
      effectiveStackBb,
      targetPercent,
      targetBetBb,
      nearestAnchorSpr: nearestAnchor(actualSpr, streets).spr,
      landmark,
      line: streetSchedule(potBb, effectiveStackBb, streets),
    },
    explanation: `${effectiveStackBb} ÷ ${potBb} ≈ ${round(actualSpr, 1)} SPR; ${round(targetPercent)}% pot is ${targetBetBb}bb.`,
    timeTargetMs: Math.round(7_000 - options.difficulty * 3_100),
  };
}

function generateContrast(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const iconic = options.conceptId === "contrast:spr4" || options.difficulty < 0.45;
  const baseSpr = iconic ? 4 : round(range(rng, 1.8, 4.3), 1);
  const firstSpr = baseSpr;
  const secondSpr = iconic ? baseSpr : round(clamp(baseSpr + (rng() < 0.5 ? -0.5 : 0.5), 0.8, 6), 1);
  const raw = [
    {
      label: "A",
      spr: firstSpr,
      streetsRemaining: 3 as const,
      targetPercent: canonicalPercent(firstSpr, 3),
    },
    {
      label: "B",
      spr: secondSpr,
      streetsRemaining: 2 as const,
      targetPercent: canonicalPercent(secondSpr, 2),
    },
  ];
  const comparison = (rng() < 0.5 ? raw : [raw[1]!, raw[0]!]).map((item, index) => ({
    ...item,
    label: index === 0 ? "A" : "B",
  })) as [typeof raw[number], typeof raw[number]];
  const winner = comparison[0].targetPercent === comparison[1].targetPercent
    ? "SAME"
    : comparison[0].targetPercent > comparison[1].targetPercent ? "A" : "B";
  const conceptId = iconic ? "contrast:spr4" : "contrast:neighbors";
  return {
    id: questionId("contrast", options.seed, conceptId),
    seed: options.seed,
    type: "contrast",
    family: "contrast",
    primaryConceptId: conceptId,
    conceptIds: [
      conceptId,
      anchorConceptId(comparison[0].streetsRemaining, comparison[0].spr),
      anchorConceptId(comparison[1].streetsRemaining, comparison[1].spr),
    ],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: "WHICH LINE NEEDS MORE PRESSURE?",
    instruction: "Discriminate before calculating",
    responseMode: "choice",
    expectedAnswer: winner,
    tolerance: 0,
    unit: "category",
    choices: makeChoices(["A", "B", "SAME"], "plain", rng),
    context: { comparison, landmark: iconic },
    explanation: `A needs ${round(comparison[0].targetPercent)}%; B needs ${round(comparison[1].targetPercent)}%. Fewer streets demand more pressure.`,
    timeTargetMs: Math.round(3_600 - options.difficulty * 1_500),
  };
}

function generateGhostLine(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const anchor = pick(ANCHORS, rng);
  const label = `${anchor.spr} / ${anchor.streets}`;
  const sameStreet = anchor.streets === 2 ? TWO_STREET_ANCHORS : THREE_STREET_ANCHORS;
  const nearby = sameStreet
    .filter((candidate) => candidate.id !== anchor.id)
    .sort((a, b) => Math.abs(a.spr - anchor.spr) - Math.abs(b.spr - anchor.spr))
    .slice(0, 2)
    .map((candidate) => `${candidate.spr} / ${candidate.streets}`);
  const cross = `${anchor.spr} / ${anchor.streets === 2 ? 3 : 2}`;
  return {
    id: questionId("ghost-line", options.seed, "inverse:ghost"),
    seed: options.seed,
    type: "ghost-line",
    family: "inverse-geometry",
    primaryConceptId: "inverse:ghost",
    conceptIds: ["inverse:ghost", anchor.id],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: "READ THE GHOST TRAJECTORY",
    instruction: "Identify SPR / runway from pot growth alone",
    responseMode: "choice",
    expectedAnswer: label,
    tolerance: 0,
    unit: "category",
    choices: makeChoices([label, ...nearby, cross], "plain", rng),
    context: {
      spr: anchor.spr,
      streetsRemaining: anchor.streets,
      targetPercent: anchor.percent,
      line: streetSchedule(1, anchor.spr, anchor.streets),
      landmark: true,
    },
    explanation: `${anchor.streets} equal growth gates at about ${anchor.percent}% consume an SPR of ${anchor.spr}.`,
    timeTargetMs: Math.round(5_200 - options.difficulty * 1_800),
  };
}

const REACTOR_SEQUENCE = ["DOUBLE", "+1", "ROOT", "−1", "HALF"] as const;

function generateRootReactor(options: Required<QuestionGenerationOptions>): Question {
  const rng = createRng(options.seed);
  const streets = streetFromConcept(options.conceptId, rng);
  const spr = round(streets === 2 ? range(rng, 0.9, 4.6) : range(rng, 1.8, 6.8), 1);
  const stages = rootReactorStages(spr, streets);
  const conceptId = `root:${streets === 2 ? "two" : "three"}`;
  if (options.difficulty < 0.34) {
    return {
      id: questionId("root-reactor", options.seed, conceptId),
      seed: options.seed,
      type: "root-reactor",
      family: "root-method",
      primaryConceptId: conceptId,
      conceptIds: [conceptId],
      difficulty: options.difficulty,
      scaffoldLevel: options.scaffoldLevel,
      prompt: "ROUTE THE REACTOR",
      instruction: "Build the fallback sequence",
      responseMode: "sequence",
      expectedAnswer: REACTOR_SEQUENCE.join("|"),
      tolerance: 0,
      unit: "sequence",
      choices: makeChoices(REACTOR_SEQUENCE, "plain", rng),
      context: { spr, streetsRemaining: streets, reactorSteps: REACTOR_SEQUENCE },
      explanation: "DOUBLE → +1 → ROOT → −1 → HALF converts SPR into a geometric pot fraction.",
      timeTargetMs: 7_000,
    };
  }
  if (options.difficulty < 0.66) {
    const maskedIndex = 1 + Math.floor(rng() * 4);
    const expected = REACTOR_SEQUENCE[maskedIndex]!;
    return {
      id: questionId("root-reactor", options.seed, conceptId),
      seed: options.seed,
      type: "root-reactor",
      family: "root-method",
      primaryConceptId: conceptId,
      conceptIds: [conceptId],
      difficulty: options.difficulty,
      scaffoldLevel: options.scaffoldLevel,
      prompt: `SPR ${spr} · ${streets === 2 ? "SQUARE" : "CUBE"} REACTOR`,
      instruction: "Restore the missing operation",
      responseMode: "choice",
      expectedAnswer: expected,
      tolerance: 0,
      unit: "category",
      choices: makeChoices(REACTOR_SEQUENCE, "plain", rng),
      context: {
        spr,
        streetsRemaining: streets,
        reactorSteps: REACTOR_SEQUENCE,
        maskedReactorIndex: maskedIndex,
      },
      explanation: `The operation is ${expected}; every stage preserves the physical stack-off story.`,
      timeTargetMs: 5_000,
    };
  }
  const expected = round(geometricBetPercent(spr, streets), 1);
  const tolerance = round(5 - options.difficulty * 3.2, 1);
  return {
    id: questionId("root-reactor", options.seed, conceptId),
    seed: options.seed,
    type: "root-reactor",
    family: "root-method",
    primaryConceptId: conceptId,
    conceptIds: [conceptId, `precision:${streets === 2 ? "two" : "three"}`],
    difficulty: options.difficulty,
    scaffoldLevel: options.scaffoldLevel,
    prompt: `SPR ${spr} · ${streets} STREETS`,
    instruction: "Run the reactor and output the sizing",
    responseMode: "numeric",
    expectedAnswer: expected,
    tolerance,
    unit: "percent",
    context: {
      spr,
      streetsRemaining: streets,
      targetPercent: expected,
      reactorSteps: stages.slice(1).map((stage) => stage.label),
    },
    explanation: `${stages.slice(1).map((stage) => stage.label).join(" → ")} = ${expected}% pot.`,
    timeTargetMs: 8_000,
  };
}

export function generateQuestion(options: QuestionGenerationOptions): Question {
  if (!Number.isFinite(options.seed)) throw new RangeError("seed must be finite");
  const normalised: Required<QuestionGenerationOptions> = {
    ...options,
    seed: options.seed >>> 0,
    difficulty: clamp(options.difficulty ?? 0.5),
    scaffoldLevel: options.scaffoldLevel ?? 1,
    conceptId: options.conceptId ?? "",
  };
  switch (normalised.type) {
    case "anchor":
      return generateAnchor(normalised);
    case "spr-snap":
      return generateSprSnap(normalised);
    case "runway":
      return generateRunway(normalised);
    case "precision":
      return generatePrecision(normalised);
    case "transfer":
      return generateTransfer(normalised);
    case "contrast":
      return generateContrast(normalised);
    case "ghost-line":
      return generateGhostLine(normalised);
    case "root-reactor":
      return generateRootReactor(normalised);
  }
}

const normaliseText = (value: string): string =>
  value
    .trim()
    .toUpperCase()
    .replace(/->/g, "→")
    .replace(/-/g, "−")
    .replace(/\s+/g, "");

export function evaluateAnswer(
  question: Pick<Question, "expectedAnswer" | "tolerance"> & Partial<Pick<Question, "type" | "unit" | "context">>,
  response: AnswerValue,
  answerUnit?: LiveTableAnswerUnit,
): AnswerEvaluation {
  if (question.type === "transfer" && typeof question.expectedAnswer === "number") {
    const numericResponse =
      typeof response === "number"
        ? response
        : Number(String(response).trim().replace(/%|bb/gi, ""));
    const inferredUnit: LiveTableAnswerUnit = answerUnit
      ?? (typeof response === "string" && /bb\s*$/i.test(response.trim()) ? "bb" : question.unit === "bb" ? "bb" : "percent");
    const pot = question.context?.potBb;
    if (!Number.isFinite(numericResponse) || (inferredUnit === "bb" && (!Number.isFinite(pot) || Number(pot) <= 0))) {
      return {
        correct: false,
        response,
        expected: question.expectedAnswer,
        numericError: null,
        errorDirection: "conceptual",
        submittedValue: response,
        responseUnit: inferredUnit,
        responsePercent: null,
      };
    }
    const responsePercent = inferredUnit === "bb"
      ? numericResponse < 0 ? (numericResponse / Number(pot)) * 100 : bbToPercent(Number(pot), numericResponse)
      : numericResponse;
    const numericError = responsePercent - question.expectedAnswer;
    const correct = Math.abs(numericError) <= question.tolerance + 1e-9;
    return {
      correct,
      response: responsePercent,
      expected: question.expectedAnswer,
      numericError,
      errorDirection: correct ? "none" : numericError < 0 ? "low" : "high",
      submittedValue: numericResponse,
      responseUnit: inferredUnit,
      responsePercent,
    };
  }
  if (typeof question.expectedAnswer === "number") {
    const numericResponse =
      typeof response === "number"
        ? response
        : Number(String(response).trim().replace(/%|bb/gi, ""));
    if (!Number.isFinite(numericResponse)) {
      return {
        correct: false,
        response,
        expected: question.expectedAnswer,
        numericError: null,
        errorDirection: "conceptual",
      };
    }
    const numericError = numericResponse - question.expectedAnswer;
    return {
      correct: Math.abs(numericError) <= question.tolerance + 1e-9,
      response: numericResponse,
      expected: question.expectedAnswer,
      numericError,
      errorDirection:
        Math.abs(numericError) <= question.tolerance + 1e-9
          ? "none"
          : numericError < 0 ? "low" : "high",
    };
  }
  const correct = normaliseText(String(response)) === normaliseText(question.expectedAnswer);
  return {
    correct,
    response,
    expected: question.expectedAnswer,
    numericError: null,
    errorDirection: correct ? "none" : "conceptual",
  };
}
