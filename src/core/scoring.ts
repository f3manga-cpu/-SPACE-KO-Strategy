import type {
  Confidence,
  PersonalBestKey,
  PersonalRecords,
  RunSummary,
  ScaffoldLevel,
  ScoreBreakdown,
} from "./types";

const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum));

export interface AttemptScoreInput {
  correct: boolean;
  difficulty: number;
  scaffoldLevel: ScaffoldLevel;
  responseTimeMs: number;
  /** Target for this item, not a universal reaction-time target. */
  timeTargetMs: number;
  retentionGapMs?: number;
  spacingIntervalMs?: number;
  confidence?: Confidence | null;
  streak?: number;
  modeMultiplier?: number;
}

/**
 * Score rewards demonstrated retrieval quality rather than taps.  Speed is a
 * bounded modifier after correctness, and sub-300ms inputs are explicitly
 * prevented from earning a reaction bonus (the anti-guess gate).
 */
export function calculateAttemptScore(input: AttemptScoreInput): ScoreBreakdown {
  const base = 100;
  const difficulty = 0.72 + clamp(input.difficulty, 0, 1) * 1.28;
  const independenceByScaffold: Record<ScaffoldLevel, number> = {
    0: 1.35,
    1: 1.12,
    2: 0.86,
    3: 0.62,
  };
  const independence = independenceByScaffold[input.scaffoldLevel];
  const target = Math.max(600, input.timeTargetMs);
  const responseTime = Math.max(0, input.responseTimeMs);
  let speed: number;
  if (responseTime <= target) {
    const usefulRatio = clamp(responseTime / target, 0.4, 1);
    speed = 1 + (1 - usefulRatio) * (0.25 / 0.6);
  } else {
    speed = clamp(1 - ((responseTime - target) / target) * 0.18, 0.64, 1);
  }
  const antiGuess = responseTime < 300 ? 0.58 : responseTime < 450 ? 0.84 : 1;

  const interval = Math.max(0, input.spacingIntervalMs ?? 0);
  const gap = Math.max(0, input.retentionGapMs ?? 0);
  const dueRatio = interval > 0 ? gap / interval : 0;
  const retention =
    interval >= 60_000 && dueRatio >= 0.7
      ? clamp(1.08 + Math.log2(Math.max(1, dueRatio)) * 0.1, 1.08, 1.5)
      : 1;
  // Confidence is diagnostic evidence for scheduling, never a way to buy score.
  const calibration = 1;
  const streak = 1 + Math.min(0.42, Math.max(0, input.streak ?? 0) * 0.035);
  const mode = clamp(input.modeMultiplier ?? 1, 0.65, 1.6);
  const correctness = input.correct ? 1 : 0;

  let total: number;
  if (input.correct) {
    total = Math.round(
      base * correctness * difficulty * independence * speed * retention * calibration * streak * antiGuess * mode,
    );
  } else {
    // A wrong answer cannot be farmed for points.  Fast and high-confidence
    // errors cost more because they are stronger evidence of guessing or a
    // misconception; slow uncertainty is corrected with a gentler penalty.
    const confidencePenalty = input.confidence === "locked" ? 1.55 : input.confidence === "medium" ? 1.15 : 0.9;
    const guessPenalty = responseTime < 450 ? 1.3 : 1;
    total = -Math.round(18 * difficulty * confidencePenalty * guessPenalty * mode);
  }

  return {
    base,
    correctness,
    difficulty,
    independence,
    speed,
    retention,
    calibration,
    streak,
    antiGuess,
    total,
  };
}

export const scoreAttempt = calculateAttemptScore;

export function emptyPersonalRecords(): PersonalRecords {
  return {
    longestCleanStreak: 0,
    perfectTen: null,
    reflexArena: null,
    tableTransfer: null,
    fastestSprSequence: null,
    accuracyTwenty: null,
    highestDifficulty: 0,
    dailyChallenge: null,
    fastAccurateLatency: null,
  };
}

export interface PersonalRecordUpdate {
  records: PersonalRecords;
  broken: PersonalBestKey[];
}

