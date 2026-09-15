import { ANCHORS } from "./geometry";
import { deterministicUnit } from "./random";
import {
  PROFILE_SCHEMA_VERSION,
  type Attempt,
  type ConceptFamily,
  type ConceptState,
  type GameMode,
  type MasteryBand,
  type PersonalRecords,
  type Profile,
  type QuestionType,
  type RankProgress,
  type ScaffoldLevel,
} from "./types";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Delays grow only after a successful retrieval at (roughly) the scheduled gap. */
export const SPACING_INTERVALS_MS = Object.freeze([
  0,
  2 * MINUTE,
  20 * MINUTE,
  8 * HOUR,
  DAY,
  3 * DAY,
  7 * DAY,
  14 * DAY,
  30 * DAY,
]);

export const MIN_INTERFERENCE_ITEMS = 2;
export const MAX_ATTEMPT_HISTORY = 2_500;
export const MAX_RUN_HISTORY = 250;

export interface ConceptDefinition {
  id: string;
  family: ConceptFamily;
  questionType: QuestionType;
  label: string;
}

const SUPPORTING_CONCEPTS: readonly ConceptDefinition[] = [
  { id: "spr:recognition", family: "spr-recognition", questionType: "spr-snap", label: "SPR recognition" },
  { id: "runway:two", family: "runway", questionType: "runway", label: "Two-street runway" },
  { id: "runway:three", family: "runway", questionType: "runway", label: "Three-street runway" },
  { id: "precision:two", family: "precision", questionType: "precision", label: "Two-street precision" },
  { id: "precision:three", family: "precision", questionType: "precision", label: "Three-street precision" },
  { id: "transfer:turn", family: "table-transfer", questionType: "transfer", label: "Turn table transfer" },
  { id: "transfer:flop", family: "table-transfer", questionType: "transfer", label: "Flop table transfer" },
  { id: "contrast:spr4", family: "contrast", questionType: "contrast", label: "SPR 4 runway contrast" },
  { id: "contrast:neighbors", family: "contrast", questionType: "contrast", label: "Neighbor discrimination" },
  { id: "inverse:ghost", family: "inverse-geometry", questionType: "ghost-line", label: "Ghost line inversion" },
  { id: "root:two", family: "root-method", questionType: "root-reactor", label: "Square-root fallback" },
  { id: "root:three", family: "root-method", questionType: "root-reactor", label: "Cube-root fallback" },
];

export const CONCEPT_CATALOG: readonly ConceptDefinition[] = Object.freeze([
  ...ANCHORS.map((anchor) => ({
    id: anchor.id,
    family: (anchor.streets === 2 ? "anchor-two" : "anchor-three") as ConceptFamily,
    questionType: "anchor" as const,
    label: `SPR ${anchor.spr} · ${anchor.streets} streets`,
  })),
  ...SUPPORTING_CONCEPTS,
]);

const CATALOG_BY_ID = new Map(CONCEPT_CATALOG.map((item) => [item.id, item]));

const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

const finite = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const integer = (value: unknown, fallback: number): number =>
  Math.max(0, Math.floor(finite(value, fallback)));

const asScaffold = (value: unknown, fallback: ScaffoldLevel): ScaffoldLevel =>
  Math.round(clamp(finite(value, fallback), 0, 3)) as ScaffoldLevel;

export function inferConceptFamily(id: string): ConceptFamily {
  const known = CATALOG_BY_ID.get(id);
  if (known) return known.family;
  if (id.startsWith("anchor:2:")) return "anchor-two";
  if (id.startsWith("anchor:3:")) return "anchor-three";
  if (id.startsWith("spr:")) return "spr-recognition";
  if (id.startsWith("runway:")) return "runway";
  if (id.startsWith("precision:")) return "precision";
  if (id.startsWith("transfer:")) return "table-transfer";
  if (id.startsWith("contrast:")) return "contrast";
  if (id.startsWith("inverse:")) return "inverse-geometry";
  if (id.startsWith("root:")) return "root-method";
  return "precision";
}

