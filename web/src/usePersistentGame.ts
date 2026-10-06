import { useCallback, useEffect, useReducer, useState } from "react";
import { createGame, gameReducer, type Game, type UpdateGameAction } from "@/Game";
import { createDemoGame } from "@/demoGame";
import { loadSavedGame, saveGame } from "@/utils/gameStorage";

interface PersistentGame {
  game: Game;
  updateGame: React.Dispatch<UpdateGameAction>;
  /** Whether there is a game worth continuing: one that was saved, or that something has been done to */
  hasGame: boolean;
}

/**
 * The game being played, kept in the browser's storage so that it is still there after a reload.
 * With `demo`, it is an example game that is neither loaded from nor saved to storage, so that
 * playing with it can never overwrite a real game.
 */
export function usePersistentGame(demo: boolean): PersistentGame {
  const [initial] = useState(() => {
    // The DEV check lets production builds drop the demo game from the bundle
    if (import.meta.env.DEV && demo) return { game: createDemoGame(), hasGame: true };
    const saved = loadSavedGame();
    return saved ? { game: saved, hasGame: true } : { game: createGame(), hasGame: false };
  });
  const [game, dispatch] = useReducer(gameReducer, initial.game);
  const [hasGame, setHasGame] = useState(initial.hasGame);

  const updateGame = useCallback((action: UpdateGameAction) => {
    setHasGame(true);
    dispatch(action);
  }, []);

  // A brand new game is not saved until something has been done to it
  useEffect(() => {
    if (!demo && hasGame) saveGame(game);
  }, [game, hasGame, demo]);

  return { game, updateGame, hasGame };
}
