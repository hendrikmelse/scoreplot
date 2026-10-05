import type { Game } from "@/Game";
import { defaultColors } from "@/config";
import { generatedColor } from "@/utils/color";

const ROUNDS = 24;
const SKIPPED_ROUND_CHANCE = 0.1; // Rounds where a player scores nothing at all
const SEED = 9083;

/** Each round a player scores about `typical`, give or take `spread` */
const players = [
  { name: "Alida", typical: 1, spread: 9 }, // Struggling
  { name: "Hendrik", typical: 28, spread: 11 }, // Runs away with it
  { name: "Sam", typical: 9, spread: 14 }, // Streaky
  { name: "Priya", typical: 17, spread: 12 }, // Solid
  { name: "Marcus", typical: 22, spread: 13 },
  { name: "Yuki", typical: 13, spread: 10 },
  { name: "Dana", typical: 5, spread: 12 },
  { name: "Tomas", typical: 19, spread: 15 },
  { name: "Noor", typical: 11, spread: 9 },
  { name: "Wen", typical: 25, spread: 14 },
  { name: "Liam", typical: 7, spread: 11 },
  { name: "Ines", typical: 15, spread: 13 },
  { name: "Omar", typical: 14, spread: 12 },
  { name: "Zoe", typical: 19, spread: 10 },
  { name: "Felix", typical: 10, spread: 13 },
  { name: "Ana", typical: 21, spread: 12 },
  { name: "Kofi", typical: 8, spread: 10 },
  { name: "Mei", typical: 17, spread: 14 },
  { name: "Raj", typical: 12, spread: 11 },
  { name: "Sofia", typical: 7, spread: 12 },
];

// A small seeded random number generator, so the demo game is the same every time
function mulberry32(seed: number): () => number {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A normally distributed random number (mean 0, standard deviation 1), by the Box-Muller method */
function gaussian(random: () => number): number {
  return Math.sqrt(-2 * Math.log(1 - random())) * Math.cos(2 * Math.PI * random());
}

/**
 * A long game for trying out the app, with more players and more rounds than fit on screen, so
 * that the player list and the score table both have to scroll. The players have clearly different skill
 * levels but every round is quite random. Open the app at "/?demo".
 */
export function createDemoGame(): Game {
  const random = mulberry32(SEED);

  return {
    id: crypto.randomUUID(),
    name: "Friday Night Rummy",
    scorecards: players.map(({ name, typical, spread }, i) => {
      const scores = [0]; // Nobody starts with any points
      for (let round = 1; round <= ROUNDS; round++) {
        const skipped = random() < SKIPPED_ROUND_CHANCE;
        scores.push(skipped ? 0 : Math.round(typical + spread * gaussian(random)));
      }
      return {
        id: crypto.randomUUID(),
        playerName: name,
        color: defaultColors[i] ?? generatedColor(i),
        scores,
      };
    }),
  };
}
