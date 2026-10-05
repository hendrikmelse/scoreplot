import "./App.scss";
import { useReducer } from "react";
import { Routes, Route } from "react-router-dom";
import { createGame, gameReducer } from "@/Game";
import { GameContext } from "@/GameContext";
import { TitlePage } from "@/components/title-page/TitlePage";
import { GamePlayPage } from "@/components/game-play-page/GamePlayPage";

export default function App() {
  const [game, updateGame] = useReducer(gameReducer, undefined, createGame);

  return (
    <GameContext value={{ game, updateGame }}>
      <Routes>
        <Route path="/" element={<TitlePage />} />
        <Route path="/play/" element={<GamePlayPage />} />
      </Routes>
    </GameContext>
  );
}
