import "./App.scss";
import { useState } from "react";
import { Routes, Route, useSearchParams } from "react-router-dom";
import { usePersistentGame } from "@/usePersistentGame";
import { GameContext } from "@/GameContext";
import { ToastProvider } from "@/components/toast/ToastProvider";
import { TitlePage } from "@/components/title-page/TitlePage";
import { GamePlayPage } from "@/components/game-play-page/GamePlayPage";

export default function App() {
  // Opening the app with "?demo" in the URL starts with an example game to look at. This is only
  // looked at once, as the "?demo" is gone from the URL as soon as the app goes to another page.
  const [searchParams] = useSearchParams();
  const [demo] = useState(() => searchParams.has("demo"));
  const { game, updateGame, hasGame } = usePersistentGame(demo);

  return (
    <GameContext value={{ game, updateGame, hasGame }}>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<TitlePage />} />
          <Route path="/play/" element={<GamePlayPage />} />
        </Routes>
      </ToastProvider>
    </GameContext>
  );
}
