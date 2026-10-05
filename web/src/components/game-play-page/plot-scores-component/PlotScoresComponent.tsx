import "./PlotScoresComponent.scss";
import { useContext, useEffect, useRef, useState } from "react";
import { GameContext } from "@/GameContext";
import { partialScores } from "@/utils/Scores";
import { Scorecard } from "@/Game";

interface Point {
  x: number;
  y: number;
}

export function PlotScoresComponent() {
  const { game } = useContext(GameContext)!;

  const plotAreaRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Derived directly from the game, so they can never be out of sync with it
  const maxScore = Math.max(
    ...game.scorecards.map((scorecard) => Math.max(...partialScores(scorecard))),
  );
  const minScore = Math.min(
    ...game.scorecards.map((scorecard) => Math.min(...partialScores(scorecard))),
  );
  const maxRound = Math.max(...game.scorecards.map((scorecard) => scorecard.scores.length - 1));

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

  function transform(score: number, round: number): Point {
    const roundStep = (canvasSize.width - 40) / maxRound;
    const scoreStep = (canvasSize.height - 40) / (maxScore - minScore);
    return {
      x: 20 + round * roundStep,
      y: canvasSize.height - (20 + (score - minScore) * scoreStep),
    };
  }

  function getXAxis() {
    const height = transform(0, 0).y;
    return <line x1={10} y1={height} x2={canvasSize.width - 10} y2={height} stroke="white"></line>;
  }

  function getYAxis() {
    return <line x1={20} y1={10} x2={20} y2={canvasSize.height - 10} stroke="white"></line>;
  }

  function getScorePlot(scorecard: Scorecard) {
    const segments = [];
    const points = partialScores(scorecard).map((score, round) => transform(score, round));
    for (let i = 0; i < points.length - 1; ++i) {
      segments.push(
        <line
          key={i}
          x1={points[i]?.x}
          y1={points[i]?.y}
          x2={points[i + 1]?.x}
          y2={points[i + 1]?.y}
          stroke={scorecard.color}
          strokeWidth={2}
        ></line>,
      );
    }

    return <>{segments}</>;
  }

  return (
    <div className="plot-scores-content">
      <div className="plot-area" ref={plotAreaRef}>
        <svg className="plot-canvas" viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}>
          {maxRound !== 0 && (minScore !== 0 || maxScore !== 0) ? (
            <>
              {getXAxis()}
              {getYAxis()}
              {game.scorecards.map((scorecard) => getScorePlot(scorecard))}
            </>
          ) : (
            <></>
          )}
        </svg>
      </div>
    </div>
  );
}