export function masteryBandFor(mastery: number, attempts = 1, spacedSuccesses = 0, independentSuccesses = 0, contextualSuccesses = 0): MasteryBand {
  if (attempts <= 0) return "dormant";
  if (mastery < 0.2) return "discovered";
  if (mastery < 0.42) return "unstable";
  if (mastery < 0.64) return "forged";
  if (spacedSuccesses < 1 || independentSuccesses < 1) return "forged";
  if (mastery < 0.84 || spacedSuccesses < 2 || contextualSuccesses < 1) return "stabilized";
  return "mastered";
}

export function createConceptState(
  id: string,
  family: ConceptFamily = inferConceptFamily(id),
  now = Date.now(),
): ConceptState {
  return {
    id,
    family,
    attempts: 0,
    successes: 0,
    failures: 0,
    streak: 0,
    lapses: 0,
    accuracy: 0,
    mastery: 0,
    stability: 0,
    masteryBand: "dormant",
    scaffoldLevel: 2,
    independentSuccesses: 0,
    spacedSuccesses: 0,
    contextualAttempts: 0,
    contextualSuccesses: 0,
    contextualTransferAccuracy: 0,
    latencyEmaMs: null,
    latencyTrendMs: 0,
    confidenceCalibration: 0.5,
    highConfidenceErrors: 0,
    errors: { low: 0, high: 0, conceptual: 0 },
    spacingStage: 0,
    spacingIntervalMs: 0,
    nextReviewAt: now,
    lastReviewedAt: null,
    lastSuccessfulRetrievalAt: null,
    lastSeenSequence: -1,
    recentOutcomes: [],
    recentQuestionTypes: [],
  };
}

/** Defensive normalisation used both by migration and scheduling old saves. */
export function ensureConceptState(
  raw: Partial<ConceptState> | null | undefined,
  id: string,
  family: ConceptFamily = inferConceptFamily(id),
  now = Date.now(),
): ConceptState {
  const base = createConceptState(id, family, now);
  if (!raw || typeof raw !== "object") return base;
  const attempts = integer(raw.attempts, 0);
  const successes = Math.min(attempts, integer(raw.successes, 0));
  const failures = Math.max(integer(raw.failures, attempts - successes), attempts - successes);
  const mastery = clamp(finite(raw.mastery, 0));
  const recentOutcomes = Array.isArray(raw.recentOutcomes)
    ? raw.recentOutcomes.filter((item): item is boolean => typeof item === "boolean").slice(-8)
    : [];
  const recentQuestionTypes = Array.isArray(raw.recentQuestionTypes)
    ? raw.recentQuestionTypes.filter((item): item is QuestionType =>
        typeof item === "string" &&
        ["anchor", "spr-snap", "runway", "precision", "transfer", "contrast", "ghost-line", "root-reactor"].includes(item),
      ).slice(-6)
    : [];
  const spacingStage = Math.min(
    SPACING_INTERVALS_MS.length - 1,
    integer(raw.spacingStage, 0),
  );
  const contextualAttempts = integer(raw.contextualAttempts, 0);
  const contextualSuccesses = Math.min(
    contextualAttempts,
    integer(raw.contextualSuccesses, 0),
  );
  const independentSuccesses = integer(raw.independentSuccesses, 0);
  const spacedSuccesses = integer(raw.spacedSuccesses, 0);

  return {
    ...base,
    id,
    family,
    attempts,
    successes,
    failures,
    streak: integer(raw.streak, 0),
    lapses: integer(raw.lapses, 0),
    accuracy: attempts > 0 ? successes / attempts : clamp(finite(raw.accuracy, 0)),
    mastery,
    stability: clamp(finite(raw.stability, 0)),
    masteryBand: masteryBandFor(mastery, attempts, spacedSuccesses, independentSuccesses, contextualSuccesses),
    scaffoldLevel: asScaffold(raw.scaffoldLevel, base.scaffoldLevel),
    independentSuccesses,
    spacedSuccesses,
    contextualAttempts,
    contextualSuccesses,
    contextualTransferAccuracy:
      contextualAttempts > 0
        ? contextualSuccesses / contextualAttempts
        : clamp(finite(raw.contextualTransferAccuracy, 0)),
    latencyEmaMs:
      raw.latencyEmaMs === null
        ? null
        : Math.max(0, finite(raw.latencyEmaMs, base.latencyEmaMs ?? 0)) || null,
    latencyTrendMs: finite(raw.latencyTrendMs, 0),
    confidenceCalibration: clamp(finite(raw.confidenceCalibration, 0.5)),
    highConfidenceErrors: integer(raw.highConfidenceErrors, 0),
    errors: {
      low: integer(raw.errors?.low, 0),
      high: integer(raw.errors?.high, 0),
      conceptual: integer(raw.errors?.conceptual, 0),
    },
    spacingStage,
    spacingIntervalMs: Math.max(
      0,
      finite(raw.spacingIntervalMs, SPACING_INTERVALS_MS[spacingStage] ?? 0),
    ),
    nextReviewAt: Math.max(0, finite(raw.nextReviewAt, now)),
    lastReviewedAt:
      raw.lastReviewedAt === null || raw.lastReviewedAt === undefined
        ? null
        : Math.max(0, finite(raw.lastReviewedAt, 0)),
    lastSuccessfulRetrievalAt:
      raw.lastSuccessfulRetrievalAt === null || raw.lastSuccessfulRetrievalAt === undefined
        ? null
        : Math.max(0, finite(raw.lastSuccessfulRetrievalAt, 0)),
    lastSeenSequence: Math.floor(finite(raw.lastSeenSequence, -1)),
    recentOutcomes,
    recentQuestionTypes,
  };
}

