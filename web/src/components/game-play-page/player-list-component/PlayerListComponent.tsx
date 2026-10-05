import "./PlayerListComponent.scss";
import clsx from "clsx";
import React, { useLayoutEffect, useState, useRef, useEffect } from "react";
import { useGame } from "@/GameContext";
import { useToast } from "@/ToastContext";
import { nextPlayerColor, type Scorecard } from "@/Game";
import { totalScore } from "@/utils/Scores";
import { autoScrollSpeed } from "@/utils/autoScroll";
import { SelectColorComponent } from "./SelectColorComponent/SelectColorComponent";

/** The round passed in when the player list should show total scores instead of a round */
const TOTAL_SCORES = -1;

/** For a button that is hidden by being see-through: keep it out of the tab order and the accessibility tree too */
function hiddenFromEveryone(hidden: boolean) {
  return hidden ? { tabIndex: -1, "aria-hidden": true } : {};
}

function roundLabel(round: number, editing: boolean): string {
  if (editing) return "Edit Players";
  if (round === TOTAL_SCORES) return "Total Scores";
  if (round === 0) return "Initial Score";
  return `Round ${round}`;
}

export function PlayerListComponent({
  round,
  selectedPlayerId,
  onSelectPlayer,
  onPrevRound,
  onNextRound,
  onHighlightPlayer,
  pinnedPlayerId,
  editing,
}: {
  round: number;
  selectedPlayerId: string;
  onSelectPlayer: (id: string) => void;
  onPrevRound: () => void;
  onNextRound: () => void;
  /** Called with a player's id while the mouse is over that player, and with "" when it leaves */
  onHighlightPlayer: (id: string) => void;
  /** The player whose line has been picked out on the plot by pressing them, if any */
  pinnedPlayerId: string;
  editing: boolean;
}) {
  const { game, updateGame } = useGame();
  const { showToast } = useToast();
  // The player whose name field should be focused as soon as it appears (a just-added player)
  const focusPlayerId = useRef("");
  const [selectingColorId, setSelectingColorId] = useState("");
  const [colorPickerPosition, setColorPickerPosition] = useState<DOMRect | null>(null);
  const [dragId, setDragId] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  // While dragging, positions are measured down the whole list, scrolled out of view or not: the
  // pointer's Y plus how far the list has scrolled. Then scrolling the list under a pointer that's
  // standing still moves the dragged player along with it.
  const dragStartY = useRef(0);
  const pointerY = useRef(0); // The latest position of the pointer on the screen, while dragging
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [playerSpacing, setPlayerSpacing] = useState(0);
  const playerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const playerPositions = useRef<Map<string, DOMRect>>(new Map());

  const showingRound = round !== TOTAL_SCORES;

  // Keep the selected player in view as the keypad moves through the list
  useEffect(() => {
    if (editing || !showingRound) return;
    playerRefs.current.get(selectedPlayerId)?.scrollIntoView?.({ block: "nearest" });
  }, [selectedPlayerId, editing, showingRound]);

  // The drag effect below calls whichever version of `dragTo` was made by the latest render
  const dragToRef = useRef<() => void>(() => {});

  // While dragging a player: follow the pointer wherever it goes, scroll the list when it nears
  // the top or bottom, don't let the user select text, and stop the drag on release
  useEffect(() => {
    if (dragId === "") return;

    const stopDragging = () => setDragId("");
    const onPointerMove = (e: PointerEvent) => {
      pointerY.current = e.clientY;
      dragToRef.current();
    };
    // Scrolling moves the list under the pointer, which can mean the player has to change places
    const onScroll = () => dragToRef.current();
    const list = listRef.current;

    let frame = 0;
    let previousTime: number | undefined;
    let carry = 0; // The part of a pixel that was too small to scroll last frame
    const autoScroll = (time: number) => {
      if (list && previousTime !== undefined) {
        const { top, bottom } = list.getBoundingClientRect();
        const speed = autoScrollSpeed(pointerY.current, top, bottom);
        carry = speed === 0 ? 0 : carry + (speed * (time - previousTime)) / 1000;
        const pixels = Math.trunc(carry);
        if (pixels !== 0) {
          carry -= pixels;
          list.scrollTop += pixels;
        }
      }
      previousTime = time;
      frame = requestAnimationFrame(autoScroll);
    };
    frame = requestAnimationFrame(autoScroll);

    document.body.style.userSelect = "none";
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);
    list?.addEventListener("scroll", onScroll);

    return () => {
      cancelAnimationFrame(frame);
      document.body.style.userSelect = "";
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
      list?.removeEventListener("scroll", onScroll);
    };
  }, [dragId]);

  // FLIP - animate changes in the player order when reordering the player list
  useLayoutEffect(() => {
    if (dragId === "") return; // No FLIP if we're not actively dragging

    playerRefs.current.forEach((player, id) => {
      if (id === dragId) return; // Don't animate the currently dragged item

      const oldRect = playerPositions.current.get(id);
      if (!oldRect) return;

      const deltaY = oldRect.top - player.getBoundingClientRect().top;

      if (deltaY !== 0) {
        // If there's been a change in position, translate it back to the old position...
        player.style.transform = `translateY(${deltaY}px)`;
        player.style.transition = "none";

        // Then remove the translation and let the browser animate
        requestAnimationFrame(() => {
          player.style.transition = "transform 150ms ease";
          player.style.removeProperty("transform");
        });
      }
    });
  }, [game.scorecards, dragId]);

  function onColorClick(e: React.MouseEvent<HTMLDivElement>, id: string) {
    if (editing) {
      setSelectingColorId(id);
      setColorPickerPosition(e.currentTarget.getBoundingClientRect());
    }
  }

  function deletePlayer(card: Scorecard, index: number) {
    updateGame({ type: "delete_player", playerId: card.id });
    showToast({
      message: `Deleted ${card.playerName.trim() || "player"}`,
      actionLabel: "Undo",
      onAction: () => updateGame({ type: "restore_player", card, index }),
    });
  }

  function addPlayer() {
    const newPlayerId = crypto.randomUUID();
    updateGame({
      type: "add_player",
      newPlayerId,
      newPlayerName: "Player " + (game.scorecards.length + 1),
      newPlayerColor: nextPlayerColor(game),
    });
    focusPlayerId.current = newPlayerId; // Start editing the new player's name right away
  }

  // Measure the position of each player. Used for FLIP animations
  function measurePlayerPositions() {
    playerRefs.current.forEach((player, id) => {
      playerPositions.current.set(id, player.getBoundingClientRect());
    });
  }

  // We need to know what the player spacing is in order to know how far to drag before reordering the list
  function measurePlayerSpacing() {
    const players = Array.from(playerRefs.current.values());
    if (players.length >= 2) {
      const r1 = players[0]!.getBoundingClientRect();
      const r2 = players[1]!.getBoundingClientRect();
      setPlayerSpacing(r2.top - r1.top);
    }
  }

  function startDragging(e: React.PointerEvent, id: string) {
    playerRefs.current.get(id)!.style.removeProperty("transition");
    measurePlayerSpacing();
    measurePlayerPositions();
    pointerY.current = e.clientY;
    dragStartY.current = e.clientY + (listRef.current?.scrollTop ?? 0);
    setDragDeltaY(0);
    setDragId(id);
  }

  // Called whenever the pointer moves or the list scrolls during a drag
  function dragTo() {
    if (dragId === "") return;

    // Compute how far we've dragged and where the dragged item currently is in the list
    const pointerInList = pointerY.current + (listRef.current?.scrollTop ?? 0);
    const deltaY = pointerInList - dragStartY.current;
    const index = game.scorecards.findIndex((card) => card.id === dragId);
    const reorderDistance = (playerSpacing * 3) / 5;

    // Figure out if we need to move the item's position
    if (index > 0 && -deltaY > reorderDistance) {
      measurePlayerPositions();
      dragStartY.current -= playerSpacing;
      updateGame({ type: "move_player", playerId: dragId, direction: "up" });
    } else if (index < game.scorecards.length - 1 && deltaY > reorderDistance) {
      measurePlayerPositions();
      dragStartY.current += playerSpacing;
      updateGame({ type: "move_player", playerId: dragId, direction: "down" });
    }

    // Need to recompute the delta here because the start Y may have been updated by a reorder
    setDragDeltaY(pointerInList - dragStartY.current);
  }

  useEffect(() => {
    dragToRef.current = dragTo;
  });

  // How far the dragged player at `index` is shifted. The first and last players can only be
  // pulled a little past the ends of the list.
  function dragOffset(index: number): number {
    const overshoot = playerSpacing / 6;
    const min = index === 0 ? -overshoot : -Infinity;
    const max = index === game.scorecards.length - 1 ? overshoot : Infinity;
    return Math.min(Math.max(dragDeltaY, min), max);
  }

  return (
    <>
      <div className="round-buttons">
        <button
          className={clsx({ hidden: !showingRound || editing })}
          aria-label="Previous round"
          title="Previous round"
          {...hiddenFromEveryone(!showingRound || editing)}
          onClick={() => onPrevRound()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_left_alt
          </span>
        </button>
        <div className="round-label">{roundLabel(round, editing)}</div>
        <button
          className={clsx({ hidden: !showingRound || editing })}
          aria-label="Next round"
          title="Next round"
          {...hiddenFromEveryone(!showingRound || editing)}
          onClick={() => onNextRound()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            arrow_right_alt
          </span>
        </button>
      </div>
      <div className="player-list" ref={listRef}>
        {game.scorecards.map((card, index) => (
          <React.Fragment key={card.id}>
            <div
              className={clsx("player", {
                selected: selectedPlayerId === card.id && showingRound && !editing,
                editing: editing,
                dragging: dragId === card.id,
                pinned: pinnedPlayerId === card.id,
              })}
              onClick={() => onSelectPlayer(card.id)}
              // Only for a real mouse. A touchscreen pretends to hover over what was tapped, and
              // leaves it that way, which would make it impossible to let go of a pinned player.
              onPointerEnter={(e) => e.pointerType === "mouse" && onHighlightPlayer(card.id)}
              onPointerLeave={(e) => e.pointerType === "mouse" && onHighlightPlayer("")}
              ref={(el) => {
                if (el) playerRefs.current.set(card.id, el);
                else playerRefs.current.delete(card.id);
              }}
              style={card.id === dragId ? { transform: `translateY(${dragOffset(index)}px)` } : {}}
            >
              <div className="spacer-left" />
              <div
                className={clsx("drag-handle", { hidden: !editing })}
                onPointerDown={(e) => startDragging(e, card.id)}
              >
                <span className="material-symbols-outlined">drag_handle</span>
              </div>
              <div
                className="player-color"
                style={{ backgroundColor: card.color }}
                onClick={(e) => onColorClick(e, card.id)}
              />
              {editing ? (
                <input
                  className="player-name-input"
                  ref={(el) => {
                    if (el && focusPlayerId.current === card.id) {
                      focusPlayerId.current = "";
                      el.focus();
                      el.select();
                    }
                  }}
                  value={card.playerName}
                  onChange={(e) =>
                    updateGame({
                      type: "change_player_name",
                      playerId: card.id,
                      newPlayerName: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              ) : (
                <div className="player-name">{card.playerName}</div>
              )}
              <div className={clsx("score", { hidden: editing })}>
                {showingRound ? (card.scores[round] ?? 0) : totalScore(card)}
              </div>
              <div
                className={clsx("delete-button", { hidden: !editing })}
                onClick={() => deletePlayer(card, index)}
              >
                <span className="material-symbols-outlined">delete</span>
              </div>
              <div className="spacer-right" />
            </div>
            {selectingColorId === card.id && colorPickerPosition && (
              <SelectColorComponent
                currentColor={card.color}
                position={colorPickerPosition}
                playerId={card.id}
                onClose={() => setSelectingColorId("")}
              />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className={clsx("add-player-row", { hidden: !editing })}>
        <button
          className="add-player-button"
          aria-label="Add player"
          title="Add player"
          {...hiddenFromEveryone(!editing)}
          onClick={addPlayer}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>
        </button>
      </div>
    </>
  );
}
