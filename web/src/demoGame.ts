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
  [14, 22, 0, 9],
  [-6, 11, 19, 0],
  [25, 0, 13, 18],
  [0, 16, 28, -7],
  [9, 30, 0, 21],
  [17, -3, 12, 6],
  [0, 24, 8, 15],
  [21, 5, 0, 27],
  [-9, 13, 20, 0],
  [30, 0, 15, 11],
  [7, 19, -4, 24],
  [0, 8, 26, 0],
  [16, 27, 0, 14],
  [23, -5, 10, 19],
  [0, 12, 22, 3],
  [11, 18, 7, 29],
];

/**
 * A long game (more rounds than fit on screen, so the table and plot have to scroll or squeeze)
 * with a close race, for trying out the app. Open the app at "/?demo".
 */
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
