import type { Game } from "@/Game";
import { defaultColors } from "@/config";

const players = ["Alida", "Hendrik", "Sam", "Priya"];

// One row per round, one score per player (in the order of `players`)
const rounds = [
  [3, 12, 8, 25],
  [-4, 18, 0, 30],
  [6, 9, 14, 22],
  [0, 15, 5, 28],
  [-8, 20, 11, 19],
  [5, 13, -3, 31],
  [2, 17, 9, 24],
  [-5, 10, 22, 27],
  [8, 21, 0, 18],
  [0, 14, 12, 33],
  [-6, 19, 7, 21],
  [4, 11, 26, 29],
  [1, 24, 3, 23],
  [-3, 16, 15, 26],
  [7, 12, -2, 32],
  [0, 22, 10, 20],
  [-7, 15, 18, 28],
  [5, 18, 6, 25],
  [2, 9, 0, 30],
  [-2, 23, 13, 22],
  [9, 14, 8, 27],
  [0, 20, -4, 34],
  [3, 17, 16, 24],
  [-5, 13, 9, 31],
];

/**
 * A long game (more rounds than fit on screen, so the table has to scroll) with players of clearly
 * different skill: Priya wins comfortably, Hendrik is solid, Sam is streaky and Alida struggles.
 * For trying out the app. Open it at "/?demo".
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
