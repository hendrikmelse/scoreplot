import type { Game, Scorecard } from "@/Game";
import { hexToRgb, rgbToHex } from "@/utils/color";
import { lastRound, partialScores, totalScore, totalScoreRange } from "@/utils/Scores";
import { applyKey, parseScore } from "@/utils/scoreInput";

const card = (scores: number[]): Scorecard => ({ id: "x", playerName: "x", color: "#000", scores });
const game = (...scores: number[][]): Game => ({
  id: "g",
  name: "g",
  scorecards: scores.map(card),
});

describe("scores", () => {
  it("computes running and total scores", () => {
    expect(partialScores(card([1, -3, 5]))).toEqual([1, -2, 3]);
    expect(totalScore(card([1, -3, 5]))).toBe(3);
    expect(partialScores(card([]))).toEqual([]);
  });

  it("finds the last round", () => {
    expect(lastRound(game([0, 1, 2], [0]))).toBe(2);
    expect(lastRound(game())).toBe(0);
  });

  it("computes a score range that always includes zero", () => {
    expect(totalScoreRange(game([1, 2], [3, 4]))).toEqual({ min: 0, max: 7 });
    expect(totalScoreRange(game([-1, -2]))).toEqual({ min: -3, max: 0 });
    expect(totalScoreRange(game())).toEqual({ min: 0, max: 0 });
  });
});

describe("color", () => {
  it("round-trips hex colors", () => {
    expect(hexToRgb("#4363d8")).toEqual({ r: 0x43, g: 0x63, b: 0xd8 });
    expect(rgbToHex({ r: 0x43, g: 0x63, b: 0xd8 })).toBe("#4363d8");
    expect(rgbToHex({ r: 0, g: 5, b: 255 })).toBe("#0005ff");
  });
});

describe("applyKey", () => {
  const type = (...keys: string[]) => keys.reduce(applyKey, "0");

  it("types digits, dropping the leading zero", () => {
    expect(type("1", "2", "0")).toBe("120");
    expect(type("0", "0")).toBe("0");
  });

  it("types decimals", () => {
    expect(type("0", ".", "5")).toBe("0.5");
    expect(type("1", ".", "5", ".")).toBe("1.5");
  });

  it("handles signs", () => {
    expect(type("5", "+/-")).toBe("-5");
    expect(type("5", "+/-", "+/-")).toBe("5");
    expect(type("5", "-", "-")).toBe("-5");
    expect(type("5", "-", "+")).toBe("5");
    expect(type("-", "3")).toBe("-3");
    expect(type("+/-", "0", "7")).toBe("-7");
  });

  it("handles deleting and clearing", () => {
    expect(type("1", "2", "Backspace")).toBe("1");
    expect(type("1", "Backspace")).toBe("0");
    expect(type("5", "+/-", "Backspace")).toBe("-0");
    expect(type("+/-", "Backspace")).toBe("0");
    expect(type("1", "2", "c")).toBe("0");
    expect(type("1", "2", "Escape")).toBe("0");
  });

  it("ignores other keys", () => {
    expect(type("1", "Shift", "a", "F5", "Tab")).toBe("1");
  });
});

describe("parseScore", () => {
  it("parses complete numbers", () => {
    expect(parseScore("12")).toBe(12);
    expect(parseScore("-3.5")).toBe(-3.5);
    expect(parseScore("5.")).toBe(5);
    expect(Object.is(parseScore("-0"), 0)).toBe(true);
  });

  it("rejects incomplete input", () => {
    expect(parseScore(".")).toBeNull();
    expect(parseScore("-")).toBeNull();
    expect(parseScore("")).toBeNull();
  });
});