const emptyRecords = (): PersonalRecords => ({
  longestCleanStreak: 0,
  perfectTen: null,
  reflexArena: null,
  tableTransfer: null,
  fastestSprSequence: null,
  accuracyTwenty: null,
  highestDifficulty: 0,
  dailyChallenge: null,
  fastAccurateLatency: null,
});

const emptyRank = (now: number): RankProgress => ({
  current: "unranked",
  highest: "unranked",
  skillRating: 0,
  eligibleFor: null,
  qualifications: [],
  lastEvaluatedAt: now,
});

export function createDefaultProfile(
  now = Date.now(),
  id = `pilot-${Math.max(0, Math.floor(now)).toString(36)}`,
): Profile {
  const concepts = Object.fromEntries(
    CONCEPT_CATALOG.map((definition) => [
      definition.id,
      createConceptState(definition.id, definition.family, now),
    ]),
  );
  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id,
    createdAt: now,
    updatedAt: now,
    activeSessionId: null,
    sequence: 0,
    onboardingComplete: false,
    unlockedSectors: ["calibration-bay"],
    concepts,
    attempts: [],
    runs: [],
    records: emptyRecords(),
    rank: emptyRank(now),
    settings: {
      muted: false,
      reducedMotion: false,
      haptics: true,
      highContrast: false,
    },
    stats: {
      totalAttempts: 0,
      totalCorrect: 0,
      totalScore: 0,
      longestStreak: 0,
      currentStreak: 0,
      sessions: 0,
      lastPlayedAt: null,
    },
  };
}

export function reconcileConceptCatalog(profile: Profile, now = Date.now()): Profile {
  const concepts: Record<string, ConceptState> = {};
  for (const [id, raw] of Object.entries(profile.concepts ?? {})) {
    concepts[id] = ensureConceptState(raw, id, inferConceptFamily(id), now);
  }
  for (const definition of CONCEPT_CATALOG) {
    concepts[definition.id] = ensureConceptState(
      concepts[definition.id],
      definition.id,
      definition.family,
      now,
    );
  }
  return { ...profile, concepts };
}

const confidenceProbability = { low: 0.45, medium: 0.7, locked: 0.92 } as const;

