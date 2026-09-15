import { ANCHORS } from "./geometry";
import type {
  Attempt,
  PerformanceSnapshot,
  Profile,
  RankId,
  RankProgress,
  RunSummary,
} from "./types";

const clamp = (value: number, minimum = 0, maximum = 1): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

export interface RankRequirements {
  minAttempts: number;
  minIndependentAttempts: number;
  minSkillRating: number;
  minAccuracy: number;
  minIndependentAccuracy?: number;
  minAnchorAccuracy?: number;
  minTransferAccuracy?: number;
  minContrastAccuracy?: number;
  minPressureAccuracy?: number;
  minSpacedRetention?: number;
  maxMedianResponseMs?: number;
  minStableAnchors?: number;
  minMasteredConcepts?: number;
}

export interface RankDefinition {
  id: RankId;
  name: string;
  division: string;
  requirements: RankRequirements;
  qualification: {
    questions: number;
    accuracy: number;
    maxAverageResponseMs: number;
    minimumDifficulty: number;
  } | null;
}

export const RANK_LADDER: readonly RankDefinition[] = Object.freeze([
  {
    id: "unranked",
    name: "Unranked",
    division: "Calibration Bay",
    requirements: { minAttempts: 0, minIndependentAttempts: 0, minSkillRating: 0, minAccuracy: 0 },
    qualification: null,
  },
  {
    id: "bronze",
    name: "Bronze",
    division: "Forge Cadet",
    requirements: { minAttempts: 12, minIndependentAttempts: 2, minSkillRating: 25, minAccuracy: 0.65 },
    qualification: { questions: 8, accuracy: 0.75, maxAverageResponseMs: 6_000, minimumDifficulty: 0.2 },
  },
  {
    id: "silver",
    name: "Silver",
    division: "Ratio Operator",
    requirements: {
      minAttempts: 30,
      minIndependentAttempts: 8,
      minSkillRating: 36,
      minAccuracy: 0.72,
      minIndependentAccuracy: 0.65,
      minAnchorAccuracy: 0.7,
      maxMedianResponseMs: 5_000,
      minStableAnchors: 1,
    },
    qualification: { questions: 10, accuracy: 0.8, maxAverageResponseMs: 5_000, minimumDifficulty: 0.3 },
  },
  {
    id: "gold",
    name: "Gold",
    division: "Anchor Smith",
    requirements: {
      minAttempts: 60,
      minIndependentAttempts: 20,
      minSkillRating: 48,
      minAccuracy: 0.78,
      minIndependentAccuracy: 0.74,
      minAnchorAccuracy: 0.8,
      minTransferAccuracy: 0.68,
      minSpacedRetention: 0.7,
      maxMedianResponseMs: 4_100,
      minStableAnchors: 3,
    },
    qualification: { questions: 12, accuracy: 0.84, maxAverageResponseMs: 4_100, minimumDifficulty: 0.42 },
  },
  {
    id: "platinum",
    name: "Platinum",
    division: "Runway Tactician",
    requirements: {
      minAttempts: 100,
      minIndependentAttempts: 45,
      minSkillRating: 59,
      minAccuracy: 0.83,
      minIndependentAccuracy: 0.8,
      minAnchorAccuracy: 0.86,
      minTransferAccuracy: 0.76,
      minContrastAccuracy: 0.76,
      minSpacedRetention: 0.76,
      maxMedianResponseMs: 3_400,
      minStableAnchors: 5,
      minMasteredConcepts: 2,
    },
    qualification: { questions: 14, accuracy: 0.87, maxAverageResponseMs: 3_500, minimumDifficulty: 0.54 },
  },
  {
    id: "diamond",
    name: "Diamond",
    division: "Geometry Pilot",
    requirements: {
      minAttempts: 150,
      minIndependentAttempts: 80,
      minSkillRating: 69,
      minAccuracy: 0.88,
      minIndependentAccuracy: 0.86,
      minAnchorAccuracy: 0.92,
      minTransferAccuracy: 0.84,
      minContrastAccuracy: 0.84,
      minPressureAccuracy: 0.8,
      minSpacedRetention: 0.82,
      maxMedianResponseMs: 2_700,
      minStableAnchors: 8,
      minMasteredConcepts: 5,
    },
    qualification: { questions: 16, accuracy: 0.9, maxAverageResponseMs: 2_900, minimumDifficulty: 0.65 },
  },
  {
    id: "master",
    name: "Master",
    division: "Stackoff Architect",
    requirements: {
      minAttempts: 220,
      minIndependentAttempts: 125,
      minSkillRating: 78,
      minAccuracy: 0.91,
      minIndependentAccuracy: 0.9,
      minAnchorAccuracy: 0.95,
      minTransferAccuracy: 0.89,
      minContrastAccuracy: 0.9,
      minPressureAccuracy: 0.86,
      minSpacedRetention: 0.87,
      maxMedianResponseMs: 2_250,
      minStableAnchors: 10,
      minMasteredConcepts: 9,
    },
    qualification: { questions: 18, accuracy: 0.93, maxAverageResponseMs: 2_450, minimumDifficulty: 0.76 },
  },
  {
    id: "grandmaster",
    name: "Grandmaster",
    division: "Reflex Commander",
    requirements: {
      minAttempts: 320,
      minIndependentAttempts: 200,
      minSkillRating: 87,
      minAccuracy: 0.94,
      minIndependentAccuracy: 0.93,
      minAnchorAccuracy: 0.97,
      minTransferAccuracy: 0.93,
      minContrastAccuracy: 0.94,
      minPressureAccuracy: 0.91,
      minSpacedRetention: 0.92,
      maxMedianResponseMs: 1_900,
      minStableAnchors: 10,
      minMasteredConcepts: 14,
    },
    qualification: { questions: 20, accuracy: 0.95, maxAverageResponseMs: 2_000, minimumDifficulty: 0.87 },
  },
  {
    id: "geometry-elite",
    name: "Geometry Elite",
    division: "Axiom Vanguard",
    requirements: {
      minAttempts: 500,
      minIndependentAttempts: 340,
      minSkillRating: 94,
      minAccuracy: 0.97,
      minIndependentAccuracy: 0.96,
      minAnchorAccuracy: 0.985,
      minTransferAccuracy: 0.96,
      minContrastAccuracy: 0.96,
      minPressureAccuracy: 0.95,
      minSpacedRetention: 0.95,
      maxMedianResponseMs: 1_600,
      minStableAnchors: 10,
      minMasteredConcepts: 18,
    },
    qualification: { questions: 24, accuracy: 1, maxAverageResponseMs: 1_750, minimumDifficulty: 0.94 },
  },
]);

