import { beforeEach, describe, expect, it } from 'vitest';
import { createGameStore, createInMemoryStorage, DATA_VERSION, hydrate, STORAGE_KEYS } from '@pokemon-simulator/core';
import type { GameStoreApi, StorageAdapter } from '@pokemon-simulator/core';
import { charizardDeck, dragapultDeck } from '@pokemon-simulator/core/data/decks';
import { canSaveCurrentGame, loadScenario, removeScenario, saveCurrentScenario } from './scenarioWiring';

describe('scenario CRUD wiring (S4.5 / F-3, C-5)', () => {
  let adapter: StorageAdapter;
  let store: GameStoreApi;

  beforeEach(() => {
    adapter = createInMemoryStorage();
    store = createGameStore(adapter);
  });

  const startGame = () => {
    store.getState().setPlayer1Deck(dragapultDeck);
    store.getState().setPlayer2Deck(charizardDeck);
    store.getState().startGame();
  };

  describe('canSaveCurrentGame', () => {
    it('is false before a game starts and true once decks are in play', () => {
      expect(canSaveCurrentGame(store.getState().gameState)).toBe(false);
      startGame();
      expect(canSaveCurrentGame(store.getState().gameState)).toBe(true);
    });
  });

  describe('saveCurrentScenario', () => {
    it('returns null and saves nothing while no game is in progress', async () => {
      const scenario = await saveCurrentScenario(store, 'Nada que guardar');
      expect(scenario).toBeNull();
      expect(store.getState().scenarios).toHaveLength(0);
    });

    it('saves the trimmed name, returns the created scenario and persists it (C-5)', async () => {
      startGame();
      const scenario = await saveCurrentScenario(store, '  Retreat Drill  ');
      expect(scenario).not.toBeNull();
      expect(scenario?.name).toBe('Retreat Drill');
      expect(store.getState().scenarios).toHaveLength(1);

      const persisted = await adapter.getItem(STORAGE_KEYS.scenarios);
      expect(persisted).toBeTruthy();
      expect(JSON.parse(persisted ?? '[]')).toHaveLength(1);
      expect(persisted).toContain('Retreat Drill');
    });
  });

  describe('loadScenario', () => {
    it('restores the saved game state snapshot', async () => {
      startGame();
      // Place the first pokemon of the built deck as P1 active so the snapshot
      // has meaningful state to restore (startGame alone leaves active null).
      store.getState().placePokemonFromDeck('player1', -1, 0);
      expect(store.getState().gameState.player1.active).not.toBeNull();

      const scenario = await saveCurrentScenario(store, 'Snapshot');
      expect(scenario).not.toBeNull();

      // Mutate the live game: remove the active pokemon.
      store.getState().clearActivePokemon('player1');
      expect(store.getState().gameState.player1.active).toBeNull();

      const loaded = loadScenario(store, scenario!.id);
      expect(loaded).toBe(true);
      expect(store.getState().gameState.player1.active).not.toBeNull();
    });

    it('returns false for an unknown id without touching the game', () => {
      startGame();
      expect(loadScenario(store, 'missing-id')).toBe(false);
      expect(store.getState().gameState.player1.deck.length).toBeGreaterThan(0);
    });
  });

  describe('removeScenario', () => {
    it('removes and persists the deletion; unknown ids are a no-op', async () => {
      startGame();
      const scenario = await saveCurrentScenario(store, 'Para borrar');
      expect(scenario).not.toBeNull();

      expect(await removeScenario(store, 'missing-id')).toBe(false);
      expect(store.getState().scenarios).toHaveLength(1);

      expect(await removeScenario(store, scenario!.id)).toBe(true);
      expect(store.getState().scenarios).toHaveLength(0);
      const persisted = await adapter.getItem(STORAGE_KEYS.scenarios);
      expect(JSON.parse(persisted ?? '[]')).toHaveLength(0);
    });
  });

  describe('hydrate read-back (F-3)', () => {
    it('seeds scenarios saved on a previous session into a fresh store', async () => {
      startGame();
      // Settle the device first: migrateData wipes custom-decks/scenarios on a
      // version mismatch (legacy web v2 behavior, covered by migrate.test.ts), so
      // the saved scenario must live on a device already at the current version.
      await adapter.setItem(STORAGE_KEYS.dataVersion, DATA_VERSION);
      await saveCurrentScenario(store, 'Across relaunch');

      // Simulate a relaunch: a brand-new store over the same adapter hydrates
      // the scenarios persisted by the previous session.
      const freshStore = createGameStore(adapter);
      await hydrate(freshStore, adapter);
      const scenarios = freshStore.getState().scenarios;
      expect(scenarios).toHaveLength(1);
      expect(scenarios[0].name).toBe('Across relaunch');
    });
  });
});