import { describe, it, expect } from 'vitest';
import { hydrate, getHydratedDecks, createInitialGameState } from './hydrate';
import { createInMemoryStorage } from '../storage/types';
import type { StorageAdapter } from '../storage/types';
import type { GameState, DeckPreset, Scenario } from '../types';

// ── Fixtures ────────────────────────────────────────────────────────────────

const emptyPlayer = {
  deck: [],
  hand: [],
  discardPile: [],
  prizes: [],
  active: null,
  bench: [],
};

const makeGameState = (phase: GameState['phase'], turn = 1): GameState => ({
  player1: { ...emptyPlayer },
  player2: { ...emptyPlayer },
  currentPlayer: 'player1',
  turn,
  phase,
  logs: [],
  mulligan: { player1: false, player2: false },
});

const deckFixture: DeckPreset = {
  name: 'Hydra Deck',
  description: 'test deck',
  pokemon: [],
  trainers: [],
  energies: [],
};

const scenarioFixture: Scenario = {
  id: 's1',
  name: 'Saved Game',
  createdAt: '2025-01-01T00:00:00.000Z',
  gameState: makeGameState('turn', 4),
};

// A minimal store shaped like the store actions hydrate() must drive, wired to
// the shared hydrated-decks channel exactly like the real factory will be.
function makeStubStore() {
  let state = {
    gameState: createInitialGameState(),
    player1Deck: null as DeckPreset | null,
    player2Deck: null as DeckPreset | null,
    customDecks: [] as DeckPreset[],
    scenarios: [] as Scenario[],
  };
  const store = {
    setState(partial: Partial<typeof state>): void {
      state = { ...state, ...partial };
    },
    getState: () => state,
    resetGame(): void {
      const { player1Deck, player2Deck } = getHydratedDecks(store);
      state = { ...state, gameState: createInitialGameState(), player1Deck, player2Deck };
    },
  };
  return store;
}

// Adapter that records every operation, to assert hydration ordering.
function recordingAdapter(
  inner: ReturnType<typeof createInMemoryStorage>,
): StorageAdapter & { order: string[] } {
  const order: string[] = [];
  return {
    order,
    async getItem(key) {
      order.push(`get:${key}`);
      return inner.getItem(key);
    },
    async setItem(key, value) {
      order.push(`set:${key}`);
      return inner.setItem(key, value);
    },
    async removeItem(key) {
      order.push(`remove:${key}`);
      return inner.removeItem(key);
    },
  };
}

// ── Hydration order & seeding ───────────────────────────────────────────────

