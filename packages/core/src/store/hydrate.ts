import type { StorageAdapter } from '../storage/types';
import { STORAGE_KEYS } from '../storage/types';
import type { GameState, PlayerState, DeckPreset, Scenario } from '../types';

/**
 * Current persisted data format version (matches the legacy `DATA_VERSION = '2'`
 * that used to live in the web bootstrap). Bump it when stored formats change;
 * the migration clears the stale-format keys to force clean re-import.
 */
export const DATA_VERSION = '2';

/**
 * Async data-version migration (spec C-4). Reads `pokemon-data-version` through
 * the adapter and, when it differs from the current version, clears the
 * stale-format keys (`pokemon-custom-decks`, `pokemon-scenarios`) and writes the
 * current version — mirroring the legacy web bootstrap exactly, minus the
 * module-load sync storage access (C-3). Never throws: storage problems and
 * malformed stored values degrade to "migrate and continue".
 */
export async function migrateData(
  adapter: StorageAdapter,
  dataVersion: string = DATA_VERSION,
): Promise<void> {
  try {
    const savedVersion = await adapter.getItem(STORAGE_KEYS.dataVersion);
    if (savedVersion !== dataVersion) {
      await adapter.removeItem(STORAGE_KEYS.customDecks);
      await adapter.removeItem(STORAGE_KEYS.scenarios);
      await adapter.setItem(STORAGE_KEYS.dataVersion, dataVersion);
    }
  } catch {
    // Never throw during boot — tolerate any adapter failure (private mode,
    // corrupt storage, quota). Hydration proceeds with what it can read.
  }
}

export interface AutoSaveData {
  gameState: GameState;
  player1Deck: DeckPreset | null;
  player2Deck: DeckPreset | null;
}

/**
 * Verbatim move of the legacy `loadAutoSave`/`isValidPlayerState` logic
 * (design §2d: no behavioral change to the parser). Restores the in-progress
 * game AND the selected decks from the auto-save key. Returns null for absent,
 * corrupted, or malformed data — never throws, even when storage is unavailable
 * or the JSON fails to parse. Tolerates the legacy format that stored only the
 * GameState (decks default to null) so old auto-saves keep loading.
 */
export function parseAutoSave(raw: string | null): AutoSaveData | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;

    // New shape: { gameState, player1Deck, player2Deck }.
    if (
      parsed.gameState &&
      typeof parsed.gameState === 'object' &&
      (parsed.gameState.currentPlayer === 'player1' || parsed.gameState.currentPlayer === 'player2') &&
      isValidPlayerState(parsed.gameState.player1) &&
      isValidPlayerState(parsed.gameState.player2)
    ) {
      return {
        gameState: parsed.gameState as GameState,
        player1Deck: parsed.player1Deck ?? null,
        player2Deck: parsed.player2Deck ?? null,
      };
    }

    // Legacy shape: a raw GameState (no decks persisted yet).
    if (
      (parsed.currentPlayer === 'player1' || parsed.currentPlayer === 'player2') &&
      isValidPlayerState(parsed.player1) &&
      isValidPlayerState(parsed.player2)
    ) {
      return {
        gameState: parsed as GameState,
        player1Deck: null,
        player2Deck: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

// Only accept player states whose arrays the app actually dereferences.
// Parseable-but-malformed shapes fall back to defaults instead of crashing at
// startup (e.g. gameState.player1.deck.length).
function isValidPlayerState(player: unknown): boolean {
  if (player === null || typeof player !== 'object') return false;
  const p = player as Record<string, unknown>;
  return (
    Array.isArray(p.deck) &&
    Array.isArray(p.hand) &&
    Array.isArray(p.discardPile) &&
    Array.isArray(p.prizes) &&
    Array.isArray(p.bench)
  );
}

/**
 * Tolerant custom-deck parser (C-4 legacy tolerance). Never throws: malformed
 * JSON yields [], and entries that lack the arrays the app dereferences are
 * filtered out (mirrors the legacy `loadCustomDecks` validation).
 */
export function parseDecks(raw: string | null): DeckPreset[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (d: unknown): d is DeckPreset =>
        !!d &&
        typeof d === 'object' &&
        typeof (d as Record<string, unknown>).name === 'string' &&
        Array.isArray((d as Record<string, unknown>).pokemon) &&
        Array.isArray((d as Record<string, unknown>).trainers) &&
        Array.isArray((d as Record<string, unknown>).energies),
    );
  } catch {
    return [];
  }
}

