import "./App.scss";
import { TitlePage } from "./components/title-page/TitlePage";
import { Routes, Route } from "react-router-dom";
import { useReducer } from "react";
import { gameReducer } from "./Game";
import { GameContext } from "./GameContext";
import { GamePlayPage } from "./components/game-play-page/GamePlayPage";

export default function App() {
  const [game, updateGame] = useReducer(gameReducer, {
    id: crypto.randomUUID(),
    name: "My Test Game",
    scorecards: [
      {
        id: crypto.randomUUID(),
        playerName: "Hendrik",
        color: "#4363d8",
        scores: [0, 14, -3, 17, 8],
      },
      {
        id: crypto.randomUUID(),
        playerName: "Alida",
        color: "#e6194b",
        scores: [0, 2, 15, -4, 12],
      },
    ],
  });

  return (
    <>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Symbols+Outlined"
      />
      <GameContext value={{ game, updateGame }}>
        <Routes>
          <Route path="/" element={<TitlePage />} />
          <Route path="/play/" element={<GamePlayPage />} />
        </Routes>
      </GameContext>
    </>
  );
}
