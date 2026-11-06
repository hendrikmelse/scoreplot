import "./PlayerListComponent.scss";
import clsx from "clsx";
import { useRef, useEffect, useState } from "react";
import { useGame } from "@/GameContext";
import { totalScore } from "@/utils/Scores";

/** The round passed in when the player list should show total scores instead of a round */
const TOTAL_SCORES = -1;

/** For a button that is hidden by being see-through: keep it out of the tab order and the accessibility tree too */
function hiddenFromEveryone(hidden: boolean) {
  return hidden ? { tabIndex: -1, "aria-hidden": true } : {};
}

function roundLabel(round: number): string {
  if (round === TOTAL_SCORES) return "Total Scores";
  if (round === 0) return "Initial Score";
  return `Round ${round}`;
}

/** The players and their scores, for looking at and for picking who the next score is for */
export function PlayerListComponent({
  round,
  selectedPlayerId,
  onSelectPlayer,
  onPrevRound,
  onNextRound,
  onHighlightPlayer,
  pinnedPlayerId,
  flashCounts,
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
  /**
   * How many times each player's score has been told to bounce. A score bounces when its count goes
   * up, however many times that has already happened.
   */
  flashCounts: Record<string, number>;
}) {
  const { game } = useGame();
  const listRef = useRef<HTMLDivElement>(null);
  const playerRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const showingRound = round !== TOTAL_SCORES;

  // Going from one round to another, the heading and the scores slide in from the side that the new
  // round is on (the next round from the right, the one before from the left). Changing between a
  // round and the total scores is not that, so they are left alone. It is worked out as the round
  // changes (and not in an effect after it), so that they are there with the new round, as it appears.
  const [shownRound, setShownRound] = useState(round);
  const [roundChange, setRoundChange] = useState({ direction: "next", count: 0 });
  if (shownRound !== round) {
    setShownRound(round);
    if (round !== TOTAL_SCORES && shownRound !== TOTAL_SCORES) {
      setRoundChange((change) => ({
        direction: round > shownRound ? "next" : "prev",
        count: change.count + 1,
      }));
    }
  }
  // Each change is a new element, which is what starts its animation
  const slideClass = roundChange.count > 0 ? `slide-from-${roundChange.direction}` : undefined;

  // Keep the selected player in the middle of the list as the keypad moves through it, gliding
  // there from the one before. Where there is no one before (the list has only just come up), or
  // for somebody who would rather not have things move about, it is just there.
  const previousSelectedId = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!showingRound) return;
    const moved =
      previousSelectedId.current !== undefined && previousSelectedId.current !== selectedPlayerId;
    previousSelectedId.current = selectedPlayerId;
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    playerRefs.current.get(selectedPlayerId)?.scrollIntoView?.({
      block: "center",
      behavior: moved && !reducedMotion ? "smooth" : "instant",
    });
  }, [selectedPlayerId, showingRound]);

  // Let the stylesheet know whether there is more of the list above or below what can be seen, so
  // that the list can fade out at an edge that has more beyond it, rather than being cut off. This
  // is kept in attributes on the list, which changes with every scroll but needs no rendering.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;

    function update() {
      if (!list) return;
      const hiddenAbove = list.scrollTop;
      const hiddenBelow = list.scrollHeight - list.clientHeight - list.scrollTop;
      list.dataset.moreAbove = String(hiddenAbove > 1);
      list.dataset.moreBelow = String(hiddenBelow > 1);
    }

    update();
    list.addEventListener("scroll", update, { passive: true });
    // The size changes with the window
    const observer = new ResizeObserver(update);
    observer.observe(list);

    return () => {
      list.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [game.scorecards.length]); // And when there are more or fewer players to scroll through

  return (
    <>
      <div className="round-buttons">
        <button
          className={clsx({ hidden: !showingRound })}
          aria-label="Previous round"
          title="Previous round"
          {...hiddenFromEveryone(!showingRound)}
          disabled={showingRound && round === 0} // The first round, with nothing before it
          onClick={() => onPrevRound()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_left
          </span>
        </button>
        <div className="round-label">
          <span key={roundChange.count} className={slideClass}>
            {roundLabel(round)}
          </span>
        </div>
        <button
          className={clsx({ hidden: !showingRound })}
          aria-label="Next round"
          title="Next round"
          {...hiddenFromEveryone(!showingRound)}
          onClick={() => onNextRound()}
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            chevron_right
          </span>
        </button>
      </div>
      <div className="player-list" ref={listRef}>
        {game.scorecards.length === 0 && (
          <div className="player-list-empty">
            <div className="player-list-empty-title">No players yet</div>
            <div className="player-list-empty-hint">
              Press <span className="player-list-empty-button">Edit players</span> to add some
            </div>
          </div>
        )}
        {game.scorecards.map((card) => (
          <div
            key={card.id}
            className={clsx("player", {
              selected: selectedPlayerId === card.id && showingRound,
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
          >
            <div className="spacer-left" />
            <div className="player-color" style={{ backgroundColor: card.color }} />
            <div className="player-name">{card.playerName}</div>
            <div
              // Bounces when the score has just been updated. Two names that take turns, as it is a
              // change of animation that restarts one.
              className={clsx("score", {
                "flash-a": (flashCounts[card.id] ?? 0) % 2 === 1,
                "flash-b": (flashCounts[card.id] ?? 0) > 0 && (flashCounts[card.id] ?? 0) % 2 === 0,
              })}
            >
              <span key={roundChange.count} className={slideClass}>
                {showingRound ? (card.scores[round] ?? 0) : totalScore(card)}
              </span>
            </div>
            <div className="spacer-right" />
          </div>
        ))}
      </div>
    </>
  );
}