/** Checks a parsed scenario entry has the shape the editor dereferences. */
function isValidScenario(s: unknown): s is Scenario {
  if (!s || typeof s !== 'object') return false;
  const sc = s as Record<string, unknown>;
  return (
    typeof sc.id === 'string' &&
    typeof sc.name === 'string' &&
    !!sc.gameState &&
    typeof sc.gameState === 'object' &&
    isValidPlayerState((sc.gameState as Record<string, unknown>).player1) &&
    isValidPlayerState((sc.gameState as Record<string, unknown>).player2)
  );
}

/**
 * Tolerant scenario parser (spec F-3, R5 — fixes the write-only web bug with
 * scenario persistence). Never throws: malformed JSON yields [], malformed
 * entries are dropped.
 */
export function parseScenarios(raw: string | null): Scenario[] {
  try {
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isValidScenario);
  } catch {
    return [];
  }
}

export const createEmptyPlayerState = (): PlayerState => ({
  deck: [],
  hand: [],
  discardPile: [],
  prizes: [],
  active: null,
  bench: [],
});

export const createInitialGameState = (): GameState => ({
  player1: createEmptyPlayerState(),
  player2: createEmptyPlayerState(),
  currentPlayer: 'player1',
  turn: 1,
  phase: 'setup',
  logs: [],
  mulligan: {
    player1: false,
    player2: false,
  },
});

/** The subset of the store API hydration drives (structural, per design §4.2). */
export interface HydrationStore {
  setState(partial: {
    gameState: GameState;
    player1Deck: DeckPreset | null;
    player2Deck: DeckPreset | null;
    customDecks: DeckPreset[];
    scenarios: Scenario[];
  }): void;
}

// Per-store channel: hydrate() records the decks it seeded so the store
// factory's resetGame() can restore them (R6) — the async replacement for the
// module-level `const saved = loadAutoSave()` that used to drive resetGame.
const hydratedDecks = new WeakMap<
  object,
  { player1Deck: DeckPreset | null; player2Deck: DeckPreset | null }
>();

export function getHydratedDecks(store: object): {
  player1Deck: DeckPreset | null;
  player2Deck: DeckPreset | null;
} {
  return hydratedDecks.get(store) ?? { player1Deck: null, player2Deck: null };
}

/**
 * Explicit async hydration (spec C-3): migrate → autosave → customDecks →
 * scenarios, then seed the store and record the hydrated decks for resetGame().
 * Runs once before first render ("skeleton → hydrate → render"). Never throws;
 * always ends with a playable state (C-4, C-6). Idempotent across double calls
 * (D-2).
 */
export async function hydrate(
  store: HydrationStore,
  adapter: StorageAdapter,
): Promise<void> {
  try {
    await migrateData(adapter);

    const autosave = parseAutoSave(await adapter.getItem(STORAGE_KEYS.autosave));
    const customDecks = parseDecks(await adapter.getItem(STORAGE_KEYS.customDecks));
    const scenarios = parseScenarios(await adapter.getItem(STORAGE_KEYS.scenarios));

    const player1Deck = autosave?.player1Deck ?? null;
    const player2Deck = autosave?.player2Deck ?? null;

    store.setState({
      gameState: autosave?.gameState ?? createInitialGameState(),
      player1Deck,
      player2Deck,
      customDecks,
      scenarios,
    });

    hydratedDecks.set(store, { player1Deck, player2Deck });
  } catch {
    // Never throw during boot: seed a clean default state so the app is
    // fully playable with no storage errors (C-4, C-6).
    store.setState({
      gameState: createInitialGameState(),
      player1Deck: null,
      player2Deck: null,
      customDecks: [],
      scenarios: [],
    });
    hydratedDecks.set(store, { player1Deck: null, player2Deck: null });
  }
}