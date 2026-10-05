import { createContext, useContext } from "react";
import type { Game, UpdateGameAction } from "@/Game";

interface GameContextValue {
  game: Game;
  updateGame: React.Dispatch<UpdateGameAction>;
  /** Whether there is a game to continue, rather than just the blank one the app starts with */
  hasGame: boolean;
}

export const GameContext = createContext<GameContextValue | null>(null);

export function useGame(): GameContextValue {
  const value = useContext(GameContext);
  if (value === null) throw new Error("useGame must be used inside a GameContext provider");
  return value;
}
