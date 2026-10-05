import { createContext } from "react";
import type { Game, UpdateGameAction } from "@/Game";

export const GameContext = createContext<{
  game: Game;
  updateGame: React.Dispatch<UpdateGameAction>;
} | null>(null);
