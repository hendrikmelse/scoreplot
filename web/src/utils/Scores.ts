import { Scorecard } from "@/Game";

export function partialScores(scorecard: Scorecard): number[] {
  return scorecard.scores.map(
    (
      (sum) => (n) =>
        (sum += n)
    )(0),
  );
}

export function totalScore(scorecard: Scorecard): number {
  return scorecard.scores.reduce((a, b) => a + b, 0);
}