export function updateConceptFromAttempt(
  rawState: Partial<ConceptState> | undefined,
  attempt: Attempt,
): ConceptState {
  const state = ensureConceptState(
    rawState,
    attempt.primaryConceptId,
    inferConceptFamily(attempt.primaryConceptId),
    attempt.timestamp,
  );
  const attempts = state.attempts + 1;
  const successes = state.successes + (attempt.correct ? 1 : 0);
  const failures = state.failures + (attempt.correct ? 0 : 1);
  const streak = attempt.correct ? state.streak + 1 : 0;
  const independence = 1 - attempt.scaffoldLevel / 3;
  const retained =
    state.spacingIntervalMs > 0 &&
    attempt.retentionGapMs >= Math.max(MINUTE, state.spacingIntervalMs * 0.7);
  const evidence =
    (0.09 + 0.08 * clamp(attempt.difficulty)) *
    (0.58 + 0.42 * independence) *
    (retained ? 1.3 : 1);
  const misconceptionPenalty =
    !attempt.correct && attempt.confidence === "locked" ? 0.09 : 0;
  const mastery = attempt.correct
    ? clamp(state.mastery + (1 - state.mastery) * evidence)
    : clamp(state.mastery * (0.8 - 0.05 * clamp(attempt.difficulty)) - misconceptionPenalty);
  const stability = attempt.correct
    ? clamp(state.stability + (retained ? 0.16 : 0.045) * (1 - state.stability))
    : clamp(state.stability * (attempt.confidence === "locked" ? 0.62 : 0.76));

  let spacingStage = state.spacingStage;
  if (attempt.correct) {
    if (state.attempts === 0 || retained) spacingStage += 1;
  } else {
    spacingStage = Math.max(0, spacingStage - 2);
  }
  spacingStage = Math.min(SPACING_INTERVALS_MS.length - 1, spacingStage);
  const spacingIntervalMs = attempt.correct
    ? SPACING_INTERVALS_MS[spacingStage]!
    : 20_000;

  let scaffoldLevel = state.scaffoldLevel;
  if (!attempt.correct) {
    scaffoldLevel = Math.min(3, scaffoldLevel + 1) as ScaffoldLevel;
  } else if (state.spacedSuccesses >= 1 || (mastery >= 0.7 && attempts >= 5)) {
    scaffoldLevel = 0;
  } else if (streak >= 1 && scaffoldLevel >= 2) {
    scaffoldLevel = (scaffoldLevel - 1) as ScaffoldLevel;
  }

  const previousLatency = state.latencyEmaMs;
  const latencyEmaMs =
    previousLatency === null
      ? attempt.responseTimeMs
      : previousLatency * 0.75 + attempt.responseTimeMs * 0.25;
  const confidenceCalibration = attempt.confidence
    ? state.confidenceCalibration * 0.8 +
      (1 - Math.abs(confidenceProbability[attempt.confidence] - (attempt.correct ? 1 : 0))) * 0.2
    : state.confidenceCalibration;
  const contextual =
    attempt.questionType === "transfer" || attempt.mode === "arena";
  const independentSuccesses = state.independentSuccesses + (attempt.correct && attempt.scaffoldLevel === 0 ? 1 : 0);
  const spacedSuccesses = state.spacedSuccesses + (attempt.correct && retained ? 1 : 0);
  const contextualSuccesses = state.contextualSuccesses + (contextual && attempt.correct ? 1 : 0);

  return {
    ...state,
    attempts,
    successes,
    failures,
    streak,
    lapses: state.lapses + (!attempt.correct && state.mastery >= 0.42 ? 1 : 0),
    accuracy: successes / attempts,
    mastery,
    stability,
    masteryBand: masteryBandFor(mastery, attempts, spacedSuccesses, independentSuccesses, contextualSuccesses),
    scaffoldLevel,
    independentSuccesses,
    spacedSuccesses,
    contextualAttempts: state.contextualAttempts + (contextual ? 1 : 0),
    contextualSuccesses,
    contextualTransferAccuracy:
      contextualSuccesses /
      Math.max(1, state.contextualAttempts + (contextual ? 1 : 0)),
    latencyEmaMs,
    latencyTrendMs:
      previousLatency === null ? 0 : latencyEmaMs - previousLatency,
    confidenceCalibration: clamp(confidenceCalibration),
    highConfidenceErrors:
      state.highConfidenceErrors +
      (!attempt.correct && attempt.confidence === "locked" ? 1 : 0),
    errors: {
      low: state.errors.low + (attempt.errorDirection === "low" ? 1 : 0),
      high: state.errors.high + (attempt.errorDirection === "high" ? 1 : 0),
      conceptual:
        state.errors.conceptual + (attempt.errorDirection === "conceptual" ? 1 : 0),
    },
    spacingStage,
    spacingIntervalMs,
    nextReviewAt: attempt.timestamp + spacingIntervalMs,
    lastReviewedAt: attempt.timestamp,
    lastSuccessfulRetrievalAt: attempt.correct
      ? attempt.timestamp
      : state.lastSuccessfulRetrievalAt,
    lastSeenSequence: attempt.sequence,
    recentOutcomes: [...state.recentOutcomes, attempt.correct].slice(-8),
    recentQuestionTypes: [...state.recentQuestionTypes, attempt.questionType].slice(-6),
  };
}

