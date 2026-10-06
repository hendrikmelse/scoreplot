import { defaultColors } from "@/config";

/** A different sequence for each seed, though the same one for the same seed */
function seededRandom(seed: number): () => number {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const POINTS_PER_LINE = 16;
const LINE_COUNT = 5;
// Any of the player colors can be used
const LINE_COLORS = defaultColors;

/** Made up scores for a few players, which rise from the bottom left to the top right, unevenly */
function makeLines(random: () => number) {
  // A shuffle, of which the first few are used
  const colors = [...LINE_COLORS];
  for (let i = colors.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [colors[i], colors[j]] = [colors[j]!, colors[i]!];
  }

  return colors.slice(0, LINE_COUNT).map((color) => {
    const start = 68 + random() * 26;
    const end = 6 + random() * 30;
    const wobble = 5 + random() * 5;
    const points = Array.from({ length: POINTS_PER_LINE }, (_, i) => {
      const along = i / (POINTS_PER_LINE - 1);
      const x = -2 + along * 104; // A little past each edge, so the lines run all the way across
      const y = start + (end - start) * along + (random() - 0.5) * 2 * wobble;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return { color, points: points.join(" ") };
  });
}

// Made once each time the app is loaded, so every refresh of the page has a new set of lines
const lines = makeLines(seededRandom(Math.floor(Math.random() * 2 ** 32)));

/** Lines in the style of the plot, across the whole screen, for the title page to sit on */
export function ScoreLinesBackdrop() {
  return (
    <svg
      className="score-lines-backdrop"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {lines.map(({ color, points }) => (
        <polyline key={color} points={points} style={{ stroke: color }} />
      ))}
    </svg>
  );
}