/** Deterministically update the record cabinet from a completed run. */
export function updatePersonalRecords(
  current: PersonalRecords,
  run: RunSummary,
): PersonalRecordUpdate {
  const records: PersonalRecords = {
    ...current,
    perfectTen: current.perfectTen ? { ...current.perfectTen } : null,
    reflexArena: current.reflexArena ? { ...current.reflexArena } : null,
    tableTransfer: current.tableTransfer ? { ...current.tableTransfer } : null,
    fastestSprSequence: current.fastestSprSequence ? { ...current.fastestSprSequence } : null,
    accuracyTwenty: current.accuracyTwenty ? { ...current.accuracyTwenty } : null,
    dailyChallenge: current.dailyChallenge ? { ...current.dailyChallenge } : null,
    fastAccurateLatency: current.fastAccurateLatency ? { ...current.fastAccurateLatency } : null,
  };
  const broken: PersonalBestKey[] = [];
  const achievedAt = run.endedAt;
  const durationMs = Math.max(0, run.endedAt - run.startedAt);

  if (run.longestStreak > records.longestCleanStreak) {
    records.longestCleanStreak = run.longestStreak;
    broken.push("longestCleanStreak");
  }
  if (
    run.mode === "perfect-ten" &&
    run.perfect &&
    run.total === 10 &&
    (!records.perfectTen || durationMs < records.perfectTen.durationMs)
  ) {
    records.perfectTen = { durationMs, achievedAt, runId: run.id };
    broken.push("perfectTen");
  }
  if (
    run.mode === "reflex-rush" &&
    run.accuracy >= 0.8 &&
    run.scaffoldLevel <= 1 &&
    (!records.reflexArena || run.score > records.reflexArena.score)
  ) {
    records.reflexArena = { score: run.score, achievedAt, runId: run.id };
    broken.push("reflexArena");
  }
  if (
    (run.mode === "transfer-gauntlet" || run.mode === "arena") &&
    run.accuracy >= 0.8 &&
    run.scaffoldLevel === 0 &&
    (!records.tableTransfer || run.score > records.tableTransfer.score)
  ) {
    records.tableTransfer = { score: run.score, achievedAt, runId: run.id };
    broken.push("tableTransfer");
  }
  if (
    run.perfect &&
    run.total >= 5 &&
    run.conceptIds.includes("spr:recognition") &&
    (!records.fastestSprSequence || durationMs < records.fastestSprSequence.durationMs)
  ) {
    records.fastestSprSequence = { durationMs, achievedAt, runId: run.id };
    broken.push("fastestSprSequence");
  }
  if (
    run.total >= 20 &&
    (!records.accuracyTwenty ||
      run.accuracy > records.accuracyTwenty.accuracy ||
      (run.accuracy === records.accuracyTwenty.accuracy &&
        run.averageResponseMs < records.accuracyTwenty.averageResponseMs))
  ) {
    records.accuracyTwenty = {
      accuracy: run.accuracy,
      averageResponseMs: run.averageResponseMs,
      achievedAt,
      runId: run.id,
    };
    broken.push("accuracyTwenty");
  }
  if (run.accuracy >= 0.8 && run.difficulty > records.highestDifficulty) {
    records.highestDifficulty = run.difficulty;
    broken.push("highestDifficulty");
  }
  if (
    run.mode === "daily-challenge" &&
    run.accuracy >= 0.8 &&
    run.scaffoldLevel <= 1 &&
    (!records.dailyChallenge || run.score > records.dailyChallenge.score)
  ) {
    records.dailyChallenge = { score: run.score, achievedAt, runId: run.id };
    broken.push("dailyChallenge");
  }
  if (
    run.total >= 10 &&
    run.accuracy >= 0.9 &&
    (!records.fastAccurateLatency ||
      run.averageResponseMs < records.fastAccurateLatency.averageResponseMs)
  ) {
    records.fastAccurateLatency = {
      accuracy: run.accuracy,
      averageResponseMs: run.averageResponseMs,
      achievedAt,
      runId: run.id,
    };
    broken.push("fastAccurateLatency");
  }
  return { records, broken };
}
