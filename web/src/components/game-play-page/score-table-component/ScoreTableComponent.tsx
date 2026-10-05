import "./ScoreTableComponent.scss";
import { useContext } from "react";
import { GameContext } from "App";


export function ScoreTableComponent({ onScoreSelected }: {
  onScoreSelected: (playerId: string, scoreIndex: number) => void
}) {
  const { game } = useContext(GameContext)!;

  return (
    <div className="score-table-content">
      <div className="table-data">
        {game.scorecards.map((card) => <div className="player-column" key={card.id}>
          <div className="player-name">{card.playerName}</div>
          <div className="table-divider"></div>
          {card.scores.map((score, index) => <div className="score-box" key={index}><span className="score" onClick={() => onScoreSelected(card.id, index)}>{score}</span></div>)}
        </div>)}
      </div>
    </div>
  );
}

