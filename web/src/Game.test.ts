import { createGame, gameReducer, nextPlayerColor, type Game, type UpdateGameAction } from "@/Game";
import { defaultColors, fallbackPlayerColor } from "@/config";

function makeGame(scores: number[][] = [[0], [0]]): Game {
  return {
    id: "game",
    name: "Test",
    scorecards: scores.map((s, i) => ({
      id: `p${i + 1}`,
      playerName: `Player ${i + 1}`,
      color: defaultColors[i]!,
      scores: s,
    })),
  };
}

function reduce(game: Game, ...actions: UpdateGameAction[]): Game {
  return actions.reduce(gameReducer, game);
}

const names = (game: Game) => game.scorecards.map((card) => card.playerName);

describe("createGame", () => {
  it("creates two players with distinct ids and colors", () => {
    const game = createGame();
    expect(game.scorecards).toHaveLength(2);
    expect(new Set(game.scorecards.map((c) => c.id)).size).toBe(2);
    expect(new Set(game.scorecards.map((c) => c.color)).size).toBe(2);
  });
});

describe("nextPlayerColor", () => {
  it("picks the first unused default color", () => {
    expect(nextPlayerColor(makeGame())).toBe(defaultColors[2]);
  });

  it("falls back once all default colors are used", () => {
    const game = makeGame(defaultColors.map(() => [0]));
    expect(nextPlayerColor(game)).toBe(fallbackPlayerColor);
  });
});

describe("gameReducer", () => {
  it("does not mutate the previous game", () => {
    const game = makeGame();
    const frozen = structuredClone(game);
    reduce(game, { type: "update_name", newName: "Other" });
    expect(game).toEqual(frozen);
  });

  it("adds a player with as many scores as the other players", () => {
    const game = reduce(makeGame([[0, 5, 6], [0]]), {
      type: "add_player",
      newPlayerId: "new",
      newPlayerName: "New",
      newPlayerColor: "#123456",
    });
    expect(game.scorecards.at(-1)).toEqual({
      id: "new",
      playerName: "New",
      color: "#123456",
      scores: [0, 0, 0],
    });
  });

  it("deletes the given player", () => {
    const game = reduce(makeGame(), { type: "delete_player", playerId: "p1" });
    expect(names(game)).toEqual(["Player 2"]);
  });

  it("ignores deleting an unknown player", () => {
    const game = reduce(makeGame(), { type: "delete_player", playerId: "nobody" });
    expect(names(game)).toEqual(["Player 1", "Player 2"]);
  });

  it("ignores actions on unknown players", () => {
    const game = makeGame();
    expect(
      reduce(
        game,
        { type: "change_player_name", playerId: "nobody", newPlayerName: "x" },
        { type: "change_player_color", playerId: "nobody", newColor: "#000000" },
        { type: "add_score", playerId: "nobody", round: 1, score: 3 },
        { type: "move_player", playerId: "nobody", direction: "up" },
      ),
    ).toEqual(game);
  });

  it("moves players up and down, but not off the ends", () => {
    const three = makeGame([[0], [0], [0]]);
    expect(names(reduce(three, { type: "move_player", playerId: "p3", direction: "up" }))).toEqual([
      "Player 1",
      "Player 3",
      "Player 2",
    ]);
    expect(
      names(reduce(three, { type: "move_player", playerId: "p1", direction: "down" })),
    ).toEqual(["Player 2", "Player 1", "Player 3"]);
    expect(names(reduce(three, { type: "move_player", playerId: "p1", direction: "up" }))).toEqual([
      "Player 1",
      "Player 2",
      "Player 3",
    ]);
    expect(
      names(reduce(three, { type: "move_player", playerId: "p3", direction: "down" })),
    ).toEqual(["Player 1", "Player 2", "Player 3"]);
  });

  it("adds a score, padding skipped rounds with zeros", () => {
    const game = reduce(makeGame(), { type: "add_score", playerId: "p1", round: 3, score: 7 });
    expect(game.scorecards[0]!.scores).toEqual([0, 0, 0, 7]);
  });

  it("adds rounds to every player", () => {
    const game = reduce(makeGame([[0, 1], [0]]), { type: "add_round", round: 2 });
    expect(game.scorecards.map((c) => c.scores)).toEqual([
      [0, 1, 0],
      [0, 0, 0],
    ]);
  });

  describe("trim_scores", () => {
    it("removes trailing rounds that are zero for everyone", () => {
      const game = reduce(
        makeGame([
          [0, 4, 0, 0],
          [0, 0, 0, 0],
        ]),
        { type: "trim_scores" },
      );
      expect(game.scorecards.map((c) => c.scores)).toEqual([
        [0, 4],
        [0, 0],
      ]);
    });

    it("keeps the initial scores", () => {
      const game = reduce(
        makeGame([
          [0, 0],
          [0, 0],
        ]),
        { type: "trim_scores" },
      );
      expect(game.scorecards.map((c) => c.scores)).toEqual([[0], [0]]);
    });

    it("terminates when there are no players", () => {
      const game = reduce(makeGame([]), { type: "trim_scores" });
      expect(game.scorecards).toEqual([]);
    });
  });
});
