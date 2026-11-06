import { describe, expect, it } from "vitest";
import { fitShift } from "./fitInView";

// A screen 800 high, with the keyboard leaving the top 500 of it
describe("fitShift", () => {
  it("leaves a box that is in view where it is", () => {
    expect(fitShift(0, 100, 300, 0, 500, 12)).toBe(0);
  });

  it("moves a box up just far enough to clear the keyboard", () => {
    // Its bottom is at 600, and has to be at 488
    expect(fitShift(0, 300, 300, 0, 500, 12)).toBe(-112);
  });

  it("keeps a box that was moved up where it is, when it still fits", () => {
    expect(fitShift(-112, 300, 300, 0, 500, 12)).toBe(-112);
  });

  it("moves it up further if the keyboard needs more of the room", () => {
    expect(fitShift(-112, 300, 300, 0, 400, 12)).toBe(-212);
  });

  it("does not take a box off the top of what is visible", () => {
    // Too tall to fit: it is stopped at the top margin rather than pushed up out of sight
    expect(fitShift(-500, 300, 300, 0, 300, 12)).toBe(-288);
  });

  it("allows for the visible part starting lower down than the top of the page", () => {
    expect(fitShift(0, 100, 300, 200, 700, 12)).toBe(112);
  });
});
