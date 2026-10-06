import "./GamePlayPage.scss";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "@/GameContext";
import { FittedText } from "@/components/FittedText";
import { lastRound } from "@/utils/Scores";
import { runWithTransition, usePageAppeared } from "@/viewTransition";
import { EnterScoresComponent } from "./enter-scores-component/EnterScoresComponent";
import { PlayerListComponent } from "./player-list-component/PlayerListComponent";
import { PlotScoresComponent } from "./plot-scores-component/PlotScoresComponent";
import { ScoreTableComponent } from "./score-table-component/ScoreTableComponent";

type Content = "keypad" | "plot" | "table";

const contentButtons: { content: Content; icon: string; label: string }[] = [
  { content: "keypad", icon: "dialpad", label: "Keypad" },
  { content: "plot", icon: "stacked_line_chart", label: "Plot" },
  { content: "table", icon: "table", label: "Table" },
];

export function GamePlayPage() {
  const navigate = useNavigate();
  usePageAppeared();
  // "Start New Game" opens this page already in edit mode so the players can be set up
  const startInEditMode = (useLocation().state as { newGame?: boolean } | null)?.newGame === true;
  const { game, updateGame } = useGame();
  const [currentContent, setCurrentContent] = useState<Content>("keypad");
  const [selectedPlayerIdState, setSelectedPlayerId] = useState("");
  // Continuing a game picks up at its latest round; a new game starts at round 1
  const [currentRound, setCurrentRound] = useState(() => Math.max(1, lastRound(game)));
  const [editing, setEditing] = useState(startInEditMode);
  // The plot emphasizes the line of the player the mouse is over in the player list, or failing
  // that, of the one that was tapped (which is the only way to do it without a mouse)
  const [hoveredPlayerId, setHoveredPlayerId] = useState("");
  const [pinnedPlayerIdState, setPinnedPlayerId] = useState("");
  // How many times each player's row has been made to flash, which the row restarts its flash by
  const [flashCounts, setFlashCounts] = useState<Record<string, number>>({});
  // The game name is edited on its own, by pressing it, whether or not the players are being edited.
  // A new game starts with its name being edited, ready to be typed over.
  const [editingName, setEditingName] = useState(startInEditMode);
  const nameBeforeEditing = useRef(game.name);
  // Whether the name should be selected when its text box appears, which is only the first time
  const selectGameName = useRef(startInEditMode);
  const gameNameRef = useRef<HTMLDivElement>(null);
  const playerListRef = useRef<HTMLDivElement>(null);

  // Fall back to the first player if the selected player doesn't exist (e.g. it was deleted)
  const firstPlayerId = game.scorecards[0]?.id ?? "";
  const selectedPlayerId = game.scorecards.some((card) => card.id === selectedPlayerIdState)
    ? selectedPlayerIdState
    : firstPlayerId;

  const pinnedPlayerId = currentContent === "plot" && !editing ? pinnedPlayerIdState : "";
  const highlightedPlayerId = hoveredPlayerId || pinnedPlayerId;

  // What the keypad says the score being typed is for
  const selectedPlayer = game.scorecards.find((card) => card.id === selectedPlayerId);
  const roundName = currentRound === 0 ? "Initial score" : `Round ${currentRound}`;
  const keypadCaption = selectedPlayer
    ? `${selectedPlayer.playerName.trim() || "Player"} · ${roundName}`
    : roundName;

  // When leaving edit mode, go back to the first player
  const exitEditMode = useCallback(() => {
    setEditing(false);
    setSelectedPlayerId(firstPlayerId);
  }, [firstPlayerId]);

  // Exit edit mode if user clicks anywhere other than the game name or the player list (which has
  // the buttons for starting and finishing editing in it)
  useEffect(() => {
    if (!editing) return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      // Pressing a toast (like Undo, after deleting a player) is part of editing, not leaving it
      if (target instanceof Element && target.closest(".toasts")) return;
      if (!gameNameRef.current?.contains(target) && !playerListRef.current?.contains(target)) {
        exitEditMode();
      }
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [editing, exitEditMode]);

  // Pressing Enter while editing, with no name being edited, means the editing is done
  useEffect(() => {
    if (!editing) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.repeat) return; // Not the Enter of a key held down
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

      // Where the key was pressed, not where the focus is now: Enter in a name box takes the focus
      // out of it, and that Enter has done its job by doing that. On a button, Enter presses it.
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button")) return;

      // The color picker has its own idea of what is going on
      if (document.querySelector(".color-select-background")) return;

      exitEditMode();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editing, exitEditMode]);

  // Let go of a pinned player when pressing anywhere outside the player list, other than on a
  // button (a tab, say, which can decide for itself whether to let go)
  useEffect(() => {
    if (pinnedPlayerId === "") return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (playerListRef.current?.contains(target)) return;
      if (target.closest("button")) return;
      setPinnedPlayerId("");
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pinnedPlayerId]);

  function saveScore(score: number) {
    if (!game.scorecards.some((card) => card.id === selectedPlayerId)) return;
    updateGame({ type: "add_score", playerId: selectedPlayerId, round: currentRound, score });
    flashPlayer(selectedPlayerId);
  }

  // Makes a player's row in the list flash, to show that their score has just been updated
  function flashPlayer(playerId: string) {
    setFlashCounts((counts) => ({ ...counts, [playerId]: (counts[playerId] ?? 0) + 1 }));
  }

  // Pressing a player selects them for entering scores, and on the plot, picks out their line
  function onPlayerPressed(playerId: string) {
    setSelectedPlayerId(playerId);
    if (currentContent === "plot" && !editing) {
      setPinnedPlayerId(pinnedPlayerId === playerId ? "" : playerId);
    }
  }

  function changeContent(content: Content) {
    if (content !== "plot") setPinnedPlayerId("");
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

  function startEditingName() {
    nameBeforeEditing.current = game.name;
    selectGameName.current = true;
    setEditingName(true);
  }

  function finishEditingName() {
    setEditingName(false);
    // A game with no name at all would leave nothing to press to name it again
    if (game.name.trim() === "") {
      updateGame({ type: "update_name", newName: nameBeforeEditing.current });
    }
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

  return (
    <div className="background game-play-background">
      <div className="left-section">
        <div className="top-left-section">
          <div className="top-buttons-section">
            <button
              className="button-home"
              aria-label="Home"
              title="Home"
              onClick={() => runWithTransition(() => navigate("/"), "to-title")}
            >
              <span className="material-symbols-outlined home-chevron" aria-hidden="true">
                chevron_left
              </span>
              <span className="material-symbols-outlined" aria-hidden="true">
                home
              </span>
            </button>
          </div>
          <div className={clsx("game-name-section", { editing: editingName })} ref={gameNameRef}>
            {editingName ? (
              <input
                className="game-name-input"
                aria-label="Game name"
                ref={(el) => {
                  if (el && selectGameName.current) {
                    selectGameName.current = false;
                    el.focus();
                    el.select();
                  }
                }}
                value={game.name}
                onChange={(e) => updateGame({ type: "update_name", newName: e.target.value })}
                onBlur={finishEditingName}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.currentTarget.blur();
                  if (e.key === "Escape") {
                    updateGame({ type: "update_name", newName: nameBeforeEditing.current });
                    e.currentTarget.blur();
                  }
                }}
              />
            ) : (
              <button
                className="game-name-label"
                aria-label={`Rename game, now ${game.name}`}
                title="Rename game"
                onClick={startEditingName}
              >
                <FittedText className="game-name-text" text={game.name} />
              </button>
            )}
          </div>
        </div>
        <div className="bottom-left-section">
          <div className="player-list-section" ref={playerListRef}>
            <PlayerListComponent
              round={currentContent === "keypad" ? currentRound : -1}
              selectedPlayerId={selectedPlayerId}
              onSelectPlayer={onPlayerPressed}
              onHighlightPlayer={setHoveredPlayerId}
              pinnedPlayerId={pinnedPlayerId}
              flashCounts={flashCounts}
              onPrevRound={prevRound}
              onNextRound={nextRound}
              editing={editing}
              onStartEditing={() => setEditing(true)}
              onFinishEditing={exitEditMode}
            />
          </div>
          <div className="buttons-section" role="tablist" aria-label="View">
            {contentButtons.map(({ content, icon, label }) => (
              <button
                key={content}
                role="tab"
                aria-selected={currentContent === content}
                title={label}
                className={clsx({ selected: currentContent === content })}
                onClick={() => changeContent(content)}
              >
                <span className="material-symbols-outlined" aria-hidden="true">
                  {icon}
                </span>
                <span className="tab-label">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="content-section" role="tabpanel">
        {currentContent === "keypad" && (
          <EnterScoresComponent
            caption={keypadCaption}
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
        {currentContent === "plot" && (
          <PlotScoresComponent highlightedPlayerId={highlightedPlayerId} />
        )}
        {currentContent === "table" && <ScoreTableComponent onScoreChanged={flashPlayer} />}
      </div>
    </div>
  );
}
