import { produce } from "immer";
import { defaultColors } from "@/config";
import { generatedColor } from "@/utils/color";
import { newId } from "@/utils/newId";

// ========== Game interfaces ==========

export interface Game {
  id: string;
  name: string;
  scorecards: Scorecard[];
}

export interface Scorecard {
  id: string;
  playerName: string;
  color: string;
  /** scores[0] is the initial score, scores[n] is the score for round n */
  scores: number[];
}

/** What a game is called until it is given a name, which says how to give it one */
export const DEFAULT_GAME_NAME = "New Game (click to edit)";

export function createGame(): Game {
  return {
    id: newId(),
    name: DEFAULT_GAME_NAME,
    scorecards: [
      {
        id: newId(),
        playerName: "Player 1",
        color: defaultColors[0]!,
        scores: [0],
      },
    ],
  };
}

/** Whether nothing has been done to a game yet since it was created */
export function isUntouched(game: Game): boolean {
  const [only, ...others] = game.scorecards;
  return (
    game.name === DEFAULT_GAME_NAME &&
    only !== undefined &&
    others.length === 0 &&
    only.playerName === "Player 1" &&
    only.scores.every((score) => score === 0)
  );
}

/** The first default color that no player is using yet, then generated colors once those run out */
export function nextPlayerColor(game: Game): string {
  const used = new Set(game.scorecards.map((card) => card.color));
  const unused = defaultColors.find((color) => !used.has(color));
  if (unused) return unused;

  for (let i = defaultColors.length; ; i++) {
    const color = generatedColor(i);
    if (!used.has(color)) return color;
  }
}

// ========== Dispatcher ==========

export type UpdateGameAction =
  | { type: "new_game" }
  | { type: "load_game"; game: Game } // Replace the whole game, e.g. to undo starting a new one
  | { type: "update_name"; newName: string }
  | { type: "add_player"; newPlayerId: string; newPlayerName: string; newPlayerColor: string }
  | { type: "delete_player"; playerId: string }
  | { type: "restore_player"; card: Scorecard; index: number } // Put a deleted player back
  | { type: "change_player_color"; playerId: string; newColor: string }
  | { type: "change_player_name"; playerId: string; newPlayerName: string }
  | { type: "move_player"; playerId: string; direction: "up" | "down" }
  | { type: "add_score"; playerId: string; round: number; score: number }
  | { type: "add_round"; round: number }
  | { type: "trim_scores" };

export const gameReducer = produce((draft: Game, action: UpdateGameAction): Game | void => {
  const findCard = (playerId: string) => draft.scorecards.find((card) => card.id === playerId);

  switch (action.type) {
    case "new_game":
      return createGame();
    case "load_game":
      return action.game;
    case "update_name":
      draft.name = action.newName;
      break;
    case "add_player":
      draft.scorecards.push({
        id: action.newPlayerId,
        playerName: action.newPlayerName,
        color: action.newPlayerColor,
        scores: Array(draft.scorecards[0]?.scores.length ?? 1).fill(0),
      });
      break;
    case "delete_player": {
      const index = draft.scorecards.findIndex((card) => card.id === action.playerId);
      if (index >= 0) draft.scorecards.splice(index, 1);
      break;
    }
    case "restore_player":
      // Back where it was, or as near as the list now allows. Never twice.
      if (!findCard(action.card.id)) {
        const index = Math.min(Math.max(action.index, 0), draft.scorecards.length);
        draft.scorecards.splice(index, 0, action.card);
      }
      break;
    case "change_player_color": {
      const card = findCard(action.playerId);
      if (card) card.color = action.newColor;
      break;
    }
    case "change_player_name": {
      const card = findCard(action.playerId);
      if (card) card.playerName = action.newPlayerName;
      break;
    }
    case "move_player": {
      const from = draft.scorecards.findIndex((card) => card.id === action.playerId);
      const to = action.direction === "up" ? from - 1 : from + 1;
      if (from >= 0 && to >= 0 && to < draft.scorecards.length) {
        const [card] = draft.scorecards.splice(from, 1);
        draft.scorecards.splice(to, 0, card!);
      }
      break;
    }
    case "add_score": {
      const card = findCard(action.playerId);
      if (!card) break;
      while (card.scores.length < action.round) card.scores.push(0);
      card.scores[action.round] = action.score;
      break;
    }
    case "add_round":
      for (const card of draft.scorecards) {
        while (card.scores.length <= action.round) card.scores.push(0);
      }
      break;
    case "trim_scores":
      // Delete trailing rounds in which nobody scored, but always keep the initial scores
      while (
        draft.scorecards.length > 0 &&
        draft.scorecards.every((card) => card.scores.length > 1 && card.scores.at(-1) === 0)
      ) {
        draft.scorecards.forEach((card) => card.scores.pop());
      }
      break;
  }
});
