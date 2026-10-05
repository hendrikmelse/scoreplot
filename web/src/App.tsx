import "./App.scss";
import { useReducer } from "react";
import { Routes, Route, useSearchParams } from "react-router-dom";
import { createGame, gameReducer } from "@/Game";
import { createDemoGame } from "@/demoGame";
import { GameContext } from "@/GameContext";
import { TitlePage } from "@/components/title-page/TitlePage";
import { GamePlayPage } from "@/components/game-play-page/GamePlayPage";

export default function App() {
  // Opening the app with "?demo" in the URL starts with an example game to look at
  const [searchParams] = useSearchParams();
  const [game, updateGame] = useReducer(gameReducer, searchParams.has("demo"), (demo) =>
    demo ? createDemoGame() : createGame(),
  );

  return (
    <GameContext value={{ game, updateGame }}>
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/play/" element={<GamePlayPage />} />
      </Routes>
    </GameContext>
  );
}