const RANK_INDEX = new Map(RANK_LADDER.map((rank, index) => [rank.id, index]));

export function rankIndex(rank: RankId): number {
  return RANK_INDEX.get(rank) ?? 0;
}

export function rankDefinition(rank: RankId): RankDefinition {
  return RANK_LADDER[rankIndex(rank)]!;
}

export function nextRank(rank: RankId): RankDefinition | null {
  return RANK_LADDER[rankIndex(rank) + 1] ?? null;
}

const ratio = (attempts: readonly Attempt[]): number =>
  attempts.length === 0
    ? 0
    : attempts.filter((attempt) => attempt.correct).length / attempts.length;

const median = (values: readonly number[]): number => {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1]! + sorted[middle]!) / 2
    : sorted[middle]!;
};

/**
 * Uses a recent performance window so rank cannot be bought with old volume.
 * Long-term retention and mastery come from concept state, not attempt count.
 */
export function derivePerformanceSnapshot(profile: Profile): PerformanceSnapshot {
  const recent = profile.attempts.slice(-160);
  const independent = recent.filter((attempt) => attempt.scaffoldLevel === 0);
  const anchors = recent.filter((attempt) => attempt.questionType === "anchor");
  const transfers = recent.filter(
    (attempt) => attempt.questionType === "transfer" || attempt.mode === "arena",
  );
  const contrasts = recent.filter((attempt) => attempt.questionType === "contrast");
  const pressure = recent.filter((attempt) =>
    ["reflex-rush", "stackoff-survival", "arena", "qualification"].includes(attempt.mode),
  );
  const spaced = recent.filter(
    (attempt) => attempt.retentionGapMs >= 60_000 && attempt.scaffoldLevel <= 1,
  );
  const anchorIds = new Set(ANCHORS.map((anchor) => anchor.id));
  const conceptStates = Object.values(profile.concepts);
  const stableAnchors = conceptStates.filter(
    (state) =>
      anchorIds.has(state.id) &&
      state.mastery >= 0.64 &&
      state.stability >= 0.45 &&
      state.independentSuccesses >= 2,
  ).length;
  const masteredConcepts = conceptStates.filter(
    (state) => state.mastery >= 0.84 && state.stability >= 0.72 && state.spacedSuccesses >= 2,
  ).length;

  const accuracy = ratio(recent);
  const independentAccuracy = ratio(independent);
  const anchorAccuracy = ratio(anchors);
  const transferAccuracy = ratio(transfers);
  const contrastAccuracy = ratio(contrasts);
  const pressureAccuracy = ratio(pressure);
  const spacedRetention = ratio(spaced);
  const medianResponseMs = median(recent.map((attempt) => attempt.responseTimeMs));
  const latencyScore = Number.isFinite(medianResponseMs)
    ? clamp((6_000 - medianResponseMs) / 4_600)
    : 0;
  const exposureConfidence = (count: number, target: number): number =>
    clamp(count / target);
  // Category scores are confidence-weighted. Missing transfer/contrast evidence
  // therefore cannot masquerade as elite skill, while early ranks remain reachable.
  const weightedCategory = (value: number, count: number, target: number): number =>
    value * exposureConfidence(count, target);
  const masteryCoverage = clamp(masteredConcepts / 18);
  const stabilityCoverage = clamp(stableAnchors / 10);
  const skillRating = clamp(
    accuracy * 0.15 +
      weightedCategory(independentAccuracy, independent.length, 50) * 0.14 +
      weightedCategory(anchorAccuracy, anchors.length, 35) * 0.13 +
      weightedCategory(transferAccuracy, transfers.length, 30) * 0.14 +
      weightedCategory(contrastAccuracy, contrasts.length, 20) * 0.07 +
      weightedCategory(pressureAccuracy, pressure.length, 25) * 0.1 +
      weightedCategory(spacedRetention, spaced.length, 20) * 0.11 +
      latencyScore * 0.06 +
      stabilityCoverage * 0.05 +
      masteryCoverage * 0.05,
  ) * 100;

  return {
    attempts: recent.length,
    independentAttempts: independent.length,
    accuracy,
    independentAccuracy,
    anchorAccuracy,
    transferAccuracy,
    contrastAccuracy,
    pressureAccuracy,
    spacedRetention,
    medianResponseMs,
    masteredConcepts,
    stableAnchors,
    skillRating,
  };
}

