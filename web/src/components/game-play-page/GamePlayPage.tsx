import "./GamePlayPage.scss";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "@/GameContext";
import { lastRound } from "@/utils/Scores";
import { EnterScoresComponent } from "./enter-scores-component/EnterScoresComponent";
import { PlayerListComponent } from "./player-list-component/PlayerListComponent";
import { PlotScoresComponent } from "./plot-scores-component/PlotScoresComponent";
import { ScoreTableComponent } from "./score-table-component/ScoreTableComponent";

type Content = "keypad" | "plot" | "table";

const contentButtons: { content: Content; icon: string }[] = [
  { content: "keypad", icon: "dialpad" },
  { content: "plot", icon: "stacked_line_chart" },
  { content: "table", icon: "table" },
];

export function GamePlayPage() {
  const navigate = useNavigate();
  const { game, updateGame } = useGame();
  const [currentContent, setCurrentContent] = useState<Content>("keypad");
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

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (
        !gameNameRef.current?.contains(target) &&
        !playerListRef.current?.contains(target) &&
        !editButtonRef.current?.contains(target)
      ) {
        exitEditMode();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [editing, exitEditMode]);

  // Highlight game name when edited
  useEffect(() => {
    inputGameNameRef.current?.select();
  }, [editingGameName]);

  function saveScore(score: number) {
    if (!game.scorecards.some((card) => card.id === selectedPlayerId)) return;
    updateGame({ type: "add_score", playerId: selectedPlayerId, round: currentRound, score });
  }

  function changeContent(content: Content) {
    if (content === "plot" || content === "table") {
      // Delete any trailing rounds that are all zeros
      updateGame({ type: "trim_scores" });
    }
    if (content === "keypad" && currentContent !== "keypad") {
      // When we switch to the keypad, automatically go to the next round
      const newRound = lastRound(game) + 1;
      updateGame({ type: "add_round", round: newRound });
      setCurrentRound(newRound);
      setSelectedPlayerId(firstPlayerId);
    }
    setCurrentContent(content);
  }

  function onEditGameNameClick() {
    if (editing) setEditingGameName(true);
  }

  // Select the player `offset` places after the selected one, wrapping around the list
  function stepPlayer(offset: number) {
    const count = game.scorecards.length;
    if (count === 0) return;
    const index = game.scorecards.findIndex((card) => card.id === selectedPlayerId);
    setSelectedPlayerId(game.scorecards[(index + offset + count) % count]!.id);
  }

  function nextRound() {
    updateGame({ type: "add_round", round: currentRound + 1 });
    setCurrentRound(currentRound + 1);
  }

  function prevRound() {
    setCurrentRound(Math.max(0, currentRound - 1));
  }

  // Score selected from the table view
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
            <button className="button-home" onClick={() => navigate("/")}>
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
              onClick={onEditGameNameClick}
            >
              <span className="material-symbols-outlined">edit</span>
            </div>
            {editingGameName ? (
              <input
                className="game-name-input"
                ref={inputGameNameRef}
                value={game.name}
                onChange={(e) => updateGame({ type: "update_name", newName: e.target.value })}
                onBlur={() => setEditingGameName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setEditingGameName(false);
                }}
              />
            ) : (
              <div className="game-name-label" onClick={onEditGameNameClick}>
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
              onSelectPlayer={setSelectedPlayerId}
              onPrevRound={prevRound}
              onNextRound={nextRound}
              editing={editing}
            />
          </div>
          <div className="buttons-section">
            {contentButtons.map(({ content, icon }) => (
              <button
                key={content}
                className={clsx({ selected: currentContent === content })}
                onClick={() => changeContent(content)}
              >
                <span className="material-symbols-outlined">{icon}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="content-section">
        {currentContent === "keypad" && (
          <EnterScoresComponent
            editing={editing}
            onSubmit={(score) => {
              saveScore(score);
              stepPlayer(1);
            }}
            onNextPlayer={() => stepPlayer(1)}
            onPrevPlayer={() => stepPlayer(-1)}
            onNextRound={nextRound}
            onPrevRound={prevRound}
          />
        )}
        {currentContent === "plot" && <PlotScoresComponent />}
        {currentContent === "table" && <ScoreTableComponent onScoreSelected={onScoreSelected} />}
      </div>
    </div>
  );
}
