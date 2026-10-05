import "./PlotScoresComponent.scss";
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
const axisOverhang = 10; // How far the axes stick out past the data
const pixelsPerValueTick = 60;
const pixelsPerRoundLabel = 44;

export function PlotScoresComponent() {
  const { game } = useGame();

  const plotAreaRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

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
              <text className="plot-label plot-label-y" x={plot.left - 8} y={y}>
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
            y={plot.bottom + 20}
          >
            {round}
          </text>
        ))}
        <line
          className="plot-axis"
          x1={plot.left - axisOverhang}
          x2={plot.right + axisOverhang}
          y1={zeroY}
          y2={zeroY}
        />
        <line
          className="plot-axis"
          x1={plot.left}
          x2={plot.left}
          y1={plot.top - axisOverhang}
          y2={plot.bottom + axisOverhang}
        />
      </>
    );
  }

  function renderScorePlots() {
    return game.scorecards.map((card) => {
      const points = partialScores(card).map((score, round) => transform(score, round));
      const last = points.at(-1);
      return (
        <g key={card.id} color={card.color}>
          <polyline className="plot-line" points={points.map((p) => `${p.x},${p.y}`).join(" ")} />
          {last && <circle className="plot-end-dot" cx={last.x} cy={last.y} r={3.5} />}
        </g>
      );
    });
  }

  return (
    <div className="plot-scores-content">
      <div className="plot-area" ref={plotAreaRef}>
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
            </>
          )}
        </svg>
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
