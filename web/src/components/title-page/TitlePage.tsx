import "./TitlePage.scss";
import { useNavigate } from "react-router-dom";
import { isUntouched } from "@/Game";
import { useGame } from "@/GameContext";
import { useToast } from "@/ToastContext";

export function TitlePage() {
  const navigate = useNavigate();
  const { game, updateGame, hasGame } = useGame();
  const { showToast } = useToast();

  function startNewGame() {
    const previous = game;
    const losingSomething = hasGame && !isUntouched(previous);

    updateGame({ type: "new_game" });
    if (losingSomething) {
      showToast({
        message: "Started a new game",
        actionLabel: "Undo",
        onAction: () => updateGame({ type: "load_game", game: previous }),
      });
    }
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
