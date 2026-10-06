import { keyboardShift } from "@/useKeepAboveKeyboard";

describe("keyboardShift", () => {
  it("is nothing when the box is above the keyboard already", () => {
    expect(keyboardShift(200, 240, 500)).toBe(0);
  });

  it("is nothing when there is no keyboard and the whole screen is visible", () => {
    expect(keyboardShift(700, 740, 800)).toBe(0);
  });

  it("moves the box up to clear the keyboard, with some room to spare", () => {
    // The keyboard leaves 500px. The box ends at 740, which with the 40px of room is 280 too low
    expect(keyboardShift(700, 740, 500)).toBe(280);
  });

  it("never moves the box off the top of the screen", () => {
    expect(keyboardShift(60, 100, 20)).toBe(48);
  });
});