export function meetsRankRequirements(
  snapshot: PerformanceSnapshot,
  requirements: RankRequirements,
): boolean {
  return (
    snapshot.attempts >= requirements.minAttempts &&
    snapshot.independentAttempts >= requirements.minIndependentAttempts &&
    snapshot.skillRating >= requirements.minSkillRating &&
    snapshot.accuracy >= requirements.minAccuracy &&
    (requirements.minIndependentAccuracy === undefined || snapshot.independentAccuracy >= requirements.minIndependentAccuracy) &&
    (requirements.minAnchorAccuracy === undefined || snapshot.anchorAccuracy >= requirements.minAnchorAccuracy) &&
    (requirements.minTransferAccuracy === undefined || snapshot.transferAccuracy >= requirements.minTransferAccuracy) &&
    (requirements.minContrastAccuracy === undefined || snapshot.contrastAccuracy >= requirements.minContrastAccuracy) &&
    (requirements.minPressureAccuracy === undefined || snapshot.pressureAccuracy >= requirements.minPressureAccuracy) &&
    (requirements.minSpacedRetention === undefined || snapshot.spacedRetention >= requirements.minSpacedRetention) &&
    (requirements.maxMedianResponseMs === undefined || snapshot.medianResponseMs <= requirements.maxMedianResponseMs) &&
    (requirements.minStableAnchors === undefined || snapshot.stableAnchors >= requirements.minStableAnchors) &&
    (requirements.minMasteredConcepts === undefined || snapshot.masteredConcepts >= requirements.minMasteredConcepts)
  );
}

