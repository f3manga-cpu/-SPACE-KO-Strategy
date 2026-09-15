import { describe, expect, it } from "vitest";
import { percentToBb } from "../geometry";
import { generateQuestion, evaluateAnswer } from "../questions";
import type { QuestionType } from "../types";

const types: QuestionType[] = [
  "anchor", "spr-snap", "runway", "precision", "transfer", "contrast", "ghost-line", "root-reactor",
];

describe("deterministic question generators", () => {
  it.each(types)("replays %s from its seed", (type) => {
    const options = { type, seed: 41, difficulty: 0.72, scaffoldLevel: 1 as const };
    expect(generateQuestion(options)).toEqual(generateQuestion(options));
  });

  it("uses the canonical rounded anchor answer", () => {
    const question = generateQuestion({
      type: "anchor",
      seed: 3,
      conceptId: "anchor:3:4",
      difficulty: 0.8,
      scaffoldLevel: 0,
    });
    expect(question.expectedAnswer).toBe(54);
    expect(question.responseMode).toBe("numeric");
    expect(evaluateAnswer(question, 54).correct).toBe(true);
    expect(evaluateAnswer(question, 48).errorDirection).toBe("low");
  });

  it("turns scaffolding into choices and then fades to production", () => {
    const cued = generateQuestion({ type: "anchor", seed: 2, scaffoldLevel: 2 });
    const free = generateQuestion({ type: "anchor", seed: 2, scaffoldLevel: 0 });
    expect(cued.choices?.some((choice) => choice.value === cued.expectedAnswer)).toBe(true);
    expect(free.choices).toBeUndefined();
    expect(free.responseMode).toBe("numeric");
  });

  it("builds a table transfer from only world-state inputs", () => {
    const question = generateQuestion({
      type: "transfer",
      seed: 88,
      difficulty: 0.9,
      scaffoldLevel: 0,
      conceptId: "transfer:flop",
    });
    expect(question.context.potBb).toBeGreaterThan(0);
    expect(question.context.effectiveStackBb).toBeGreaterThan(0);
    expect(question.context.streetsRemaining).toBe(3);
    expect(question.prompt).not.toContain("SPR");
    expect(question.unit).toBe("percent");
    expect(question.acceptedUnits).toEqual(["percent", "bb"]);
    expect(question.context.targetBetBb).toBeGreaterThan(0);
    expect(evaluateAnswer(question, question.expectedAnswer).correct).toBe(true);
  });

  it("grades equivalent Live Table percent and BB actions with one percent tolerance", () => {
    const question = generateQuestion({
      type: "transfer",
      seed: 88,
      difficulty: 0.9,
      scaffoldLevel: 0,
      conceptId: "transfer:flop",
    });
    const pot = question.context.potBb!;
    const targetPercent = Number(question.expectedAnswer);
    const equivalentBetBb = percentToBb(pot, targetPercent);
    const percentResult = evaluateAnswer(question, targetPercent, "percent");
    const bbResult = evaluateAnswer(question, equivalentBetBb, "bb");

    expect(percentResult.correct).toBe(true);
    expect(bbResult.correct).toBe(true);
    expect(evaluateAnswer(question, question.context.targetBetBb!, "bb").correct).toBe(true);
    expect(percentResult.responsePercent).toBeCloseTo(targetPercent, 12);
    expect(bbResult.responsePercent).toBeCloseTo(targetPercent, 12);
    expect(bbResult.response).toBeCloseTo(Number(percentResult.response), 12);
    expect(bbResult.submittedValue).toBeCloseTo(equivalentBetBb, 12);
    expect(bbResult.responseUnit).toBe("bb");

    const insidePercent = targetPercent + question.tolerance;
    const outsidePercent = targetPercent + question.tolerance + 0.01;
    expect(evaluateAnswer(question, insidePercent, "percent").correct).toBe(true);
    expect(evaluateAnswer(question, percentToBb(pot, insidePercent), "bb").correct).toBe(true);
    expect(evaluateAnswer(question, outsidePercent, "percent").correct).toBe(false);
    expect(evaluateAnswer(question, percentToBb(pot, outsidePercent), "bb").correct).toBe(false);
  });

  it("preserves all three golden Anchor Forge answers", () => {
    const golden = [
      { conceptId: "anchor:3:4", answer: 54 },
      { conceptId: "anchor:2:4", answer: 100 },
      { conceptId: "anchor:2:1.5", answer: 50 },
    ];
    for (const [seed, anchor] of golden.entries()) {
      const question = generateQuestion({
        type: "anchor",
        seed,
        conceptId: anchor.conceptId,
        difficulty: 0.8,
        scaffoldLevel: 0,
      });
      expect(question.expectedAnswer).toBe(anchor.answer);
      expect(evaluateAnswer(question, anchor.answer).correct).toBe(true);
    }
  });

  it("accepts formatted numeric input and rejects non-numbers", () => {
    const question = generateQuestion({
      type: "anchor",
      seed: 1,
      conceptId: "anchor:2:4",
      scaffoldLevel: 0,
    });
    expect(evaluateAnswer(question, "100%").correct).toBe(true);
    expect(evaluateAnswer(question, "guess")).toMatchObject({
      correct: false,
      errorDirection: "conceptual",
    });
  });
});
