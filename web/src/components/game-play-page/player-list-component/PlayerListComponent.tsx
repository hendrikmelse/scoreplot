import "./PlayerListComponent.scss";
import clsx from "clsx";
import React, { useContext, useLayoutEffect, useState, useRef, useEffect } from "react";
import { GameContext } from "App";
import { totalScore } from "utils/Scores";
import { SelectColorComponent } from "./SelectColorComponent/SelectColorComponent";
import { defaultColors } from "config";

export function PlayerListComponent({ round, selectedPlayerId, onSelectPlayer, onPrevRound, onNextRound, editing }: {
  round: number,
  selectedPlayerId: string,
  onSelectPlayer: (id: string) => void
  onPrevRound: () => void,
  onNextRound: () => void,
  editing: boolean,
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectingColorId, setSelectingColorId] = useState("");
  const [colorPickerPosition, setColorPickerPosition] = useState<DOMRect | null>(null);
  const [editingPlayerNameId, setEditingPlayerNameId] = useState("");
  const [dragId, setDragId] = useState("");
  const dragStartY = useRef(0);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const { game, updateGame } = useContext(GameContext)!;
  const playerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const playerPositions = useRef<Map<string, DOMRect>>(new Map());
  const playerSpacing = useRef(0);
  
  // Highlight text automatically when a player name is edited
  const lastPlayerId = game.scorecards.at(-1)?.id;
  useEffect(() => {
    if (editingPlayerNameId === "next") {
      setEditingPlayerNameId(lastPlayerId ?? "");
    }
    inputRef.current?.select();
  }, [editingPlayerNameId, lastPlayerId]);

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

  function onEditNameClick(id: string) {
    if (editing) {
      setEditingPlayerNameId(editingPlayerNameId === id ? "" : id);
    }
  }

  function updatePlayerName(newName: string, id: string) {
    updateGame({
      type: "change_player_name",
      playerId: id,
      newPlayerName: newName,
    });
  }

  function onColorClick(e: React.MouseEvent<HTMLDivElement>, id: string) {
    if (editing) {
      const rect = e.currentTarget.getBoundingClientRect();
      setSelectingColorId(id);
      setColorPickerPosition(rect);
    }
  }

  function addPlayer() {
    setEditingPlayerNameId("next"); // After game is updated, this will convert to the new player
    updateGame({
      type: "add_player",
      newPlayerName: "Player " + (game.scorecards.length + 1),
      // Choose the first unused default color
      newPlayerColor: defaultColors.find((color) => !game.scorecards.some((card) => card.color === color)) ?? "#0000e0"
    });
  }

  function deletePlayer(id: string) {
    updateGame({
      type: "delete_player",
      playerId: id,
    });
  }

  // Measure the position of each player. Used for FLIP animations
  function measurePlayerPositions() {
    playerRefs.current.forEach((player, id) => {
      playerPositions.current.set(id, player.getBoundingClientRect())
    });
  }

  // Se need to know what the player spacing is in order to know how far to drag before reordering the list
  function measurePlayerSpacing() {
    const players = Array.from(playerRefs.current.values());
    if (players.length >= 2) {
      const r1 = players[0]!.getBoundingClientRect();
      const r2 = players[1]!.getBoundingClientRect();
      playerSpacing.current = r2.top - r1.top;
    }
  }

  function startDragging(e: React.PointerEvent, id: string)
  {
    document.body.style.userSelect = "none";
    playerRefs.current.get(id)!.style.removeProperty("transition");
    measurePlayerSpacing();
    measurePlayerPositions();
    dragStartY.current = e.clientY;
    setDragDeltaY(0);
    setDragId(id);

    window.addEventListener("pointerup", stopDragging);
  }
  
  function stopDragging()
  {
    console.log("Stopping dragging");
    document.body.style.userSelect = "";
    setDragId("");

    window.removeEventListener("pointerup", stopDragging);
  }

  function onDrag(e: React.PointerEvent)
  {
    if (dragId === "") return;

    // Compute how far we've dragged and where the dragged item currently is in the list
    const deltaY = e.clientY - dragStartY.current;
    const index = game.scorecards.findIndex((card) => card.id === dragId)

    // Figure out if we need to move the item's position
    if (index > 0 && -deltaY > playerSpacing.current * 3 / 5) {
      measurePlayerPositions();
      dragStartY.current -= playerSpacing.current;
      updateGame({
        type: "move_player",
        playerId: dragId,
        direction: "up",
      });
    }
    else if (index < game.scorecards.length - 1 && deltaY > playerSpacing.current * 3 / 5) {
      measurePlayerPositions();
      dragStartY.current += playerSpacing.current;
      updateGame({
        type: "move_player",
        playerId: dragId,
        direction: "down",
      });
    }

    // Need to recompute the delta here because the start Y may have been updated by a reorder
    setDragDeltaY(e.clientY - dragStartY.current);
  }

  return (
    <>
      <div className={"round-buttons"}>
        <button className={clsx({ hidden: round === -1 || editing })} onClick={() => onPrevRound()}><span className="material-symbols-outlined">arrow_left_alt</span></button>
        <div className="round-label">{editing ? "Edit Players" : round === 0 ? "Initial Score" : round === -1 ? "Total Scores" : `Round ${round}`}</div>
        <button className={round === -1 || editing ? "hidden" : ""} onClick={() => onNextRound()}><span className="material-symbols-outlined">arrow_right_alt</span></button>
      </div>
      <div className="player-list" onPointerMove={(e) => onDrag(e)}>
        { game.scorecards.map((card, index) => <React.Fragment key={card.id}>
          <div className={clsx("player", { selected: selectedPlayerId === card.id && round >= 0 && !editing, editing: editing, dragging: dragId === card.id })}
            onClick={() => onSelectPlayer(card.id)}
            ref={(el) => {
              if (el) playerRefs.current.set(card.id, el);
              else playerRefs.current.delete(card.id);
            }}
            style={card.id === dragId ? { transform: `translateY(${Math.min(Math.max(dragDeltaY, index === 0 ? -playerSpacing.current / 6 : -Infinity), index === game.scorecards.length - 1 ? playerSpacing.current / 6 : Infinity)}px)` } : {}}
          >
            <div className="spacer-left" />
            <div className={clsx("drag-handle", { hidden: !editing })} onPointerDown={(e) => startDragging(e, card.id)}><span className="material-symbols-outlined">drag_handle</span></div>
            <div className="player-color" style={{ "backgroundColor": card.color }} onClick={(e) => onColorClick(e, card.id)}/>
            <div className={clsx("edit-name-button", { hidden: !editing })} onClick={() => onEditNameClick(card.id)}><span className="material-symbols-outlined">edit</span></div>
            { editingPlayerNameId === card.id ?
              <input className="player-name-input"
                ref={inputRef} value={card.playerName}
                onChange={(e) => updatePlayerName(e.target.value, card.id)}
                onBlur={() => setEditingPlayerNameId("")}
                onKeyDown={(e) => { if (e.key === "Enter") setEditingPlayerNameId("")}}/> :
              <div className="player-name" onClick={() => onEditNameClick(card.id)}>{card.playerName}</div>
            }
            <div className={clsx("score", {hidden: editing })}>{round >= 0 ? card.scores[round] : totalScore(card)}</div>
            <div className={clsx("delete-button", {hidden: !editing })} onClick={() => deletePlayer(card.id)}><span className="material-symbols-outlined">delete</span></div>
            <div className="spacer-right" />
          </div>
          {
            selectingColorId === card.id ?
              <SelectColorComponent
                currentColor={card.color}
                position={colorPickerPosition!}
                playerId={card.id}
                onClose={() => setSelectingColorId("")}
              /> :
              <></>
          }
        </React.Fragment>)}
      </div>
      <div className={clsx("add-player-row", { hidden: !editing })}>
        <button className="add-player-button" onClick={() => addPlayer()}><span className="material-symbols-outlined">add</span></button>
      </div>
    </>
  );
}