/** Apply an instrumented attempt without mutating the previous profile. */
export function recordAttempt(profile: Profile, attempt: Attempt): Profile {
  const conceptIds = [...new Set([attempt.primaryConceptId, ...attempt.conceptIds])];
  const concepts = { ...profile.concepts };
  for (const conceptId of conceptIds) {
    concepts[conceptId] = updateConceptFromAttempt(
      concepts[conceptId],
      { ...attempt, primaryConceptId: conceptId },
    );
  }
  const currentStreak = attempt.correct ? profile.stats.currentStreak + 1 : 0;
  return {
    ...profile,
    updatedAt: attempt.timestamp,
    activeSessionId: attempt.sessionId,
    sequence: Math.max(profile.sequence + 1, attempt.sequence + 1),
    concepts,
    attempts: [...profile.attempts, attempt].slice(-MAX_ATTEMPT_HISTORY),
    stats: {
      ...profile.stats,
      totalAttempts: profile.stats.totalAttempts + 1,
      totalCorrect: profile.stats.totalCorrect + (attempt.correct ? 1 : 0),
      totalScore: profile.stats.totalScore + attempt.score,
      currentStreak,
      longestStreak: Math.max(profile.stats.longestStreak, currentStreak),
      lastPlayedAt: attempt.timestamp,
    },
  };
}

const MODE_FAMILIES: Partial<Record<GameMode, readonly ConceptFamily[]>> = {
  calibration: ["anchor-two", "anchor-three", "spr-recognition", "runway"],
  "perfect-ten": ["anchor-two", "anchor-three"],
  "reflex-rush": ["anchor-two", "anchor-three", "spr-recognition", "table-transfer"],
  precision: ["precision"],
  "transfer-gauntlet": ["table-transfer"],
  "contrast-duel": ["contrast"],
  "memory-return": [
    "anchor-two",
    "anchor-three",
    "spr-recognition",
    "runway",
    "precision",
    "table-transfer",
    "contrast",
    "inverse-geometry",
    "root-method",
  ],
  arena: ["table-transfer"],
};

export interface SchedulerOptions {
  now?: number;
  seed?: number;
  mode?: GameMode;
  allowedConceptIds?: readonly string[];
  allowedFamilies?: readonly ConceptFamily[];
  dueOnly?: boolean;
}

export interface SchedulerSelection {
  conceptId: string;
  family: ConceptFamily;
  questionType: QuestionType;
  priority: number;
  reason: "new" | "due" | "misconception" | "weakness" | "transfer-gap" | "consolidation";
  difficulty: number;
  scaffoldLevel: ScaffoldLevel;
  askConfidence: boolean;
  state: ConceptState;
}

function priorityReason(state: ConceptState, now: number): SchedulerSelection["reason"] {
  if (state.attempts === 0) return "new";
  if (state.highConfidenceErrors > 0 && state.recentOutcomes.includes(false)) {
    return "misconception";
  }
  if (state.nextReviewAt <= now) return "due";
  if (state.contextualAttempts > 0 && state.contextualTransferAccuracy < 0.75) {
    return "transfer-gap";
  }
  if (state.mastery < 0.5) return "weakness";
  return "consolidation";
}

