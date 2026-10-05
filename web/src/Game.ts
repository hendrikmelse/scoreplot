import { produce } from "immer";
import { defaultColors } from "@/config";
import { generatedColor } from "@/utils/color";

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

export function createGame(): Game {
  return {
    id: crypto.randomUUID(),
    name: "New Game",
    scorecards: [
      {
        id: crypto.randomUUID(),
        playerName: "Player 1",
        color: defaultColors[0]!,
        scores: [0],
      },
    ],
  };
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
  | { type: "update_name"; newName: string }
  | { type: "add_player"; newPlayerId: string; newPlayerName: string; newPlayerColor: string }
  | { type: "delete_player"; playerId: string }
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
