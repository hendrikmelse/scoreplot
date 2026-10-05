import "./ScoreTableComponent.scss";
import { useGame } from "@/GameContext";

export function ScoreTableComponent({
  onScoreSelected,
}: {
  onScoreSelected: (playerId: string, round: number) => void;
}) {
  const { game } = useGame();

  return (
    <div className="score-table-content">
      <div className="table-data">
        {game.scorecards.map((card) => (
          <div className="player-column" key={card.id}>
            <div className="player-name">{card.playerName}</div>
            <div className="table-divider"></div>
            {card.scores.map((score, round) => (
              <div className="score-box" key={round}>
                <span className="score" onClick={() => onScoreSelected(card.id, round)}>
                  {score}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
