import "./PlotScoresComponent.scss";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/GameContext";
import { lastRound, partialScores, totalScoreRange } from "@/utils/Scores";
import { roundTicks, valueTicks } from "@/utils/plotTicks";

interface Point {
  x: number;
  y: number;
}

// Space around the plot, leaving room for the axis labels
const padding = { top: 20, right: 24, bottom: 30, left: 48 };
// How far the axes stick out past the data. Only at the top and right, where there are no labels.
const axisOverhang = 10;
const pixelsPerValueTick = 60;
const pixelsPerRoundLabel = 44;
const tooltipGap = 14; // Between the hover guide and the readout next to it

export function PlotScoresComponent({ highlightedPlayerId }: { highlightedPlayerId: string }) {
  const { game } = useGame();

  const plotAreaRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [hoverRound, setHoverRound] = useState<number | null>(null);

  const { min: minScore, max: maxScore } = totalScoreRange(game);
  const maxRound = lastRound(game);

  // Keep the canvas size in sync with the size of the plot area
  useEffect(() => {
    const plotArea = plotAreaRef.current;
    if (plotArea === null) return;

    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]!.contentRect;
      setCanvasSize({ width: Math.round(rect.width), height: Math.round(rect.height) });
    });
    observer.observe(plotArea);

    return () => observer.disconnect();
  }, []);

  // Only plot if there are at least two rounds and the scores aren't all zero
  const hasData = maxRound > 0 && maxScore > minScore;

  // The part of the canvas that the data is drawn in
  const plot = {
    left: padding.left,
    right: canvasSize.width - padding.right,
    top: padding.top,
    bottom: canvasSize.height - padding.bottom,
  };

  function transform(score: number, round: number): Point {
    const roundStep = (plot.right - plot.left) / maxRound;
    const scoreStep = (plot.bottom - plot.top) / (maxScore - minScore);
    return {
      x: plot.left + round * roundStep,
      y: plot.bottom - (score - minScore) * scoreStep,
    };
  }

  // The round being pointed at, which can be gone by the time we render if the game shrank
  const hover = hasData && hoverRound !== null ? Math.min(hoverRound, maxRound) : null;

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!hasData) return;
    const x = e.clientX - e.currentTarget.getBoundingClientRect().left;
    const round = Math.round(((x - plot.left) / (plot.right - plot.left)) * maxRound);
    setHoverRound(Math.min(maxRound, Math.max(0, round)));
  }

  function onPointerLeave(e: React.PointerEvent<HTMLDivElement>) {
    // A finger lifting off the screen "leaves" too, but then the readout should stay put
    if (e.pointerType === "mouse") setHoverRound(null);
  }

  function renderAxes() {
    const zeroY = transform(0, 0).y;
    const scoreTicks = valueTicks(
      minScore,
      maxScore,
      Math.max(3, Math.floor((plot.bottom - plot.top) / pixelsPerValueTick)),
    );
    const rounds = roundTicks(
      maxRound,
      Math.max(2, Math.floor((plot.right - plot.left) / pixelsPerRoundLabel)),
    );

    return (
      <>
        {scoreTicks.map((tick) => {
          const y = transform(tick, 0).y;
          return (
            <g key={`score-${tick}`}>
              {tick !== 0 && (
                <line className="plot-gridline" x1={plot.left} x2={plot.right} y1={y} y2={y} />
              )}
              <text className="plot-label plot-label-y" x={plot.left - 10} y={y}>
                {tick}
              </text>
            </g>
          );
        })}
        {rounds.map((round) => (
          <text
            key={`round-${round}`}
            className="plot-label plot-label-x"
            x={transform(0, round).x}
            y={plot.bottom + 22}
          >
            {round}
          </text>
        ))}
        <line
          className="plot-axis"
          x1={plot.left}
          x2={plot.right + axisOverhang}
          y1={zeroY}
          y2={zeroY}
        />
        <line
          className="plot-axis"
          x1={plot.left}
          x2={plot.left}
          y1={plot.top - axisOverhang}
          y2={plot.bottom}
        />
      </>
    );
  }

  function renderScorePlots() {
    // The highlighted player goes last, so that their line is drawn on top of the others
    const cards = [...game.scorecards].sort(
      (a, b) => Number(a.id === highlightedPlayerId) - Number(b.id === highlightedPlayerId),
    );

    return cards.map((card) => {
      const points = partialScores(card).map((score, round) => transform(score, round));
      const last = points.at(-1);
      return (
        <g
          key={card.id}
          className={clsx("plot-player", { highlighted: card.id === highlightedPlayerId })}
          color={card.color}
        >
          <polyline className="plot-line" points={points.map((p) => `${p.x},${p.y}`).join(" ")} />
          {last && <circle className="plot-end-dot" cx={last.x} cy={last.y} r={3.5} />}
        </g>
      );
    });
  }

  // The vertical guide and a dot on every line, for the round being pointed at
  function renderHoverMarks(round: number) {
    const x = transform(0, round).x;
    return (
      <g className="plot-hover">
        <line className="plot-guide" x1={x} x2={x} y1={plot.top} y2={plot.bottom} />
        {game.scorecards.map((card) => {
          const totals = partialScores(card);
          const total = totals[round] ?? totals.at(-1) ?? 0;
          const { y } = transform(total, round);
          return (
            <circle
              key={card.id}
              className="plot-hover-dot"
              cx={x}
              cy={y}
              r={4.5}
              color={card.color}
            />
          );
        })}
      </g>
    );
  }

  // Everybody's total after the round being pointed at, best first
  function renderReadout(round: number) {
    const x = transform(0, round).x;
    const rows = game.scorecards
      .map((card) => {
        const totals = partialScores(card);
        return {
          card,
          total: totals[round] ?? totals.at(-1) ?? 0,
          gained: card.scores[round] ?? 0,
        };
      })
      .sort((a, b) => b.total - a.total);

    // Sit beside the guide, on whichever side has more room
    const side =
      x > canvasSize.width / 2
        ? { right: canvasSize.width - x + tooltipGap }
        : { left: x + tooltipGap };

    return (
      <div className="plot-readout" style={{ top: padding.top, ...side }} aria-hidden="true">
        <div className="plot-readout-title">{round === 0 ? "Start" : `Round ${round}`}</div>
        {rows.map(({ card, total, gained }) => (
          <div
            key={card.id}
            className={clsx("plot-readout-row", { highlighted: card.id === highlightedPlayerId })}
          >
            <span className="plot-readout-swatch" style={{ backgroundColor: card.color }} />
            <span className="plot-readout-name">{card.playerName}</span>
            <span className="plot-readout-total">{total}</span>
            <span className="plot-readout-gained">
              {round === 0 ? "" : gained > 0 ? `+${gained}` : gained}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="plot-scores-content">
      <div
        className="plot-area"
        ref={plotAreaRef}
        onPointerMove={onPointerMove}
        onPointerDown={onPointerMove}
        onPointerLeave={onPointerLeave}
      >
        <svg
          className="plot-canvas"
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
          role="img"
          aria-label="Line chart of each player's total score after every round"
        >
          {hasData && (
            <>
              {renderAxes()}
              {renderScorePlots()}
              {hover !== null && renderHoverMarks(hover)}
            </>
          )}
        </svg>
        {hover !== null && renderReadout(hover)}
        {!hasData && (
          <div className="plot-empty">
            <div className="plot-empty-title">Nothing to plot yet</div>
            <div className="plot-empty-hint">Scores show up here once a round has been played</div>
          </div>
        )}
      </div>
    </div>
  );
}
