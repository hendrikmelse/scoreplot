import "./GamePlayPage.scss";
import clsx from "clsx";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useGame } from "@/GameContext";
import { useToast } from "@/ToastContext";
import { lastRound } from "@/utils/Scores";
import { runWithTransition, usePageAppeared } from "@/viewTransition";
import { EditPlayersDialog } from "./edit-players-dialog/EditPlayersDialog";
import { EnterScoresComponent } from "./enter-scores-component/EnterScoresComponent";
import { PlayerListComponent } from "./player-list-component/PlayerListComponent";
import { PlotScoresComponent } from "./plot-scores-component/PlotScoresComponent";
import { ScoreTableComponent } from "./score-table-component/ScoreTableComponent";
import { useKeepAboveKeyboard } from "@/useKeepAboveKeyboard";
import { FullscreenButton } from "@/components/FullscreenButton";

/** How long a tab takes to slide up over the one before it, or to drop away from in front of one */
const SLIDE_MS = 250;

/** Whether things are to be moved about, rather than just changed */
function motionAllowed(): boolean {
  return (
    typeof window.matchMedia === "function" &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/** How long the player list takes to change size (a little longer than the stylesheet says) */
const RESIZE_MS = 300;

type Content = "keypad" | "plot" | "table";

const contentButtons: { content: Content; icon: string; label: string }[] = [
  { content: "keypad", icon: "dialpad", label: "Keypad" },
  { content: "plot", icon: "stacked_line_chart", label: "Plot" },
  { content: "table", icon: "table", label: "Table" },
];

export function GamePlayPage() {
  const navigate = useNavigate();
  usePageAppeared();
  // "Start New Game" opens this page with the window for editing the players already open, so that
  // they can be set up
  const location = useLocation();
  const startInEditMode = (location.state as { newGame?: boolean } | null)?.newGame === true;
  // Whether the window opened by itself, for a new game. Kept from then until it is closed, as the
  // address still says it is a new game for as long as the page is there.
  const [forNewGame, setForNewGame] = useState(startInEditMode);
  // And not for as long as the history says so: going back to this page, or reloading it, is not a
  // new game
  useEffect(() => {
    if (startInEditMode) navigate(location.pathname, { replace: true, state: null });
  }, [startInEditMode, navigate, location.pathname]);
  const { game, updateGame } = useGame();
  const { dismissAll } = useToast();
  useKeepAboveKeyboard();
  // What the panel holds. With the list on its own (below), it still holds what it did, out of sight.
  const [currentContent, setCurrentContent] = useState<Content>("keypad");
  // On a stacked layout, the list can grow down over the space of the main panel
  const [listExpanded, setListExpanded] = useState(false);
  // The tab that is selected, which is none while the list is on its own. That is a state of its own,
  // before the first tab: it is not the tab that the panel was holding, with the list over it.
  const tab: Content | null = listExpanded ? null : currentContent;
  const [selectedPlayerIdState, setSelectedPlayerId] = useState("");
  // Continuing a game picks up at its latest round; a new game starts at round 1
  const [currentRound, setCurrentRound] = useState(() => Math.max(1, lastRound(game)));
  // How the panel is changing, for as long as that takes. The list on its own counts as the first of
  // the tabs, before the keypad. Going to a tab that is further along, the new one slides up ("up",
  // over the one it replaces, or "in", from there being none). Going to one before, the old one
  // drops away ("drop", which uncovers the one it replaced, or "out", which uncovers the list).
  const [slide, setSlide] = useState<{
    leaving: Content | null;
    kind: "up" | "drop" | "in" | "out";
  } | null>(null);
  const leavingContent = slide?.leaving ?? null;
  const slideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(slideTimer.current), []);
  function startSlide(next: NonNullable<typeof slide>) {
    setSlide(next);
    clearTimeout(slideTimer.current);
    slideTimer.current = setTimeout(() => setSlide(null), SLIDE_MS + 50);
  }
  const [resizing, setResizing] = useState(false);
  const resizeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(resizeTimer.current), []);
  // Whether the window for editing the players is open
  const [editing, setEditing] = useState(startInEditMode);
  // The plot emphasizes the line of the player the mouse is over in the player list, or failing
  // that, of the one that was tapped (which is the only way to do it without a mouse)
  const [hoveredPlayerId, setHoveredPlayerId] = useState("");
  const [pinnedPlayerIdState, setPinnedPlayerId] = useState("");
  // How many times each player's row has been made to flash, which the row restarts its flash by
  const [flashCounts, setFlashCounts] = useState<Record<string, number>>({});
  const playerListRef = useRef<HTMLDivElement>(null);

  // Fall back to the first player if the selected player doesn't exist (e.g. it was deleted)
  const firstPlayerId = game.scorecards[0]?.id ?? "";
  const selectedPlayerId = game.scorecards.some((card) => card.id === selectedPlayerIdState)
    ? selectedPlayerIdState
    : firstPlayerId;

  const pinnedPlayerId = tab === "plot" && !editing ? pinnedPlayerIdState : "";
  const highlightedPlayerId = hoveredPlayerId || pinnedPlayerId;

  // What the keypad says the score being typed is for
  const selectedPlayer = game.scorecards.find((card) => card.id === selectedPlayerId);
  const roundName = currentRound === 0 ? "Initial score" : `Round ${currentRound}`;
  const keypadCaption = selectedPlayer
    ? `${selectedPlayer.playerName.trim() || "Player"} · ${roundName}`
    : roundName;

  // However the window is closed, go back to the first player. Deletions were meant, so there is no
  // more need to offer to undo them.
  const exitEditMode = useCallback(() => {
    dismissAll();
    setEditing(false);
    setForNewGame(false);
    setSelectedPlayerId(firstPlayerId);
  }, [dismissAll, firstPlayerId]);

  // Let go of a pinned player when pressing anywhere, other than on a button (a tab, say, which can
  // decide for itself whether to let go) or a player, which pins or unpins them as it is pressed
  useEffect(() => {
    if (pinnedPlayerId === "") return;

    function onPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (playerListRef.current?.contains(target) && target.closest(".player")) return;
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
    if (tab === "plot" && !editing) {
      setPinnedPlayerId(pinnedPlayerId === playerId ? "" : playerId);
    }
  }

  // The list changes size with the tabs (when stacked), which takes a moment, and for that moment it
  // is not to have a scroll bar come and go
  function noteResize() {
    setResizing(true);
    clearTimeout(resizeTimer.current);
    resizeTimer.current = setTimeout(() => setResizing(false), RESIZE_MS);
  }

  // Where the tabs are along the bottom, with the list above the panel rather than beside it
  function isStackedLayout() {
    return window.matchMedia?.("(max-aspect-ratio: 1 / 1)").matches ?? false;
  }

  // Pressing the tab that is showing, when stacked, drops it and lets the list have its panel's place
  function pressTab(content: Content) {
    noteResize();
    if (content === tab && isStackedLayout()) {
      setListExpanded(true);
      // Showing the totals, as for the plot and the table
      setPinnedPlayerId("");
      updateGame({ type: "trim_scores" });
      if (motionAllowed()) startSlide({ leaving: null, kind: "out" });
      return;
    }
    changeContent(content);
  }

  function changeContent(content: Content) {
    setListExpanded(false);
    if (content !== "plot") setPinnedPlayerId("");
    if (content === "plot" || content === "table") {
      // Delete any trailing rounds that are all zeros
      updateGame({ type: "trim_scores" });
    }
    if (content === "keypad" && tab !== "keypad") {
      // When we switch to the keypad, automatically go to the next round
      const newRound = lastRound(game) + 1;
      updateGame({ type: "add_round", round: newRound });
      setCurrentRound(newRound);
      setSelectedPlayerId(firstPlayerId);
    }
    // Only when stacked: beside the list, a tab is just changed
    if (motionAllowed() && isStackedLayout()) {
      if (listExpanded) {
        startSlide({ leaving: null, kind: "in" });
      } else if (content !== currentContent) {
        const forward =
          contentButtons.findIndex((button) => button.content === content) >
          contentButtons.findIndex((button) => button.content === currentContent);
        startSlide({ leaving: currentContent, kind: forward ? "up" : "drop" });
      }
    }
    setCurrentContent(content);
  }

  // The list is only ever on its own when the tabs are along the bottom, so if that stops being so
  // (the screen is turned, or its window made wider), the tab that the panel holds is selected again
  useEffect(() => {
    const query = window.matchMedia?.("(max-aspect-ratio: 1 / 1)");
    if (!query) return;
    const onChange = () => {
      if (!query.matches) setListExpanded(false);
    };
    query.addEventListener?.("change", onChange);
    return () => query.removeEventListener?.("change", onChange);
  }, []);

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

  function renderContent(content: Content) {
    switch (content) {
      case "keypad":
        return (
          <EnterScoresComponent
            caption={keypadCaption}
            // Not to take any keys while it is on its way out
            editing={editing || content !== currentContent || listExpanded}
            onSubmit={(score) => {
              saveScore(score);
              stepPlayer(1);
            }}
            onNextPlayer={() => stepPlayer(1)}
            onPrevPlayer={() => stepPlayer(-1)}
            onNextRound={nextRound}
            onPrevRound={prevRound}
          />
        );
      case "plot":
        return <PlotScoresComponent highlightedPlayerId={highlightedPlayerId} />;
      case "table":
        return <ScoreTableComponent onScoreChanged={flashPlayer} />;
    }
  }

  return (
    <>
      <div
        className={clsx("background game-play-background", {
          "list-expanded": listExpanded,
          "table-showing": currentContent === "table",
          resizing,
        })}
      >
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
              <button className="edit-players-button" onClick={() => setEditing(true)}>
                <span className="material-symbols-outlined" aria-hidden="true">
                  edit
                </span>
                Edit players
              </button>
              <FullscreenButton className="button-fullscreen" />
            </div>
          </div>
          <div className="bottom-left-section">
            <div className="player-list-section" ref={playerListRef}>
              <PlayerListComponent
                round={tab === "keypad" ? currentRound : -1}
                selectedPlayerId={selectedPlayerId}
                onSelectPlayer={onPlayerPressed}
                onHighlightPlayer={setHoveredPlayerId}
                pinnedPlayerId={pinnedPlayerId}
                flashCounts={flashCounts}
                onPrevRound={prevRound}
                onNextRound={nextRound}
              />
            </div>
            <div className="buttons-section" role="tablist" aria-label="View">
              {contentButtons.map(({ content, icon, label }) => (
                <button
                  key={content}
                  role="tab"
                  aria-selected={tab === content}
                  title={label}
                  className={clsx({ selected: tab === content })}
                  onClick={() => pressTab(content)}
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
        <div className={clsx("content-section", { sliding: slide !== null })} role="tabpanel">
          {/* Each has its own size, whatever size the panel is made, so that it slides rather than
              stretches */}
          {contentButtons.map(({ content }) =>
            content === currentContent || content === leavingContent ? (
              <div
                key={content}
                className={clsx("content-inner", {
                  "is-table": content === "table",
                  entering:
                    (slide?.kind === "up" || slide?.kind === "in") && content === currentContent,
                  dropping:
                    (slide?.kind === "drop" && content === leavingContent) ||
                    (slide?.kind === "out" && content === currentContent),
                  leaving: content === leavingContent,
                })}
                inert={content === leavingContent}
                aria-hidden={content === leavingContent || undefined}
              >
                {renderContent(content)}
              </div>
            ) : null,
          )}
        </div>
      </div>
      {/* Outside the page, as the page is moved up out of the way of the keyboard, and it is not */}
      {editing && <EditPlayersDialog onClose={exitEditMode} selectFirstName={forNewGame} />}
    </>
  );
}