export function conceptPriority(
  state: ConceptState,
  profile: Profile,
  now: number,
  seed: number,
): number {
  const due = now >= state.nextReviewAt;
  const overdueRatio = due
    ? (now - state.nextReviewAt) / Math.max(MINUTE, state.spacingIntervalMs || MINUTE)
    : 0;
  let score = state.attempts === 0 ? 2.25 : 0;
  score += (1 - state.mastery) * 2.2;
  score += due ? 1.5 + Math.min(2.5, Math.log1p(overdueRatio)) : -0.3;
  score += (1 - state.stability) * 0.65;
  score += Math.min(1.1, state.highConfidenceErrors * 0.35);
  score += state.contextualAttempts > 0
    ? (1 - state.contextualTransferAccuracy) * 0.55
    : state.mastery > 0.35 ? 0.2 : 0;

  const questionsSinceSeen = profile.sequence - state.lastSeenSequence;
  const lastOutcome = state.recentOutcomes.at(-1);
  if (state.lastSeenSequence >= 0 && questionsSinceSeen <= MIN_INTERFERENCE_ITEMS) {
    score -= lastOutcome === false ? 12 : 5;
  }

  const lastAttempt = profile.attempts.at(-1);
  if (lastAttempt) {
    if (lastAttempt.primaryConceptId === state.id) score -= 8;
    const lastFamily = inferConceptFamily(lastAttempt.primaryConceptId);
    if (lastFamily === state.family) score -= 1.1;
    const lastStreetFamily = lastFamily === "anchor-two" || lastFamily === "anchor-three";
    const thisStreetFamily = state.family === "anchor-two" || state.family === "anchor-three";
    if (lastStreetFamily && thisStreetFamily && lastFamily !== state.family) score += 0.45;
  }

  // A tiny stable jitter avoids a fixed curriculum while preserving replayability.
  score += deterministicUnit(seed, state.id) * 0.08;
  return score;
}

function questionTypeFor(definition: ConceptDefinition, mode: GameMode): QuestionType {
  if (mode === "arena" || mode === "transfer-gauntlet") return "transfer";
  if (mode === "precision") return "precision";
  if (mode === "contrast-duel") return "contrast";
  return definition.questionType;
}

export function selectNextConcept(
  rawProfile: Profile,
  options: SchedulerOptions = {},
): SchedulerSelection {
  const now = options.now ?? Date.now();
  const seed = options.seed ?? rawProfile.sequence;
  const mode = options.mode ?? "adaptive";
  const profile = reconcileConceptCatalog(rawProfile, now);
  const modeFamilies = MODE_FAMILIES[mode];
  const allowedIds = options.allowedConceptIds
    ? new Set(options.allowedConceptIds)
    : null;
  const allowedFamilies = options.allowedFamilies
    ? new Set(options.allowedFamilies)
    : modeFamilies ? new Set(modeFamilies) : null;

  let candidates = CONCEPT_CATALOG.filter(
    (definition) =>
      (!allowedIds || allowedIds.has(definition.id)) &&
      (!allowedFamilies || allowedFamilies.has(definition.family)),
  );
  if (options.dueOnly || mode === "memory-return") {
    const due = candidates.filter(
      (definition) => profile.concepts[definition.id]!.attempts > 0 && profile.concepts[definition.id]!.nextReviewAt <= now,
    );
    // Memory Return still remains playable when no review is technically due.
    if (due.length > 0) candidates = due;
  }
  if (candidates.length === 0) {
    throw new RangeError("scheduler has no eligible concepts");
  }

  const scored = candidates
    .map((definition) => {
      const state = profile.concepts[definition.id]!;
      return {
        definition,
        state,
        priority: conceptPriority(state, profile, now, seed),
      };
    })
    .sort(
      (left, right) =>
        right.priority - left.priority ||
        left.definition.id.localeCompare(right.definition.id),
    );

  // If every candidate is under the interference gate, taking the best one is
  // preferable to deadlocking a narrowly filtered practice mode.
  const selected =
    scored.find((item) => item.priority > -4) ?? scored[0]!;
  const { definition, state, priority } = selected;
  const pressureBoost = ["reflex-rush", "stackoff-survival", "arena", "qualification"].includes(mode)
    ? 0.12
    : 0;
  const difficulty = clamp(
    0.16 + state.mastery * 0.7 + state.stability * 0.12 + pressureBoost,
    0.12,
    1,
  );
  const askConfidence =
    state.highConfidenceErrors > 0 ||
    state.confidenceCalibration < 0.38 ||
    (profile.sequence + Math.floor(deterministicUnit(seed, definition.id) * 5)) % 5 === 0;

  return {
    conceptId: definition.id,
    family: definition.family,
    questionType: questionTypeFor(definition, mode),
    priority,
    reason: priorityReason(state, now),
    difficulty,
    scaffoldLevel: state.scaffoldLevel,
    askConfidence,
    state,
  };
}
