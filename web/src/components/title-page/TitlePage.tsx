import "./TitlePage.scss";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/GameContext";

export function TitlePage() {
  const navigate = useNavigate();
  const { game, updateGame, hasGame } = useGame();

  function startNewGame() {
    updateGame({ type: "new_game" });
    navigate("/play", { state: { newGame: true } });
  }

  return (
    <div className="background title-page-background">
      <div className="main-card title-page-content">
        <h1 className="title">SCOREKEEPER</h1>
        <button className="button button-large" onClick={startNewGame}>
          Start New Game
        </button>
        <button
          className="button button-large"
          disabled={!hasGame}
          onClick={() => navigate("/play")}
        >
          <div className="continue-game-text">Continue Game</div>
          {hasGame && <div className="continue-game-name">{game.name}</div>}
        </button>
      </div>
    </div>
  );
}
