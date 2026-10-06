import "./TitlePage.scss";
import { useNavigate } from "react-router-dom";
import { defaultColors } from "@/config";
import { isUntouched } from "@/Game";
import { useGame } from "@/GameContext";
import { useToast } from "@/ToastContext";
import { lastRound } from "@/utils/Scores";
import { runWithTransition, usePageAppeared } from "@/viewTransition";
import { ScoreLinesBackdrop } from "./ScoreLinesBackdrop";

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function TitlePage() {
  const navigate = useNavigate();
  const { game, updateGame, hasGame } = useGame();
  const { showToast } = useToast();
  usePageAppeared();

  function startNewGame() {
    const previous = game;
    const losingSomething = hasGame && !isUntouched(previous);

    runWithTransition(() => {
      updateGame({ type: "new_game" });
      if (losingSomething) {
        showToast({
          message: "Started a new game",
          actionLabel: "Undo",
          onAction: () => updateGame({ type: "load_game", game: previous }),
        });
      }
      navigate("/play", { state: { newGame: true } });
    }, "to-game");
  }

  return (
    <div className="background title-page-background">
      <ScoreLinesBackdrop />
      <div className="title-page-content">
        <header className="title-block">
          {/* The colors that players are given, as in the player list */}
          <div className="title-swatches" aria-hidden="true">
            {defaultColors.map((color) => (
              <span key={color} style={{ backgroundColor: color }} />
            ))}
          </div>
          <h1 className="title">Scoreplot</h1>
        </header>
        <div className="title-actions">
          <button className="title-button primary" onClick={startNewGame}>
            Start New Game
          </button>
          {/* There is nothing to continue until there has been a game */}
          {hasGame && (
            <button
              className="title-button"
              onClick={() => runWithTransition(() => navigate("/play"), "to-game")}
            >
              <span className="continue-text">
                <span className="continue-game-text">Continue Game</span>
                <span className="continue-game-name">{game.name}</span>
                <span className="continue-game-details">
                  {plural(game.scorecards.length, "player")} · {plural(lastRound(game), "round")}
                </span>
              </span>
              <span className="material-symbols-outlined" aria-hidden="true">
                chevron_right
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
