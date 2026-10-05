import "./PlotScoresComponent.scss";
import { useEffect, useRef, useState } from "react";
import { useGame } from "@/GameContext";
import type { Scorecard } from "@/Game";
import { lastRound, partialScores, totalScoreRange } from "@/utils/Scores";

interface Point {
  x: number;
  y: number;
}

const margin = 20;

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

  function transform(score: number, round: number): Point {
    const roundStep = (canvasSize.width - 2 * margin) / maxRound;
    const scoreStep = (canvasSize.height - 2 * margin) / (maxScore - minScore);
    return {
      x: margin + round * roundStep,
      y: canvasSize.height - (margin + (score - minScore) * scoreStep),
    };
  }

  function renderScorePlot(scorecard: Scorecard) {
    const points = partialScores(scorecard).map((score, round) => transform(score, round));
    return points
      .slice(1)
      .map((point, i) => (
        <line
          key={`${scorecard.id}-${i}`}
          x1={points[i]!.x}
          y1={points[i]!.y}
          x2={point.x}
          y2={point.y}
          stroke={scorecard.color}
          strokeWidth={2}
        />
      ));
  }

  const axisY = transform(0, 0).y;

  return (
    <div className="plot-scores-content">
      <div className="plot-area" ref={plotAreaRef}>
        <svg className="plot-canvas" viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}>
          {hasData && (
            <>
              <line x1={10} y1={axisY} x2={canvasSize.width - 10} y2={axisY} stroke="white" />
              <line x1={margin} y1={10} x2={margin} y2={canvasSize.height - 10} stroke="white" />
              {game.scorecards.map(renderScorePlot)}
            </>
          )}
        </svg>
      </div>
    </div>
  );
}
