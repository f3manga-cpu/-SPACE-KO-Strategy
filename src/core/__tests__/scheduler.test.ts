import { describe, expect, it } from "vitest";
import {
  MIN_INTERFERENCE_ITEMS,
  SPACING_INTERVALS_MS,
  createConceptState,
  createDefaultProfile,
  ensureConceptState,
  recordAttempt,
  selectNextConcept,
  updateConceptFromAttempt,
} from "../scheduler";
import type { Attempt, Profile, ScaffoldLevel } from "../types";

const NOW = 1_700_000_000_000;

function attempt(
  profile: Profile,
  conceptId: string,
  correct: boolean,
  overrides: Partial<Attempt> = {},
): Attempt {
  const state = profile.concepts[conceptId] ?? createConceptState(conceptId, undefined, NOW);
  return {
    id: `a-${profile.sequence}-${conceptId}`,
    questionId: `q-${profile.sequence}`,
    questionType: "anchor",
    primaryConceptId: conceptId,
    conceptIds: [conceptId],
    sessionId: "session",
    runId: null,
    mode: "adaptive",
    timestamp: NOW + profile.sequence * 130_000,
    sequence: profile.sequence,
    response: correct ? 54 : 40,
    expectedAnswer: 54,
    correct,
    responseTimeMs: 2_000,
    confidence: "medium",
    scaffoldLevel: state.scaffoldLevel,
    difficulty: 0.5,
    retentionGapMs: state.lastReviewedAt === null ? 0 : NOW + profile.sequence * 130_000 - state.lastReviewedAt,
    errorDirection: correct ? "none" : "low",
    score: correct ? 100 : -20,
    ...overrides,
  };
}

describe("adaptive scheduler", () => {
  it("is deterministic for the same profile, clock and seed", () => {
    const profile = createDefaultProfile(NOW, "deterministic");
    const options = { now: NOW, seed: 991, mode: "adaptive" as const };
    expect(selectNextConcept(profile, options)).toEqual(selectNextConcept(profile, options));
  });

  it("interleaves and delays a miss until intervening retrievals", () => {
    let profile = createDefaultProfile(NOW, "interference");
    const missed = "anchor:3:4";
    profile = recordAttempt(profile, attempt(profile, missed, false));
    const ids = [missed, "anchor:2:4", "anchor:3:3"];
    const immediately = selectNextConcept(profile, { now: NOW + 20_000, seed: 4, allowedConceptIds: ids });
    expect(immediately.conceptId).not.toBe(missed);

    profile = recordAttempt(profile, attempt(profile, "anchor:2:4", true));
    const afterOne = selectNextConcept(profile, { now: NOW + 150_000, seed: 4, allowedConceptIds: ids });
    expect(afterOne.conceptId).not.toBe(missed);
    profile = recordAttempt(profile, attempt(profile, "anchor:3:3", true));
    expect(profile.sequence - profile.concepts[missed]!.lastSeenSequence).toBeGreaterThan(MIN_INTERFERENCE_ITEMS);
    const returned = selectNextConcept(profile, {
      now: NOW + 300_000,
      seed: 4,
      allowedConceptIds: [missed],
    });
    expect(returned.conceptId).toBe(missed);
    expect(returned.reason).toBe("due");
  });

  it("fades guidance after success and restores it after error", () => {
    let profile = createDefaultProfile(NOW, "fade");
    const id = "anchor:3:4";
    expect(profile.concepts[id]?.scaffoldLevel).toBe(2);
    profile = recordAttempt(profile, attempt(profile, id, true));
    expect(profile.concepts[id]?.scaffoldLevel).toBe(1);
    profile = recordAttempt(profile, attempt(profile, id, true, { scaffoldLevel: 1 }));
    expect(profile.concepts[id]?.scaffoldLevel).toBe(1);
    profile = recordAttempt(profile, attempt(profile, id, false, { scaffoldLevel: 1 }));
    expect(profile.concepts[id]?.scaffoldLevel).toBe(2);
  });

  it("expands spacing only for delayed successful retrieval", () => {
    const id = "anchor:2:3";
    const initial = createConceptState(id, "anchor-two", NOW);
    const first = updateConceptFromAttempt(initial, attempt(createDefaultProfile(NOW), id, true));
    expect(first.spacingStage).toBe(1);
    expect(first.spacingIntervalMs).toBe(SPACING_INTERVALS_MS[1]);
    const retainedAttempt = attempt(createDefaultProfile(NOW), id, true, {
      timestamp: NOW + SPACING_INTERVALS_MS[1]!,
      retentionGapMs: SPACING_INTERVALS_MS[1],
      scaffoldLevel: first.scaffoldLevel,
      sequence: 5,
    });
    const retained = updateConceptFromAttempt(first, retainedAttempt);
    expect(retained.spacingStage).toBe(2);
    expect(retained.spacedSuccesses).toBe(1);
  });

  it("prioritises high-confidence misconceptions and records calibration", () => {
    const id = "anchor:2:4";
    const state = createConceptState(id, "anchor-two", NOW);
    const wrong = updateConceptFromAttempt(
      { ...state, mastery: 0.6, stability: 0.5 },
      attempt(createDefaultProfile(NOW), id, false, {
        confidence: "locked",
        scaffoldLevel: 0,
      }),
    );
    expect(wrong.highConfidenceErrors).toBe(1);
    expect(wrong.confidenceCalibration).toBeLessThan(0.5);
    expect(wrong.mastery).toBeLessThan(0.48);
  });

  it("Memory Return selects learned due traces rather than unseen concepts", () => {
    let profile = createDefaultProfile(NOW, "due-only");
    const learned = "anchor:3:4";
    profile = recordAttempt(profile, attempt(profile, learned, true));
    profile = {
      ...profile,
      concepts: { ...profile.concepts, [learned]: { ...profile.concepts[learned]!, nextReviewAt: NOW + 1_000 } },
    };
    const selected = selectNextConcept(profile, { now: NOW + 2_000, seed: 17, mode: "memory-return" });
    expect(selected.conceptId).toBe(learned);
    expect(selected.reason).toBe("due");
  });

  it("repairs partial or corrupt concept saves with safe defaults", () => {
    const repaired = ensureConceptState(
      {
        attempts: 5,
        successes: 99,
        mastery: Number.NaN,
        scaffoldLevel: 99 as ScaffoldLevel,
        recentOutcomes: [true, false, true],
      },
      "anchor:3:5",
      "anchor-three",
      NOW,
    );
    expect(repaired.successes).toBe(5);
    expect(repaired.accuracy).toBe(1);
    expect(repaired.mastery).toBe(0);
    expect(repaired.scaffoldLevel).toBe(3);
    expect(repaired.nextReviewAt).toBeTypeOf("number");
  });
});
