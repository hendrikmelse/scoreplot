import type { Game, Scorecard } from "@/Game";

const STORAGE_KEY = "scorekeeper.game";
const FORMAT_VERSION = 1;

const isString = (value: unknown): value is string => typeof value === "string";
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function parseScorecard(value: unknown): Scorecard | null {
  if (!isRecord(value)) return null;
  const { id, playerName, color, scores } = value;
  if (!isString(id) || !isString(playerName) || !isString(color)) return null;
  if (!Array.isArray(scores) || !scores.every((s) => typeof s === "number" && Number.isFinite(s))) {
    return null;
  }
  return { id, playerName, color, scores };
}

/** The game in saved data, or null if it is not a usable game (damaged, or from some other app) */
export function parseGame(value: unknown): Game | null {
  if (!isRecord(value)) return null;
  const { id, name, scorecards } = value;
  if (!isString(id) || !isString(name) || !Array.isArray(scorecards)) return null;

  const cards = scorecards.map(parseScorecard);
  if (cards.some((card) => card === null)) return null;
  // Two players with the same id would break everything that looks players up by it
  if (new Set(cards.map((card) => card!.id)).size !== cards.length) return null;

  return { id, name, scorecards: cards as Scorecard[] };
}

/** The saved game, or null if there is not one. Never throws: storage can be blocked or full. */
export function loadSavedGame(storage: Storage = localStorage): Game | null {
  try {
    const saved = storage.getItem(STORAGE_KEY);
    if (saved === null) return null;
    const data: unknown = JSON.parse(saved);
    if (!isRecord(data) || data.version !== FORMAT_VERSION) return null;
    return parseGame(data.game);
  } catch {
    return null;
  }
}

/** Save the game, replacing any saved one. Fails quietly, as the game is still there in memory. */
export function saveGame(game: Game, storage: Storage = localStorage): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify({ version: FORMAT_VERSION, game }));
  } catch {
    // Private browsing, a full disk or blocked storage: carry on without saving
  }
}
