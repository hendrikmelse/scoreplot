import type { Game, Scorecard } from "@/Game";

/** Running totals: partialScores(card)[n] is the player's total after round n */
export function partialScores(scorecard: Scorecard): number[] {
  let sum = 0;
  return scorecard.scores.map((score) => (sum += score));
}

export function totalScore(scorecard: Scorecard): number {
  return scorecard.scores.reduce((a, b) => a + b, 0);
}

/** The index of the last round that has a score slot, or 0 if there are only initial scores */
export function lastRound(game: Game): number {
  return Math.max(0, ...game.scorecards.map((card) => card.scores.length - 1));
}

/** The range covered by every player's running total, always including 0 */
export function totalScoreRange(game: Game): { min: number; max: number } {
  const totals = game.scorecards.flatMap(partialScores);
  return { min: Math.min(0, ...totals), max: Math.max(0, ...totals) };
}
