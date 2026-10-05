import { produce } from "immer";

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
  scores: number[];
}

// ========== Disptacher ==========

interface UpdateName {
  type: "update_name";
  newName: string;
}

interface AddPlayer {
  type: "add_player";
  newPlayerName: string;
  newPlayerColor: string;
}

interface DeletePlayer {
  type: "delete_player";
  playerId: string;
}

interface ChangePlayerColor {
  type: "change_player_color";
  playerId: string;
  newColor: string;
}

interface ChangePlayerName {
  type: "change_player_name";
  playerId: string;
  newPlayerName: string;
}

interface MovePlayer {
  type: "move_player";
  playerId: string;
  direction: "up" | "down";
}

interface AddScore {
  type: "add_score";
  playerId: string;
  round: number;
  score: number;
}

interface AddRound {
  type: "add_round";
  round: number;
}

interface TrimScores {
  type: "trim_scores";
}

export type UpdateGameAction =
  | UpdateName
  | AddPlayer
  | DeletePlayer
  | ChangePlayerColor
  | ChangePlayerName
  | MovePlayer
  | AddScore
  | AddRound
  | TrimScores;

export function gameReducer(game: Game, action: UpdateGameAction) {
  switch (action.type) {
    case "update_name":
      return produce(game, (draft) => {
        draft.name = action.newName;
      });
    case "add_player":
      return produce(game, (draft) => {
        draft.scorecards.push({
          id: crypto.randomUUID(),
          playerName: action.newPlayerName,
          color: action.newPlayerColor,
          scores: Array(draft.scorecards[0]?.scores.length ?? 0).fill(0),
        });
      });
    case "delete_player":
      return produce(game, (draft) => {
        draft.scorecards.splice(
          draft.scorecards.findIndex((card) => card.id === action.playerId),
          1,
        );
      });
    case "change_player_color":
      return produce(game, (draft) => {
        draft.scorecards.find((card) => card.id === action.playerId)!.color = action.newColor;
      });
    case "change_player_name":
      return produce(game, (draft) => {
        draft.scorecards.find((card) => card.id === action.playerId)!.playerName =
          action.newPlayerName;
      });
    case "move_player":
      return produce(game, (draft) => {
        const index =
          draft.scorecards.findIndex((card) => card.id === action.playerId) +
          (action.direction === "up" ? -1 : 0);
        if (index >= 0 && index + 1 < draft.scorecards.length) {
          const [card] = draft.scorecards.splice(index, 1);
          draft.scorecards.splice(index + 1, 0, card!);
        }
      });
    case "add_score":
      return produce(game, (draft) => {
        const scorecard = draft.scorecards.find((card) => card.id === action.playerId);

        while (scorecard!.scores.length < action.round) {
          scorecard!.scores.push(0);
        }
        scorecard!.scores[action.round] = action.score;
      });
    case "add_round":
      return produce(game, (draft) => {
        for (const scorecard of draft.scorecards) {
          while (scorecard.scores.length <= action.round) {
            scorecard.scores.push(0);
          }
        }
      });
    case "trim_scores":
      return produce(game, (draft) => {
        while (draft.scorecards.every((card) => card.scores.at(-1) === 0)) {
          draft.scorecards.forEach((card) => card.scores.pop());
        }
      });
  }
}
