import "./GamePlayPage.scss";
import clsx from "clsx";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GameContext } from "@/GameContext";
import { EnterScoresComponent } from "./enter-scores-component/EnterScoresComponent";
import { PlayerListComponent } from "./player-list-component/PlayerListComponent";
import { PlotScoresComponent } from "./plot-scores-component/PlotScoresComponent";
import { ScoreTableComponent } from "./score-table-component/ScoreTableComponent";

export function GamePlayPage() {
  const navigate = useNavigate();
  const { game, updateGame } = useContext(GameContext)!;
  const [currentContent, setCurrentContent] = useState("keypad");
  const [selectedPlayerIdState, setSelectedPlayerId] = useState("");
  const [currentRound, setCurrentRound] = useState(1);
  const [editing, setEditing] = useState(false);
  const [editingGameName, setEditingGameName] = useState(false);
  const gameNameRef = useRef<HTMLDivElement>(null);
  const playerListRef = useRef<HTMLDivElement>(null);
  const editButtonRef = useRef<HTMLButtonElement>(null);
  const inputGameNameRef = useRef<HTMLInputElement>(null);

  // Fall back to the first player if the selected player doesn't exist (e.g. it was deleted)
  const firstPlayerId = game.scorecards[0]?.id ?? "";
  const selectedPlayerId = game.scorecards.some((card) => card.id === selectedPlayerIdState)
    ? selectedPlayerIdState
    : firstPlayerId;

  // When leaving edit mode, go back to the first player
  const exitEditMode = useCallback(() => {
    setEditing(false);
    setSelectedPlayerId(firstPlayerId);
  }, [firstPlayerId]);

  // Exit edit mode if user clicks anywhere other than the game name, the player list, or the edit button
  useEffect(() => {
    if (!editing) return;

    function onPointerDown(event: MouseEvent) {
      if (
        !gameNameRef.current?.contains(event.target as Node) &&
        !playerListRef.current?.contains(event.target as Node) &&
        !editButtonRef.current?.contains(event.target as Node)
      ) {
        exitEditMode();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [editing, exitEditMode]);

  // Highlight game name when edited
  useEffect(() => {
    inputGameNameRef.current?.select();
  }, [editingGameName]);

  function saveScore(score: number) {
    if (!game.scorecards.find((card) => card.id === selectedPlayerId)) return;

    updateGame({
      type: "add_score",
      playerId: selectedPlayerId,
      round: currentRound,
      score: score,
    });
  }

  function changeContent(display: string) {
    if (display === "plot" || display === "table") {
      // When switching to the plot, delete any rounds that are all zeros
      updateGame({ type: "trim_scores" });
    }
    if (display === "keypad" && currentContent !== "keypad") {
      // When we switch to the keypad, automatically go to the next round
      const maxRound = Math.max(...game.scorecards.map((scorecard) => scorecard.scores.length - 1));
      updateGame({
        type: "add_round",
        round: maxRound + 1,
      });
      setCurrentRound(maxRound + 1);
      if (game.scorecards[0]) {
        setSelectedPlayerId(game.scorecards[0].id);
      }
    }
    setCurrentContent(display);
  }

  function onEditGameNameClick() {
    if (editing) {
      setEditingGameName(true);
    }
  }

  function nextPlayer() {
    if (game.scorecards.length === 0) return;
    const nextIndex =
      (game.scorecards.findIndex((card) => card.id === selectedPlayerId) + 1) %
      game.scorecards.length;
    setSelectedPlayerId(game.scorecards[nextIndex]!.id);
  }

  function prevPlayer() {
    if (game.scorecards.length === 0) return;
    const prevIndex =
      (game.scorecards.findIndex((card) => card.id === selectedPlayerId) -
        1 +
        game.scorecards.length) %
      game.scorecards.length;
    setSelectedPlayerId(game.scorecards[prevIndex]!.id);
  }

  function updateGameName(newName: string) {
    updateGame({
      type: "update_name",
      newName: newName,
    });
  }

  function nextRound() {
    updateGame({
      type: "add_round",
      round: currentRound + 1,
    });
    setCurrentRound(currentRound + 1);
  }

  function prevRound() {
    setCurrentRound(Math.max(0, currentRound - 1));
  }

  // Score slected from the table view
  function onScoreSelected(playerId: string, round: number) {
    changeContent("keypad");
    setSelectedPlayerId(playerId);
    setCurrentRound(round);
  }

  return (
    <div className="background game-play-background">
      <div className="left-section">
        <div className="top-left-section">
          <div className="top-buttons-section">
            <button className="button-home" onClick={() => navigate(`/`)}>
              <span className="material-symbols-outlined">home</span>
            </button>
            <button
              className="button-edit"
              ref={editButtonRef}
              onClick={() => (editing ? exitEditMode() : setEditing(true))}
            >
              <span className="material-symbols-outlined">{editing ? "check" : "edit"}</span>
            </button>
          </div>
          <div className="game-name-section" ref={gameNameRef}>
            <div
              className={clsx("edit-game-name-button", { hidden: !editing })}
              onClick={() => onEditGameNameClick()}
            >
              <span className="material-symbols-outlined">edit</span>
            </div>
            {editingGameName ? (
              <input
                className="game-name-input"
                ref={inputGameNameRef}
                value={game.name}
                onChange={(e) => updateGameName(e.target.value)}
                onBlur={() => setEditingGameName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingGameName(false);
                }}
              />
            ) : (
              <div className="game-name-label" onClick={() => onEditGameNameClick()}>
                {game.name}
              </div>
            )}
          </div>
        </div>
        <div className="bottom-left-section">
          <div className="player-list-section" ref={playerListRef}>
            <PlayerListComponent
              round={currentContent === "keypad" ? currentRound : -1}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={(id) => setSelectedPlayerId(id)}
              onPrevRound={prevRound}
              onNextRound={nextRound}
              editing={editing}
            />
          </div>
          <div className="buttons-section">
            <button
              className={clsx({ selected: currentContent === "keypad" })}
              onClick={() => changeContent("keypad")}
            >
              <span className="material-symbols-outlined">dialpad</span>
            </button>
            <button
              className={clsx({ selected: currentContent === "plot" })}
              onClick={() => changeContent("plot")}
            >
              <span className="material-symbols-outlined">stacked_line_chart</span>
            </button>
            <button
              className={clsx({ selected: currentContent === "table" })}
              onClick={() => changeContent("table")}
            >
              <span className="material-symbols-outlined">table</span>
            </button>
          </div>
        </div>
      </div>
      <div className="content-section">
        {currentContent === "keypad" ? (
          <EnterScoresComponent
            editing={editing}
            onSubmit={(score: number) => {
              saveScore(score);
              nextPlayer();
            }}
            onNextPlayer={() => nextPlayer()}
            onPrevPlayer={() => prevPlayer()}
            onNextRound={() => nextRound()}
            onPrevRound={() => prevRound()}
          />
        ) : currentContent === "plot" ? (
          <PlotScoresComponent />
        ) : currentContent === "table" ? (
          <ScoreTableComponent onScoreSelected={(id, round) => onScoreSelected(id, round)} />
        ) : null}
      </div>
    </div>
  );
}
