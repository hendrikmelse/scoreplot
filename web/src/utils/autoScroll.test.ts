import { autoScrollSpeed } from "@/utils/autoScroll";

// A list from y = 100 to y = 500, so 56px edges: the middle is from 156 to 444
describe("autoScrollSpeed", () => {
  const speed = (y: number) => autoScrollSpeed(y, 100, 500);

  it("doesn't scroll while the pointer is in the middle of the list", () => {
    expect(speed(300)).toBe(0);
    expect(speed(157)).toBe(0);
    expect(speed(443)).toBe(0);
  });

  it("scrolls up near the top and down near the bottom", () => {
    expect(speed(140)).toBeLessThan(0);
    expect(speed(460)).toBeGreaterThan(0);
  });

  it("goes faster the closer the pointer gets to the edge", () => {
    expect(speed(120)).toBeLessThan(speed(140));
    expect(speed(480)).toBeGreaterThan(speed(460));
  });

  it("is symmetrical top and bottom", () => {
    expect(speed(110)).toBeCloseTo(-speed(490));
  });

  it("reaches a top speed at the edge, and doesn't get any faster beyond it", () => {
    expect(speed(100)).toBe(speed(-500));
    expect(speed(500)).toBe(speed(5000));
    expect(speed(500)).toBeGreaterThan(0);
  });

  it("scrolls right away when the pointer has left the list", () => {
    expect(speed(50)).toBeLessThan(0);
    expect(speed(550)).toBeGreaterThan(0);
  });

  it("still has a middle in a short list", () => {
    expect(autoScrollSpeed(150, 100, 200)).toBe(0); // 100 high, so 25px edges
    expect(autoScrollSpeed(110, 100, 200)).toBeLessThan(0);
    expect(autoScrollSpeed(190, 100, 200)).toBeGreaterThan(0);
  });

  it("copes with a list with no height", () => {
    expect(autoScrollSpeed(100, 100, 100)).toBe(0);
  });
});
