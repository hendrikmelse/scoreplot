import type { Game } from "@/Game";
import { defaultColors } from "@/config";

const players = ["Alida", "Hendrik", "Sam", "Priya"];

// One row per round, one score per player (in the order of `players`)
const rounds = [
  [12, 0, 25, 8],
  [0, 18, -5, 30],
  [22, 7, 14, 0],
  [-10, 25, 9, 16],
  [15, 0, 31, -4],
  [8, 21, 0, 12],
  [0, 14, 17, 26],
  [28, 0, -8, 5],
];

/** A finished-looking game with a close race, for trying out the app. Open the app at "/?demo". */
export function createDemoGame(): Game {
  return {
    id: crypto.randomUUID(),
    name: "Friday Night Rummy",
    scorecards: players.map((playerName, i) => ({
      id: crypto.randomUUID(),
      playerName,
      color: defaultColors[i]!,
      scores: [0, ...rounds.map((round) => round[i]!)],
    })),
  };
}
