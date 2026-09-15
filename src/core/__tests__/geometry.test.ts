import { describe, expect, it } from "vitest";
import {
  ANCHORS,
  analyseLine,
  geometricBetFraction,
  geometricBetPercent,
  nearestAnchor,
  rootReactorStages,
  sprFromBetFraction,
  sprFromPotStack,
  streetSchedule,
} from "../geometry";

describe("geometric stack-off mathematics", () => {
  it("matches the canonical exact landmarks", () => {
    expect(geometricBetPercent(1.5, 2)).toBeCloseTo(50, 10);
    expect(geometricBetPercent(4, 2)).toBeCloseTo(100, 10);
    expect(geometricBetPercent(4, 3)).toBeCloseTo(54.0041911526, 8);
    expect(ANCHORS.map(({ spr, streets, percent }) => [spr, streets, percent])).toEqual([
      [2, 3, 35], [3, 3, 46], [4, 3, 54], [5, 3, 61], [6, 3, 68],
      [1, 2, 37], [1.5, 2, 50], [2, 2, 62], [3, 2, 82], [4, 2, 100],
    ]);
  });

  it("inverts fraction back to SPR", () => {
    for (const streets of [2, 3, 4]) {
      for (const spr of [0, 0.7, 1.5, 3.7, 8]) {
        const fraction = geometricBetFraction(spr, streets);
        expect(sprFromBetFraction(fraction, streets)).toBeCloseTo(spr, 10);
      }
    }
  });

  it("creates a conserving schedule that lands at zero", () => {
    for (const streets of [2, 3]) {
      const schedule = streetSchedule(10, 40, streets);
      expect(schedule).toHaveLength(streets);
      expect(schedule.at(-1)?.stackRemaining).toBeCloseTo(0, 9);
      expect(schedule.reduce((sum, step) => sum + step.bet, 0)).toBeCloseTo(40, 9);
      expect(schedule.at(-1)?.potAfterCall).toBeCloseTo(90, 9);
      for (let index = 1; index < schedule.length; index += 1) {
        expect(schedule[index]?.potBefore).toBeCloseTo(schedule[index - 1]!.potAfterCall, 10);
      }
    }
  });

  it("diagnoses under- and over-sized lines causally", () => {
    const exact = geometricBetFraction(4, 3);
    const small = analyseLine(10, 40, 3, exact - 0.1);
    const large = analyseLine(10, 40, 3, exact + 0.1);
    const correct = analyseLine(10, 40, 3, exact);
    expect(small.status).toBe("residue");
    expect(small.stackDelta).toBeGreaterThan(0);
    expect(large.status).toBe("exhausted-early");
    expect(correct.status).toBe("converged");
  });

  it("exposes every physical mnemonic transformation", () => {
    const stages = rootReactorStages(4, 3);
    expect(stages.map((stage) => stage.id)).toEqual([
      "spr", "double", "add-one", "root", "minus-one", "half",
    ]);
    expect(stages.at(-1)?.value).toBeCloseTo(geometricBetFraction(4, 3), 12);
  });

  it("finds the closest same-runway anchor", () => {
    expect(nearestAnchor(3.7, 3).spr).toBe(4);
    expect(nearestAnchor(1.7, 2).spr).toBe(1.5);
    expect(sprFromPotStack(11.8, 44)).toBeCloseTo(3.72881356, 7);
  });

  it("rejects impossible inputs", () => {
    expect(() => geometricBetFraction(-1, 2)).toThrow(RangeError);
    expect(() => geometricBetFraction(1, 0)).toThrow(RangeError);
    expect(() => geometricBetFraction(Number.NaN, 2)).toThrow(RangeError);
    expect(() => sprFromPotStack(0, 20)).toThrow(RangeError);
    expect(() => sprFromPotStack(10, -1)).toThrow(RangeError);
  });
});

