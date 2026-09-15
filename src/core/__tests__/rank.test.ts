import { describe, expect, it } from "vitest";
import { completeQualification, derivePerformanceSnapshot, evaluateRank, provisionalRankFor } from "../rank";
import { createDefaultProfile } from "../scheduler";
import type { Attempt, PerformanceSnapshot, RunSummary } from "../types";

const NOW = 1_700_000_000_000;

const eliteSnapshot: PerformanceSnapshot = {
  attempts: 500,
  independentAttempts: 400,
  accuracy: 0.99,
  independentAccuracy: 0.99,
  anchorAccuracy: 1,
  transferAccuracy: 0.98,
  contrastAccuracy: 0.98,
  pressureAccuracy: 0.98,
  spacedRetention: 0.98,
  medianResponseMs: 1_300,
  masteredConcepts: 22,
  stableAnchors: 10,
  skillRating: 98,
};

function makeAttempt(index: number, scaffoldLevel: 0 | 3 = 0): Attempt {
  return {
    id: `a-${index}`,
    questionId: `q-${index}`,
    questionType: "anchor",
    primaryConceptId: `anchor:${index % 2 === 0 ? 2 : 3}:4`,
    conceptIds: [],
    sessionId: "s",
    runId: null,
    mode: "adaptive",
    timestamp: NOW + index,
    sequence: index,
    response: 54,
    expectedAnswer: 54,
    correct: true,
    responseTimeMs: 1_200,
    confidence: "locked",
    scaffoldLevel,
    difficulty: 0.6,
    retentionGapMs: 0,
    errorDirection: "none",
    score: 150,
  };
}

describe("skill-ranked progression", () => {
  it("maps complete elite evidence to the top performance rank", () => {
    expect(provisionalRankFor(eliteSnapshot)).toBe("geometry-elite");
  });

  it("does not let assisted volume substitute for independent skill", () => {
    const profile = createDefaultProfile(NOW, "grinder");
    profile.attempts = Array.from({ length: 500 }, (_, index) => makeAttempt(index, 3));
    const snapshot = derivePerformanceSnapshot(profile);
    expect(snapshot.accuracy).toBe(1);
    expect(snapshot.independentAttempts).toBe(0);
    expect(provisionalRankFor(snapshot)).toBe("unranked");
  });

  it("offers a proving event but does not auto-award rank", () => {
    const profile = createDefaultProfile(NOW, "candidate");
    profile.attempts = Array.from({ length: 35 }, (_, index) => makeAttempt(index));
    for (const state of Object.values(profile.concepts)) {
      if (state.id.startsWith("anchor:")) {
        state.mastery = 0.88;
        state.stability = 0.76;
        state.independentSuccesses = 4;
        state.spacedSuccesses = 2;
      }
    }
    const evaluation = evaluateRank(profile, NOW + 1);
    expect(evaluation.progress.current).toBe("unranked");
    expect(evaluation.progress.eligibleFor).toBe("bronze");

    const qualification: RunSummary = {
      id: "bronze-gate",
      mode: "qualification",
      seed: 5,
      startedAt: NOW,
      endedAt: NOW + 20_000,
      score: 1_200,
      accuracy: 1,
      correct: 8,
      total: 8,
      averageResponseMs: 2_500,
      medianResponseMs: 2_400,
      longestStreak: 8,
      perfect: true,
      difficulty: 0.5,
      scaffoldLevel: 0,
      conceptIds: [],
      rankBefore: "unranked",
      rankAfter: "bronze",
      personalBestKeys: [],
      attemptIds: [],
    };
    const result = completeQualification(profile, qualification);
    expect(result.passed).toBe(true);
    expect(result.progress.current).toBe("bronze");
    expect(result.progress.qualifications[0]?.rank).toBe("bronze");
  });

  it("rejects a gate run that misses its transparent threshold", () => {
    const profile = createDefaultProfile(NOW, "candidate-fail");
    profile.attempts = Array.from({ length: 35 }, (_, index) => makeAttempt(index));
    for (const state of Object.values(profile.concepts)) {
      if (state.id.startsWith("anchor:")) {
        state.mastery = 0.88;
        state.stability = 0.76;
        state.independentSuccesses = 4;
      }
    }
    const run: RunSummary = {
      id: "failed-gate",
      mode: "qualification",
      seed: 1,
      startedAt: NOW,
      endedAt: NOW + 60_000,
      score: 200,
      accuracy: 0.5,
      correct: 4,
      total: 8,
      averageResponseMs: 7_000,
      medianResponseMs: 7_000,
      longestStreak: 2,
      perfect: false,
      difficulty: 0.5,
      scaffoldLevel: 0,
      conceptIds: [],
      rankBefore: "unranked",
      rankAfter: "unranked",
      personalBestKeys: [],
      attemptIds: [],
    };
    expect(completeQualification(profile, run).reason).toBe("threshold-missed");
  });
});

