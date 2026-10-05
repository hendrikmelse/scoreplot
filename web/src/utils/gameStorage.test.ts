import type { Game } from "@/Game";
import { loadSavedGame, parseGame, saveGame } from "@/utils/gameStorage";

const game: Game = {
  id: "g1",
  name: "Rummy",
  scorecards: [
    { id: "a", playerName: "Ada", color: "#e6194b", scores: [0, 5, -2.5] },
    { id: "b", playerName: "Bo", color: "#4363d8", scores: [0, 3, 4] },
  ],
};

/** A stand-in for localStorage, whose methods can be made to fail */
function fakeStorage(failWith?: Error) {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => {
      if (failWith) throw failWith;
      return data.get(key) ?? null;
    },
    setItem: (key: string, value: string) => {
      if (failWith) throw failWith;
      data.set(key, value);
    },
  } as unknown as Storage & { data: Map<string, string> };
}

describe("parseGame", () => {
  it("accepts a game", () => {
    expect(parseGame(structuredClone(game))).toEqual(game);
  });

  it("accepts a game with no players", () => {
    expect(parseGame({ id: "g", name: "Empty", scorecards: [] })).toEqual({
      id: "g",
      name: "Empty",
      scorecards: [],
    });
  });

  it("drops anything extra, rather than carrying it around", () => {
    const parsed = parseGame({ ...structuredClone(game), surprise: true });
    expect(parsed).toEqual(game);
    expect(parsed).not.toHaveProperty("surprise");
  });

  it.each([
    ["nothing", null],
    ["a string", "hello"],
    ["an array", []],
    ["a game without a name", { id: "g", scorecards: [] }],
    ["a game whose players are not a list", { id: "g", name: "x", scorecards: {} }],
    [
      "a player without a color",
      { id: "g", name: "x", scorecards: [{ id: "a", playerName: "A", scores: [0] }] },
    ],
    [
      "scores that are not numbers",
      {
        id: "g",
        name: "x",
        scorecards: [{ id: "a", playerName: "A", color: "#000", scores: ["5"] }],
      },
    ],
    [
      "scores that are not finite",
      {
        id: "g",
        name: "x",
        scorecards: [{ id: "a", playerName: "A", color: "#000", scores: [null] }],
      },
    ],
    [
      "two players with the same id",
      {
        id: "g",
        name: "x",
        scorecards: [
          { id: "a", playerName: "A", color: "#000", scores: [0] },
          { id: "a", playerName: "B", color: "#111", scores: [0] },
        ],
      },
    ],
  ])("rejects %s", (_, value) => {
    expect(parseGame(value)).toBeNull();
  });
});

describe("saving and loading", () => {
  it("gets back the game that was saved", () => {
    const storage = fakeStorage();
    saveGame(game, storage);
    expect(loadSavedGame(storage)).toEqual(game);
  });

  it("replaces the previous saved game", () => {
    const storage = fakeStorage();
    saveGame(game, storage);
    saveGame({ ...game, name: "Another" }, storage);
    expect(loadSavedGame(storage)!.name).toBe("Another");
  });

  it("has nothing when nothing was saved", () => {
    expect(loadSavedGame(fakeStorage())).toBeNull();
  });

  it("copes with saved data that is not JSON", () => {
    const storage = fakeStorage();
    storage.data.set("scorekeeper.game", "{oh no");
    expect(loadSavedGame(storage)).toBeNull();
  });

  it("copes with saved data in a different format", () => {
    const storage = fakeStorage();
    storage.data.set("scorekeeper.game", JSON.stringify({ version: 99, game }));
    expect(loadSavedGame(storage)).toBeNull();
    storage.data.set("scorekeeper.game", JSON.stringify(game)); // No version at all
    expect(loadSavedGame(storage)).toBeNull();
  });

  it("copes with a saved game that is damaged", () => {
    const storage = fakeStorage();
    storage.data.set("scorekeeper.game", JSON.stringify({ version: 1, game: { id: "g" } }));
    expect(loadSavedGame(storage)).toBeNull();
  });

  it("never throws when storage is not available", () => {
    const blocked = fakeStorage(new DOMException("blocked", "SecurityError"));
    expect(() => saveGame(game, blocked)).not.toThrow();
    expect(loadSavedGame(blocked)).toBeNull();
  });

  it("never throws when storage is full", () => {
    const full = fakeStorage();
    full.setItem = () => {
      throw new DOMException("full", "QuotaExceededError");
    };
    expect(() => saveGame(game, full)).not.toThrow();
  });
});
