import "./EditPlayersDialog.scss";
import clsx from "clsx";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useGame } from "@/GameContext";
import { useToast } from "@/ToastContext";
import { nextPlayerColor, type Scorecard } from "@/Game";
import { autoScrollSpeed } from "@/utils/autoScroll";
import { fitShift } from "@/utils/fitInView";
import { newId } from "@/utils/newId";
import { SelectColorComponent } from "../player-list-component/SelectColorComponent/SelectColorComponent";

/** How much of the screen has to be covered before it is taken to be a keyboard */
const MIN_KEYBOARD_HEIGHT = 120;

/** The room to leave between the window and the edge of what the keyboard leaves visible */
const KEYBOARD_GAP = 12;

/**
 * A window over the game page for changing the players: renaming, recoloring, reordering, adding
 * and deleting them. It is not the browser's own dialog, as that would put the color picker and the
 * toasts (which offer to undo a deletion) underneath it. Closed with Done or Escape, and not by a
 * press on the page behind, which would lose a half-made change too easily. With `selectFirstName`, as when a new game has just started, the first name is
 * selected, ready to be typed over.
 */
export function EditPlayersDialog({
  onClose,
  selectFirstName = false,
}: {
  onClose: () => void;
  selectFirstName?: boolean;
}) {
  const { game, updateGame } = useGame();
  const { showToast } = useToast();
  const dialogRef = useRef<HTMLDivElement>(null);
  // The player whose name field should be focused as soon as it appears (a just-added player)
  // On a phone the keyboard is kept up the whole time, so one of the names always has the focus
  const [touchDevice] = useState(() => window.matchMedia?.("(pointer: coarse)").matches ?? false);
  const focusPlayerId = useRef(
    selectFirstName || touchDevice ? (game.scorecards[0]?.id ?? "") : "",
  );
  // Whether the name that is focused as the window opens is left alone, as opposed to selected. A
  // tap that brings up the keyboard would not select it, and selecting it takes the phone's menu.
  const leaveFirstNameAlone = useRef(touchDevice && !selectFirstName);
  const lastNameBox = useRef<HTMLInputElement | null>(null);
  const pickerOpen = useRef(false);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  // Whether a name has just been focused by a press, whose release would move the cursor into it and
  // so undo the selecting of the whole name
  const keepNameSelected = useRef(false);
  // What kind of pointer pressed the name that has the focus, if one did. A selection made by a
  // finger's tap brings up the phone's own menu (cut, copy, paste) and handles, which is not wanted.
  const pressedWith = useRef("");
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

  // Takes the focus, so that the keyboard is for this window and not for the page behind it, unless
  // a name box has taken it already
  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus();
  }, []);

  // The window sits in the middle of the screen. When a phone's keyboard comes up and would cover
  // some of it, it moves up out of the way, and makes itself smaller if it has to. Nothing is
  // undone when the keyboard goes away again: it stays where it is and as big as it is, so that
  // things are not forever moving about. (The page does not shrink for the keyboard, it is covered.)
  useEffect(() => {
    const viewport = window.visualViewport;
    const dialog = dialogRef.current;
    if (!viewport || !dialog) return;
    let shift = 0;
    let fitHeight = Infinity;

    const update = () => {
      const keyboardHeight = window.innerHeight - viewport.height - viewport.offsetTop;
      if (keyboardHeight < MIN_KEYBOARD_HEIGHT || viewport.scale > 1.01) return; // Not up, or zoomed

      fitHeight = Math.min(fitHeight, viewport.height - 2 * KEYBOARD_GAP);
      dialog.style.setProperty("--fit-height", `${fitHeight}px`);
      // Where it sits without the shift, measured now that it is the size it is going to be
      const nextShift = fitShift(
        shift,
        dialog.offsetTop,
        dialog.offsetHeight,
        viewport.offsetTop,
        viewport.offsetTop + viewport.height,
        KEYBOARD_GAP,
      );
      if (nextShift !== shift) {
        shift = nextShift;
        dialog.style.setProperty("--shift", `${shift}px`);
      }
    };

    // The window changes size too, when players come and go, which may be while the keyboard is up
    const observer = new ResizeObserver(update);
    observer.observe(dialog);
    document.addEventListener("focusin", update);
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      observer.disconnect();
      document.removeEventListener("focusin", update);
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);

  // Escape, and Enter when it is not in a text box or on a button, mean that editing is done
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      // The color picker has its own idea of what is going on
      if (document.querySelector(".color-select-background")) return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      if (event.key !== "Enter" || event.repeat) return; // Not the Enter of a key held down
      if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return;

      // Where the key was pressed, not where the focus is now: Enter in a name box takes the focus
      // out of it, and that Enter has done its job by doing that. On a button, Enter presses it.
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, button")) return;

      onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

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

  // Puts the cursor back in the name that was last in, or in the first one if it has gone
  function focusANameBox() {
    const last = lastNameBox.current;
    const box = last?.isConnected
      ? last
      : dialogRef.current?.querySelector<HTMLInputElement>(".player-name-input");
    // Not a press, so not one to select anything
    pressedWith.current = "touch";
    box?.focus();
  }

  // On a phone, if the focus ends up on nothing (a name was deleted, say), bring it back to a name,
  // so that the keyboard does not go. Not while the color picker is up, which the keyboard would
  // cover, nor when the focus has gone to a button.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!touchDevice || !dialog) return;
    const afterFocusMoves = () =>
      setTimeout(() => {
        if (pickerOpen.current) return;
        if (document.activeElement === document.body || document.activeElement === dialog) {
          focusANameBox();
        }
      }, 0);
    dialog.addEventListener("focusout", afterFocusMoves);
    return () => dialog.removeEventListener("focusout", afterFocusMoves);
  }, [touchDevice]);

  useEffect(() => {
    pickerOpen.current = selectingColorId !== "";
  }, [selectingColorId]);

  function onColorClick(e: React.MouseEvent<HTMLDivElement>, id: string) {
    // The keyboard would cover the color picker, so it goes while that is up
    if (touchDevice && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setSelectingColorId(id);
    setColorPickerPosition(e.currentTarget.getBoundingClientRect());
  }

  function deletePlayer(card: Scorecard, index: number) {
    updateGame({ type: "delete_player", playerId: card.id });
    showToast({
      message: (
        <>
          <span className="toast-dim">Deleted</span>{" "}
          <span className="toast-subject">
            <span className="toast-swatch" style={{ backgroundColor: card.color }} />
            {card.playerName.trim() || "player"}
          </span>
        </>
      ),
      actionLabel: "Undo",
      onAction: () => updateGame({ type: "restore_player", card, index }),
    });
    // The name that had the focus may have been that one's, and the keyboard goes with it
    if (touchDevice) setTimeout(focusANameBox, 0);
  }

  function addPlayer() {
    const newPlayerId = newId();
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
    // A finger is tied to the handle it touched, and reordering moves that handle in the page, which
    // ends the touch. The list stays put, so the drag is held there instead.
    listRef.current?.setPointerCapture?.(e.pointerId);
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
    <div
      className="edit-players-backdrop"
      // On a phone, pressing on anything but a text box or a button (the page behind the window
      // too) does not take the focus from the name that has it, so that the keyboard stays up
      onMouseDown={(e) => {
        if (!touchDevice) return;
        if (e.target instanceof Element && e.target.closest("input, button")) return;
        e.preventDefault();
      }}
    >
      <div
        className="edit-players-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-players-title"
        tabIndex={-1}
        ref={dialogRef}
      >
        <h2 id="edit-players-title" className="edit-players-title">
          Edit Players
        </h2>
        <div className="edit-players-list" ref={listRef}>
          {game.scorecards.length === 0 && (
            <div className="edit-players-empty">
              <div className="edit-players-empty-title">No players yet</div>
              <div className="edit-players-empty-hint">
                Press <span className="edit-players-empty-button">Add player</span> to add one
              </div>
            </div>
          )}
          {game.scorecards.map((card, index) => (
            <React.Fragment key={card.id}>
              <div
                className={clsx("edit-player", { dragging: dragId === card.id })}
                ref={(el) => {
                  if (el) playerRefs.current.set(card.id, el);
                  else playerRefs.current.delete(card.id);
                }}
                style={
                  card.id === dragId ? { transform: `translateY(${dragOffset(index)}px)` } : {}
                }
              >
                <div className="drag-handle" onPointerDown={(e) => startDragging(e, card.id)}>
                  <span className="material-symbols-outlined">drag_handle</span>
                </div>
                <div
                  className="player-color"
                  style={{ backgroundColor: card.color }}
                  onClick={(e) => onColorClick(e, card.id)}
                />
                <input
                  className="player-name-input"
                  aria-label={`Name of ${card.playerName.trim() || "player"}`}
                  ref={(el) => {
                    if (el && focusPlayerId.current === card.id) {
                      focusPlayerId.current = "";
                      // Focusing it selects it, unless it is to be left alone
                      if (leaveFirstNameAlone.current) pressedWith.current = "touch";
                      el.focus();
                      pressedWith.current = "";
                      if (!leaveFirstNameAlone.current) el.select();
                      leaveFirstNameAlone.current = false;
                    }
                  }}
                  value={card.playerName}
                  // Pressing a name selects all of it, ready to be typed over
                  onPointerDown={(e) => {
                    pressedWith.current = e.pointerType;
                  }}
                  onFocus={(e) => {
                    // Used up by this focus. It is not cleared when another name loses the focus,
                    // as that happens after this press, and before this name gets the focus.
                    const pointer = pressedWith.current;
                    pressedWith.current = "";
                    lastNameBox.current = e.currentTarget;
                    // A tap just puts the cursor where it landed
                    if (pointer === "touch" || pointer === "pen") return;
                    e.currentTarget.select();
                  }}
                  onMouseDown={(e) => {
                    keepNameSelected.current =
                      pressedWith.current === "mouse" && document.activeElement !== e.currentTarget;
                  }}
                  onMouseUp={(e) => {
                    if (!keepNameSelected.current) return;
                    keepNameSelected.current = false;
                    e.preventDefault();
                  }}
                  onChange={(e) =>
                    updateGame({
                      type: "change_player_name",
                      playerId: card.id,
                      newPlayerName: e.target.value,
                    })
                  }
                  onKeyDown={(e) => {
                    pressedWith.current = ""; // Whatever moves the focus now is not that press
                    if (e.key !== "Enter") return;
                    if (touchDevice) {
                      // On to the next name, so that the keyboard stays up
                      e.preventDefault();
                      const boxes = Array.from(
                        dialogRef.current?.querySelectorAll<HTMLInputElement>(
                          ".player-name-input",
                        ) ?? [],
                      );
                      const next = boxes[boxes.indexOf(e.currentTarget) + 1];
                      pressedWith.current = "touch";
                      next?.focus();
                      return;
                    }
                    // Done with this name, so on to the button for adding the next player, which
                    // Enter will then press. The focus is moved a moment later, as this Enter is
                    // still on its way, and would otherwise reach the button and press it already.
                    e.currentTarget.blur();
                    setTimeout(() => addButtonRef.current?.focus(), 0);
                  }}
                />
                <div className="delete-button" onClick={() => deletePlayer(card, index)}>
                  <span className="material-symbols-outlined">delete</span>
                </div>
              </div>
              {selectingColorId === card.id && colorPickerPosition && (
                <SelectColorComponent
                  currentColor={card.color}
                  position={colorPickerPosition}
                  playerId={card.id}
                  onClose={() => {
                    setSelectingColorId("");
                    if (touchDevice) setTimeout(focusANameBox, 0);
                  }}
                />
              )}
            </React.Fragment>
          ))}
        </div>
        <div className="edit-players-footer">
          <button className="add-player-button" ref={addButtonRef} onClick={addPlayer}>
            <span className="material-symbols-outlined" aria-hidden="true">
              add
            </span>
            Add player
          </button>
          <button className="done-button" onClick={onClose}>
            <span className="material-symbols-outlined" aria-hidden="true">
              check
            </span>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
