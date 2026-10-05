import "./ScoreTableComponent.scss";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/GameContext";
import { lastRound, totalScore } from "@/utils/Scores";
import { parseScore } from "@/utils/scoreInput";

/** Where a score is being edited */
interface Cell {
  playerId: string;
  round: number;
}

const cellKey = ({ playerId, round }: Cell) => `${playerId}:${round}`;

export function ScoreTableComponent({
  onScoreChanged,
}: {
  /** Called with the player whose score was changed, after it has been */
  onScoreChanged?: (playerId: string) => void;
}) {
  const { game, updateGame } = useGame();
  const [editing, setEditing] = useState<Cell | null>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  // After editing with the keyboard, focus goes back to the score, so that it isn't lost
  const refocus = useRef<Cell | null>(null);

  const rounds = Array.from({ length: lastRound(game) + 1 }, (_, round) => round);

  // The starting scores are only worth a row if somebody actually started with something
  const hasStartingScores = game.scorecards.some((card) => (card.scores[0] ?? 0) !== 0);
  const shownRounds = hasStartingScores ? rounds : rounds.slice(1);

  useEffect(() => {
    if (editing !== null || refocus.current === null) return;
    const key = cellKey(refocus.current);
    refocus.current = null;

    // Not straight away: the Enter that finished the editing is still being delivered, and if it
    // reached the score's button it would press it, which would start editing all over again
    const timer = setTimeout(() => {
      tableRef.current?.querySelector<HTMLElement>(`[data-cell="${key}"]`)?.focus();
    }, 0);
    return () => clearTimeout(timer);
  }, [editing]);

  function finishEditing(cell: Cell, score: number | null, andRefocus: boolean) {
    const current = game.scorecards.find((card) => card.id === cell.playerId)?.scores[cell.round];
    if (score !== null && score !== (current ?? 0)) {
      updateGame({ type: "add_score", playerId: cell.playerId, round: cell.round, score });
      onScoreChanged?.(cell.playerId);
    }
    refocus.current = andRefocus ? cell : null;
    setEditing(null);
  }

  if (game.scorecards.length === 0) {
    return <div className="score-table-content score-table-empty">No players</div>;
  }

  return (
    <div className="score-table-content">
      <div className="table-scroll" ref={tableRef}>
        <table
          className="score-table"
          style={{ "--player-count": game.scorecards.length } as React.CSSProperties}
        >
          <thead>
            <tr>
              <th className="corner" />
              {game.scorecards.map((card) => (
                <th
                  key={card.id}
                  className="player-header"
                  style={{ borderBottomColor: card.color }}
                  title={card.playerName}
                >
                  {card.playerName}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shownRounds.map((round) => (
              <tr
                key={round}
                className={clsx({ "start-row": round === 0, shaded: round % 2 === 1 })}
              >
                <th className="round-label">{round === 0 ? "Start" : round}</th>
                {game.scorecards.map((card) => {
                  const cell = { playerId: card.id, round };
                  const score = card.scores[round] ?? 0;
                  const roundName = round === 0 ? "starting score" : `round ${round}`;
                  const isEditing = editing !== null && cellKey(editing) === cellKey(cell);
                  return (
                    <td
                      key={card.id}
                      className={clsx("score-cell", { negative: score < 0, editing: isEditing })}
                    >
                      {isEditing ? (
                        <ScoreInput
                          score={score}
                          label={`${card.playerName}, ${roundName}`}
                          onFinish={(newScore, andRefocus) =>
                            finishEditing(cell, newScore, andRefocus)
                          }
                        />
                      ) : (
                        <button
                          className="score-button"
                          data-cell={cellKey(cell)}
                          aria-label={`Edit ${card.playerName}'s ${roundName}, now ${score}`}
                          onClick={() => setEditing(cell)}
                        >
                          {score}
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th className="round-label">Total</th>
              {game.scorecards.map((card) => {
                const total = totalScore(card);
                return (
                  <td key={card.id} className={clsx("total-cell", { negative: total < 0 })}>
                    {total}
                  </td>
                );
              })}
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="score-table-hint">Tap a score to edit it</div>
    </div>
  );
}

/** A text box for changing a score, which saves when it is left or Enter is pressed */
function ScoreInput({
  score,
  label,
  onFinish,
}: {
  score: number;
  label: string;
  /** With the new score, or null if there isn't one (it was cancelled, or isn't a number) */
  onFinish: (score: number | null, andRefocus: boolean) => void;
}) {
  const [text, setText] = useState(String(score));
  const inputRef = useRef<HTMLInputElement>(null);
  // Finishing can happen twice (Enter, and then the box going away), but only counts once
  const finished = useRef(false);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function finish(save: boolean, andRefocus: boolean) {
    if (finished.current) return;
    finished.current = true;
    onFinish(save ? parseScore(text) : null, andRefocus);
  }

  return (
    <input
      ref={inputRef}
      className="score-input-box"
      type="text"
      enterKeyHint="done"
      autoComplete="off"
      aria-label={label}
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => finish(true, false)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(true, true);
        else if (e.key === "Escape") finish(false, true);
      }}
    />
  );
}