export function provisionalRankFor(snapshot: PerformanceSnapshot): RankId {
  let result: RankId = "unranked";
  for (const definition of RANK_LADDER.slice(1)) {
    if (!meetsRankRequirements(snapshot, definition.requirements)) break;
    result = definition.id;
  }
  return result;
}

export interface RankEvaluation {
  progress: RankProgress;
  snapshot: PerformanceSnapshot;
  provisionalRank: RankId;
  next: RankDefinition | null;
}

export function evaluateRank(profile: Profile, now = Date.now()): RankEvaluation {
  const snapshot = derivePerformanceSnapshot(profile);
  const provisionalRank = provisionalRankFor(snapshot);
  const qualifiedRanks = new Set(profile.rank.qualifications.map((item) => item.rank));
  let attainedIndex = 0;
  for (let index = 1; index < RANK_LADDER.length; index += 1) {
    if (qualifiedRanks.has(RANK_LADDER[index]!.id)) attainedIndex = index;
    else break;
  }
  // Previously earned ranks can become inactive if retained performance falls,
  // but highest remains as the permanent career achievement.
  const activeIndex = Math.min(attainedIndex, rankIndex(provisionalRank));
  const current = RANK_LADDER[activeIndex]!.id;
  const candidate = RANK_LADDER[attainedIndex + 1] ?? null;
  const eligibleFor =
    candidate && rankIndex(provisionalRank) >= attainedIndex + 1 ? candidate.id : null;
  const highestIndex = Math.max(rankIndex(profile.rank.highest), attainedIndex);
  return {
    progress: {
      ...profile.rank,
      current,
      highest: RANK_LADDER[highestIndex]!.id,
      skillRating: Math.round(snapshot.skillRating * 10) / 10,
      eligibleFor,
      lastEvaluatedAt: now,
    },
    snapshot,
    provisionalRank,
    next: candidate,
  };
}

export interface QualificationResult {
  passed: boolean;
  reason: "passed" | "not-eligible" | "wrong-mode" | "threshold-missed";
  progress: RankProgress;
}

export function completeQualification(
  profile: Profile,
  run: RunSummary,
  now = run.endedAt,
): QualificationResult {
  const evaluation = evaluateRank(profile, now);
  const targetId = evaluation.progress.eligibleFor;
  if (!targetId) return { passed: false, reason: "not-eligible", progress: evaluation.progress };
  if (run.mode !== "qualification") {
    return { passed: false, reason: "wrong-mode", progress: evaluation.progress };
  }
  const definition = rankDefinition(targetId);
  const gate = definition.qualification;
  const passed = Boolean(
    gate &&
    run.total >= gate.questions &&
    run.accuracy >= gate.accuracy &&
    run.averageResponseMs <= gate.maxAverageResponseMs &&
    run.difficulty >= gate.minimumDifficulty &&
    run.scaffoldLevel === 0,
  );
  if (!passed) {
    return { passed: false, reason: "threshold-missed", progress: evaluation.progress };
  }
  const qualifications = [
    ...evaluation.progress.qualifications.filter((item) => item.rank !== targetId),
    { rank: targetId, passedAt: now, runId: run.id, score: run.score },
  ];
  return {
    passed: true,
    reason: "passed",
    progress: {
      ...evaluation.progress,
      current: targetId,
      highest:
        rankIndex(targetId) > rankIndex(evaluation.progress.highest)
          ? targetId
          : evaluation.progress.highest,
      eligibleFor: null,
      qualifications,
      lastEvaluatedAt: now,
    },
  };
}

