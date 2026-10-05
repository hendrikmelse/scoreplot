import { roundTicks, valueTicks } from "@/utils/plotTicks";

describe("valueTicks", () => {
  it("picks round numbers inside the range", () => {
    expect(valueTicks(0, 100, 5)).toEqual([0, 20, 40, 60, 80, 100]);
    expect(valueTicks(0, 609, 6)).toEqual([0, 100, 200, 300, 400, 500, 600]);
  });

  it("includes negative values, and zero is never -0", () => {
    const ticks = valueTicks(-33, 23, 5);
    expect(ticks).toEqual([-30, -20, -10, 0, 10, 20]);
    expect(Object.is(ticks[3], 0)).toBe(true);
    expect(valueTicks(-0.5, 3, 4).every((tick) => !Object.is(tick, -0))).toBe(true);
  });

  it("copes with small and fractional ranges", () => {
    expect(valueTicks(0, 3, 6)).toEqual([0, 0.5, 1, 1.5, 2, 2.5, 3]);
    expect(valueTicks(0, 0.3, 3)).toEqual([0, 0.1, 0.2, 0.3]);
  });

  it("stays within the range and keeps roughly to the target count", () => {
    for (const [min, max] of [
      [0, 7],
      [-1234, 56],
      [3, 4],
      [0, 100000],
    ] as const) {
      const ticks = valueTicks(min, max, 6);
      expect(ticks.length).toBeGreaterThan(1);
      expect(ticks.length).toBeLessThanOrEqual(12);
      expect(Math.min(...ticks)).toBeGreaterThanOrEqual(min);
      expect(Math.max(...ticks)).toBeLessThanOrEqual(max);
    }
  });

  it("has no ticks for an empty range", () => {
    expect(valueTicks(5, 5, 5)).toEqual([]);
    expect(valueTicks(5, 1, 5)).toEqual([]);
  });
});

describe("roundTicks", () => {
  it("labels every round when there's room", () => {
    expect(roundTicks(4, 10)).toEqual([0, 1, 2, 3, 4]);
  });

  it("skips rounds when there are too many to label", () => {
    const ticks = roundTicks(24, 8);
    expect(ticks[0]).toBe(0);
    expect(ticks.length).toBeLessThanOrEqual(8);
    expect(ticks.length).toBeGreaterThan(2);
    // Evenly spaced
    const steps = new Set(ticks.slice(1).map((tick, i) => tick - ticks[i]!));
    expect(steps.size).toBe(1);
  });

  it("handles tiny and degenerate cases", () => {
    expect(roundTicks(0, 5)).toEqual([0]);
    expect(roundTicks(100, 1)).toEqual([0]);
    expect(roundTicks(-1, 5)).toEqual([]);
  });
});
