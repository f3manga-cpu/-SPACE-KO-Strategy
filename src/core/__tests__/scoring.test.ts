import { describe, expect, it } from "vitest";
import { calculateAttemptScore, emptyPersonalRecords, updatePersonalRecords } from "../scoring";
import type { RunSummary } from "../types";

describe("mastery-weighted score", () => {
  const baseline = {
    correct: true,
    difficulty: 0.5,
    scaffoldLevel: 1 as const,
    responseTimeMs: 2_000,
    timeTargetMs: 3_000,
    confidence: "medium" as const,
    streak: 2,
  };

  it("rewards difficulty, independence and retained retrieval", () => {
    const assisted = calculateAttemptScore({ ...baseline, difficulty: 0.2, scaffoldLevel: 3 });
    const independent = calculateAttemptScore({
      ...baseline,
      difficulty: 0.9,
      scaffoldLevel: 0,
      retentionGapMs: 86_400_000,
      spacingIntervalMs: 86_400_000,
    });
    expect(independent.total).toBeGreaterThan(assisted.total * 2);
    expect(independent.retention).toBeGreaterThan(1);
  });

  it("does not let implausibly fast guesses farm the speed bonus", () => {
    const guessed = calculateAttemptScore({ ...baseline, responseTimeMs: 120 });
    const retrieved = calculateAttemptScore({ ...baseline, responseTimeMs: 900 });
    expect(guessed.speed).toBeGreaterThanOrEqual(retrieved.speed);
    expect(guessed.antiGuess).toBeLessThan(1);
    expect(guessed.total).toBeLessThan(retrieved.total);
  });

  it("scores errors negatively and treats locked errors as diagnostic", () => {
    const uncertain = calculateAttemptScore({ ...baseline, correct: false, confidence: "low" });
    const misconception = calculateAttemptScore({ ...baseline, correct: false, confidence: "locked", responseTimeMs: 200 });
    expect(uncertain.total).toBeLessThan(0);
    expect(misconception.total).toBeLessThan(uncertain.total);
  });

  it("never awards points merely for claiming higher confidence", () => {
    const low = calculateAttemptScore({ ...baseline, confidence: "low" });
    const locked = calculateAttemptScore({ ...baseline, confidence: "locked" });
    expect(locked.total).toBe(low.total);
    expect(locked.calibration).toBe(1);
  });

  it("recognises a new Perfect Ten without replacing it with a slower run", () => {
    const baseRun: RunSummary = {
      id: "run-one",
      mode: "perfect-ten",
      seed: 1,
      startedAt: 1_000,
      endedAt: 19_000,
      score: 2_000,
      accuracy: 1,
      correct: 10,
      total: 10,
      averageResponseMs: 1_800,
      medianResponseMs: 1_750,
      longestStreak: 10,
      perfect: true,
      difficulty: 0.7,
      scaffoldLevel: 0,
      conceptIds: [],
      rankBefore: "bronze",
      rankAfter: "bronze",
      personalBestKeys: [],
      attemptIds: [],
    };
    const first = updatePersonalRecords(emptyPersonalRecords(), baseRun);
    expect(first.broken).toContain("perfectTen");
    const slower = updatePersonalRecords(first.records, { ...baseRun, id: "run-two", endedAt: 25_000 });
    expect(slower.broken).not.toContain("perfectTen");
    expect(slower.records.perfectTen?.runId).toBe("run-one");
  });

  it("rejects high scores that fail competitive accuracy or assistance gates", () => {
    const invalid: RunSummary = {
      id: "fast-guessing", mode: "reflex-rush", seed: 4, startedAt: 0, endedAt: 20_000,
      score: 99_999, accuracy: 0.5, correct: 8, total: 16, averageResponseMs: 400,
      medianResponseMs: 350, longestStreak: 2, perfect: false, difficulty: 1,
      scaffoldLevel: 0, conceptIds: [], rankBefore: "silver", rankAfter: "silver",
      personalBestKeys: [], attemptIds: [],
    };
    const rushed = updatePersonalRecords(emptyPersonalRecords(), invalid);
    expect(rushed.records.reflexArena).toBeNull();
    expect(rushed.records.highestDifficulty).toBe(0);
    const assistedTransfer = updatePersonalRecords(emptyPersonalRecords(), {
      ...invalid, id: "assisted-transfer", mode: "arena", accuracy: 1, correct: 16, scaffoldLevel: 2,
    });
    expect(assistedTransfer.records.tableTransfer).toBeNull();
  });
});
