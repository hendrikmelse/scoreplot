import "./ScoreTableComponent.scss";
import clsx from "clsx";
import { useGame } from "@/GameContext";
import { lastRound, totalScore } from "@/utils/Scores";

export function ScoreTableComponent({
  onScoreSelected,
}: {
  onScoreSelected: (playerId: string, round: number) => void;
}) {
  const { game } = useGame();
  const rounds = Array.from({ length: lastRound(game) + 1 }, (_, round) => round);

  // The starting scores are only worth a row if somebody actually started with something
  const hasStartingScores = game.scorecards.some((card) => (card.scores[0] ?? 0) !== 0);
  const shownRounds = hasStartingScores ? rounds : rounds.slice(1);

  if (game.scorecards.length === 0) {
    return <div className="score-table-content score-table-empty">No players</div>;
  }

  return (
    <div className="score-table-content">
      <div className="table-scroll">
        <table
          className="score-table"
          style={{ "--player-count": game.scorecards.length } as React.CSSProperties}
        >
          <thead>
            <tr>
              <th className="corner" />
              {game.scorecards.map((card) => (
                <th
                  key={card.id}
                  className="player-header"
                  style={{ borderBottomColor: card.color }}
                  title={card.playerName}
                >
                  {card.playerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRounds.map((round) => (
              <tr
                key={round}
                className={clsx({ "start-row": round === 0, shaded: round % 2 === 1 })}
              >
                <th className="round-label">{round === 0 ? "Start" : round}</th>
                {game.scorecards.map((card) => {
                  const score = card.scores[round] ?? 0;
                  return (
                    <td
                      key={card.id}
                      className={clsx("score-cell", { negative: score < 0 })}
                      onClick={() => onScoreSelected(card.id, round)}
                    >
                      {score}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="round-label">Total</th>
              {game.scorecards.map((card) => {
                const total = totalScore(card);
                return (
                  <td key={card.id} className={clsx("total-cell", { negative: total < 0 })}>
                    {total}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
