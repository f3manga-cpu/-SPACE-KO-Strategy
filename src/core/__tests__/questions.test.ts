import { describe, expect, it } from "vitest";
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
    expect(evaluateAnswer(question, question.expectedAnswer).correct).toBe(true);
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