describe('hydrate', () => {
  it('runs migration before reading the autosave, decks and scenarios', async () => {
    const inner = createInMemoryStorage({
      'pokemon-autosave': JSON.stringify({ gameState: makeGameState('turn', 2), player1Deck: null, player2Deck: null }),
      'pokemon-custom-decks': '[]',
      'pokemon-scenarios': '[]',
    });
    const adapter = recordingAdapter(inner);
    const store = makeStubStore();

    await hydrate(store, adapter);

    const reads = adapter.order.filter((op) => op.startsWith('get:')).map((op) => op.slice(4));
    expect(reads).toEqual([
      'pokemon-data-version',
      'pokemon-autosave',
      'pokemon-custom-decks',
      'pokemon-scenarios',
    ]);
    // Migration completed (version written) before any state key was read.
    expect(adapter.order.indexOf('set:pokemon-data-version')).toBeLessThan(
      adapter.order.indexOf('get:pokemon-autosave'),
    );
  });

  it('restores autosave gameState and the selected decks', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-autosave': JSON.stringify({ gameState: makeGameState('turn', 3), player1Deck: deckFixture, player2Deck: deckFixture }),
    });
    const store = makeStubStore();

    await hydrate(store, adapter);

    expect(store.getState().gameState).toEqual(makeGameState('turn', 3));
    expect(store.getState().player1Deck?.name).toBe('Hydra Deck');
    expect(store.getState().player2Deck?.name).toBe('Hydra Deck');
  });

  it('handles the legacy autosave shape (raw GameState without decks)', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-autosave': JSON.stringify(makeGameState('turn', 5)),
    });
    const store = makeStubStore();

    await hydrate(store, adapter);

    expect(store.getState().gameState).toEqual(makeGameState('turn', 5));
    expect(store.getState().player1Deck).toBeNull();
    expect(store.getState().player2Deck).toBeNull();
  });

  it('boots clean when the autosave is malformed — never throws (C-4)', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-autosave': '{ not valid json',
      'pokemon-custom-decks': '[[[',
      'pokemon-scenarios': 'not json either',
    });
    const store = makeStubStore();

    await expect(hydrate(store, adapter)).resolves.toBeUndefined();

    const state = store.getState();
    expect(state.gameState).toEqual(createInitialGameState());
    expect(state.customDecks).toEqual([]);
    expect(state.scenarios).toEqual([]);
  });

  it('seeds customDecks from the adapter (C-3)', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-custom-decks': JSON.stringify([{ ...deckFixture, id: 'custom-1' }]),
    });
    const store = makeStubStore();

    await hydrate(store, adapter);

    expect(store.getState().customDecks).toEqual([{ ...deckFixture, id: 'custom-1' }]);
  });

  it('reads scenarios back from storage and seeds them (R5, F-3)', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-scenarios': JSON.stringify([scenarioFixture]),
    });
    const store = makeStubStore();

    await hydrate(store, adapter);

    expect(store.getState().scenarios).toEqual([scenarioFixture]);
  });

  it('seeds a clean default state when storage is empty (C-6)', async () => {
    const adapter = createInMemoryStorage();
    const store = makeStubStore();

    await hydrate(store, adapter);

    const state = store.getState();
    expect(state.gameState).toEqual(createInitialGameState());
    expect(state.player1Deck).toBeNull();
    expect(state.player2Deck).toBeNull();
    expect(state.customDecks).toEqual([]);
    expect(state.scenarios).toEqual([]);
  });

  it('is idempotent across a double call (D-2)', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-autosave': JSON.stringify({ gameState: makeGameState('turn', 7), player1Deck: deckFixture, player2Deck: null }),
    });
    const store = makeStubStore();

    await hydrate(store, adapter);
    const afterFirst = store.getState();
    const dumpAfterFirst = adapter.dump();

    await hydrate(store, adapter);

    expect(store.getState()).toEqual(afterFirst);
    expect(adapter.dump()).toEqual(dumpAfterFirst);
  });

  it('is tolerant to partially malformed custom decks and scenarios', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-custom-decks': JSON.stringify([{ name: 'missing arrays' }, { ...deckFixture, id: 'good' }]),
      'pokemon-scenarios': JSON.stringify([{ id: 'bad', name: 'x' }, scenarioFixture]),
    });
    const store = makeStubStore();

    await expect(hydrate(store, adapter)).resolves.toBeUndefined();

    expect(store.getState().customDecks).toEqual([{ ...deckFixture, id: 'good' }]);
    expect(store.getState().scenarios).toEqual([scenarioFixture]);
  });
});

// ── resetGame after hydrate (R6) ────────────────────────────────────────────

describe('resetGame after hydrate', () => {
  it('restores the hydrated decks instead of nulling them (R6)', async () => {
    const adapter = createInMemoryStorage({
      'pokemon-autosave': JSON.stringify({ gameState: makeGameState('turn', 2), player1Deck: deckFixture, player2Deck: deckFixture }),
    });
    const store = makeStubStore();

    await hydrate(store, adapter);
    store.getState().gameState; // booted
    store.resetGame();

    expect(store.getState().player1Deck?.name).toBe('Hydra Deck');
    expect(store.getState().player2Deck?.name).toBe('Hydra Deck');
    expect(store.getState().gameState).toEqual(createInitialGameState());
  });

  it('keeps decks null on a fresh boot (no autosave)', async () => {
    const adapter = createInMemoryStorage();
    const store = makeStubStore();

    await hydrate(store, adapter);
    store.resetGame();

    expect(store.getState().player1Deck).toBeNull();
    expect(store.getState().player2Deck).toBeNull();
  });
});