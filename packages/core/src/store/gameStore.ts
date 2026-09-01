import { create } from 'zustand';
import type { UseBoundStore, StoreApi } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type {
  GameState,
  PokemonInstance,
  PokemonCard,
  StatusCondition,
  Scenario,
  DeckPreset,
} from '../types';
import { exportStateToMarkdown, buildDeckFromPlayer, resolveGameState } from '../services/stateExporter';
import { createInitialGameState, createEmptyPlayerState, getHydratedDecks, parseDecks } from './hydrate';
import type { StorageAdapter } from '../storage/types';
import { STORAGE_KEYS } from '../storage/types';

export interface GameStore {
  gameState: GameState;
  selectedScenario: Scenario | null;
  scenarios: Scenario[];
  customDecks: DeckPreset[];
  player1Deck: DeckPreset | null;
  player2Deck: DeckPreset | null;

  setPlayer1Deck: (deck: DeckPreset | null) => void;
  setPlayer2Deck: (deck: DeckPreset | null) => void;
  startGame: () => void;

  setActivePokemon: (player: 'player1' | 'player2', pokemon: PokemonInstance | null) => void;
  setBenchPokemon: (player: 'player1' | 'player2', position: number, pokemon: PokemonInstance | null) => void;
  updatePokemonHp: (player: 'player1' | 'player2', pokemonId: string, hp: number) => void;
  addEnergy: (player: 'player1' | 'player2', pokemonId: string, energy: string) => void;
  removeEnergy: (player: 'player1' | 'player2', pokemonId: string, energy: string) => void;
  setStatus: (player: 'player1' | 'player2', pokemonId: string, status: StatusCondition) => void;
  addDamage: (player: 'player1' | 'player2', pokemonId: string, damage: number) => void;

  addCustomDeck: (deck: DeckPreset) => Promise<void>;
  removeCustomDeck: (id: string) => Promise<void>;
  loadCustomDecks: () => Promise<void>;

  placePokemonFromDeck: (player: 'player1' | 'player2', position: number, cardIndex: number) => void;

  addToHand: (player: 'player1' | 'player2', cards: any[]) => void;
  setHand: (player: 'player1' | 'player2', cards: any[]) => void;
  addToDiscard: (player: 'player1' | 'player2', cards: any[]) => void;
  setDiscard: (player: 'player1' | 'player2', cards: any[]) => void;
  setDeck: (player: 'player1' | 'player2', cards: any[]) => void;
  setPrizes: (player: 'player1' | 'player2', cards: any[]) => void;
  setBench: (player: 'player1' | 'player2', bench: (PokemonInstance | null)[]) => void;
  clearActivePokemon: (player: 'player1' | 'player2') => void;
  clearBenchPokemon: (player: 'player1' | 'player2', position: number) => void;

  saveScenario: (name: string) => Promise<void>;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => Promise<void>;
  importGameState: (gameState: GameState) => void;
  resetGame: () => void;
  swapPlayers: () => void;
  getStateForAI: () => string;
}

export type GameStoreApi = UseBoundStore<StoreApi<GameStore>>;

/**
 * Store factory (spec C-3): creates a store initialized with an empty default
 * state and registers the fire-and-forget async autosave subscriber capturing
 * the adapter. NO storage access happens at module load — the module-level
 * `const saved = loadAutoSave()` + module-level `subscribe` are gone; state is
 * seeded by the explicit async `hydrate(store, adapter)` called once before
 * first render ("skeleton → hydrate → render").
 */
export function createGameStore(adapter: StorageAdapter): GameStoreApi {
  let store!: GameStoreApi;

  store = create<GameStore>((set, get) => ({
    gameState: createInitialGameState(),
    selectedScenario: null,
    scenarios: [],
    customDecks: [],
    player1Deck: null,
    player2Deck: null,

    setPlayer1Deck: (deck) => set({ player1Deck: deck }),
    setPlayer2Deck: (deck) => set({ player2Deck: deck }),

    startGame: () => {
      const { player1Deck, player2Deck } = get();
      if (!player1Deck || !player2Deck) return;

      const buildPool = (deck: DeckPreset) => [
        ...deck.pokemon.map(p => ({ ...p, id: uuidv4() })),
        ...deck.trainers.map(t => ({ ...t, id: uuidv4() })),
        ...deck.energies.flatMap(e => Array.from({ length: e.quantity }, () => ({ name: e.name || `${e.type} Energy`, type: e.type === 'special' ? 'special' as any : e.type, energyType: e.type, quantity: 1, id: uuidv4() }))),
      ];

      set({
        gameState: {
          ...createInitialGameState(),
          player1: {
            ...createEmptyPlayerState(),
            deck: buildPool(player1Deck),
          },
          player2: {
            ...createEmptyPlayerState(),
            deck: buildPool(player2Deck),
          },
        },
      });
    },

    addCustomDeck: async (deck: DeckPreset) => {
      set(state => ({
        customDecks: [...state.customDecks, { ...deck, id: uuidv4() }],
      }));
      await adapter.setItem(STORAGE_KEYS.customDecks, JSON.stringify(get().customDecks));
    },

    removeCustomDeck: async (id: string) => {
      set(state => ({
        customDecks: state.customDecks.filter(d => d.id !== id),
      }));
      await adapter.setItem(STORAGE_KEYS.customDecks, JSON.stringify(get().customDecks));
    },

    loadCustomDecks: async () => {
      try {
        const saved = await adapter.getItem(STORAGE_KEYS.customDecks);
        if (saved) {
          set({ customDecks: parseDecks(saved) });
        }
      } catch {
        // Adapter read failed — keep the current custom decks.
      }
    },

    setActivePokemon: (player, pokemon) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: pokemon,
            },
          },
        };
      });
    },

    setBenchPokemon: (player, position, pokemon) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const newBench = [...playerState.bench];
        newBench[position] = pokemon ? { ...pokemon, benchPosition: position, isActive: false } : null;
        return {
          gameState: {
            ...state.gameState,
            [player]: { ...playerState, bench: newBench },
          },
        };
      });
    },

    placePokemonFromDeck: (player, position, cardIndex) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const card = playerState.deck[cardIndex];
        if (!card || !('hp' in card)) return state;

        // Spread the full card so optional fields (abilities, evolvesFrom,
        // evolvesTo, weakness, resistance, imageUrl) survive the move, while
        // defaults keep legacy pool cards that lack those fields working.
        const cardData = card as unknown as PokemonCard;
        const pokemonCard: PokemonCard = {
          ...cardData,
          id: uuidv4(),
          stage: cardData.stage || 'basic',
          hp: cardData.hp || 100,
          type: cardData.type || 'psychic',
          attacks: cardData.attacks || [],
          retreatCost: cardData.retreatCost || 1,
          rarity: cardData.rarity || 'common',
        };

        const instance: PokemonInstance = {
          id: uuidv4(),
          card: pokemonCard,
          currentHp: pokemonCard.hp,
          attachedEnergy: [],
          status: 'none',
          damage: 0,
          isActive: position === -1,
          benchPosition: position >= 0 ? position : undefined,
        };

        const newDeck = playerState.deck.filter((_, i) => i !== cardIndex);

        if (position === -1) {
          return {
            gameState: {
              ...state.gameState,
              [player]: {
                ...playerState,
                active: instance,
                deck: newDeck,
              },
            },
          };
        } else {
          const newBench = [...playerState.bench];
          newBench[position] = instance;
          return {
            gameState: {
              ...state.gameState,
              [player]: {
                ...playerState,
                bench: newBench,
                deck: newDeck,
              },
            },
          };
        }
      });
    },

    updatePokemonHp: (player, pokemonId, hp) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const updateInstance = (p: PokemonInstance | null): PokemonInstance | null =>
          p?.id === pokemonId ? { ...p, currentHp: Math.max(0, Math.min(hp, p.card.hp)) } : p;

        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: updateInstance(playerState.active),
              bench: playerState.bench.map(updateInstance),
            },
          },
        };
      });
    },

    addEnergy: (player, pokemonId, energy) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;

        const updateInstance = (p: PokemonInstance | null): PokemonInstance | null =>
          p?.id === pokemonId ? { ...p, attachedEnergy: [...p.attachedEnergy, energy] } : p;

        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: updateInstance(playerState.active),
              bench: playerState.bench.map(updateInstance),
            },
          },
        };
      });
    },

    removeEnergy: (player, pokemonId, energy) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const updateInstance = (p: PokemonInstance | null): PokemonInstance | null => {
          if (p?.id !== pokemonId) return p;
          const idx = p.attachedEnergy.indexOf(energy);
          if (idx === -1) return p;
          return {
            ...p,
            attachedEnergy: p.attachedEnergy.filter((_, i) => i !== idx),
          };
        };

        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: updateInstance(playerState.active),
              bench: playerState.bench.map(updateInstance),
            },
          },
        };
      });
    },

    setStatus: (player, pokemonId, status) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const updateInstance = (p: PokemonInstance | null): PokemonInstance | null =>
          p?.id === pokemonId ? { ...p, status } : p;

        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: updateInstance(playerState.active),
              bench: playerState.bench.map(updateInstance),
            },
          },
        };
      });
    },

    addDamage: (player, pokemonId, damage) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const updateInstance = (p: PokemonInstance | null): PokemonInstance | null =>
          p?.id === pokemonId ? { ...p, damage: p.damage + damage } : p;

        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: updateInstance(playerState.active),
              bench: playerState.bench.map(updateInstance),
            },
          },
        };
      });
    },

    addToHand: (player, cards) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              hand: [...playerState.hand, ...cards],
            },
          },
        };
      });
    },

    setHand: (player, cards) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              hand: cards,
            },
          },
        };
      });
    },

    addToDiscard: (player, cards) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              discardPile: [...playerState.discardPile, ...cards],
            },
          },
        };
      });
    },

    setDiscard: (player, cards) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              discardPile: cards,
            },
          },
        };
      });
    },

    setDeck: (player, cards) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              deck: cards,
            },
          },
        };
      });
    },

    setPrizes: (player, cards) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              prizes: cards,
            },
          },
        };
      });
    },

    setBench: (player, bench) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              bench: bench,
            },
          },
        };
      });
    },

    clearActivePokemon: (player) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              active: null,
            },
          },
        };
      });
    },

    clearBenchPokemon: (player, position) => {
      set(state => {
        const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
        const newBench = [...playerState.bench];
        newBench[position] = null;
        return {
          gameState: {
            ...state.gameState,
            [player]: {
              ...playerState,
              bench: newBench,
            },
          },
        };
      });
    },

    saveScenario: async (name) => {
      const scenario: Scenario = {
        id: uuidv4(),
        name,
        createdAt: new Date().toISOString(),
        gameState: JSON.parse(JSON.stringify(get().gameState)),
      };
      set(state => ({
        scenarios: [...state.scenarios, scenario],
        selectedScenario: scenario,
      }));
      await adapter.setItem(STORAGE_KEYS.scenarios, JSON.stringify(get().scenarios));
    },

    loadScenario: (id) => {
      const scenario = get().scenarios.find(s => s.id === id);
      if (scenario) {
        set({
          gameState: JSON.parse(JSON.stringify(scenario.gameState)),
          selectedScenario: scenario,
        });
      }
    },

    deleteScenario: async (id) => {
      set(state => ({
        scenarios: state.scenarios.filter(s => s.id !== id),
        selectedScenario: null,
      }));
      await adapter.setItem(STORAGE_KEYS.scenarios, JSON.stringify(get().scenarios));
    },

    importGameState: (gameState) => {
      set({ gameState });
    },

    resetGame: () => {
      // Restore the decks hydrate() seeded (null on a fresh/empty boot, the
      // autosaved decks otherwise) — preserves the legacy resetGame behavior
      // that read the module-load `saved` capture (R6).
      const { player1Deck, player2Deck } = getHydratedDecks(store);
      set({
        gameState: createInitialGameState(),
        selectedScenario: null,
        player1Deck,
        player2Deck,
      });
    },

    swapPlayers: () => {
      set(state => ({
        gameState: {
          ...state.gameState,
          player1: state.gameState.player2,
          player2: state.gameState.player1,
          currentPlayer: state.gameState.currentPlayer === 'player1' ? 'player2' : 'player1',
        },
      }));
    },

    getStateForAI: () => {
      const { gameState, player1Deck, player2Deck } = get();
      const resolved = resolveGameState(gameState);
      return exportStateToMarkdown(
        resolved,
        player1Deck ?? buildDeckFromPlayer(resolved.player1),
        player2Deck ?? buildDeckFromPlayer(resolved.player2),
      );
    },
  }));

  // Persist the in-progress game after every state change (C-5): fire-and-forget
  // async write, last-write-wins per key — the adapter serializes per key and
  // each action's state mutations land in one subscribe callback, so rapid
  // changes converge on the latest state without throwing.
  store.subscribe((state) => {
    void adapter.setItem(
      STORAGE_KEYS.autosave,
      JSON.stringify({
        gameState: state.gameState,
        player1Deck: state.player1Deck,
        player2Deck: state.player2Deck,
      }),
    );
  });

  return store;
}

// A game is "in progress" when any meaningful state exists: cards in hand,
// active Pokémon, prizes, a non-empty deck, or having left the setup phase.
// deck.length alone is not a reliable signal — a deck can legitimately reach
// zero mid-game while the game continues.
export function hasActiveGame(state: GameState): boolean {
  return (
    state.phase !== 'setup' ||
    state.player1.hand.length > 0 ||
    state.player2.hand.length > 0 ||
    state.player1.active !== null ||
    state.player2.active !== null ||
    state.player1.prizes.length > 0 ||
    state.player2.prizes.length > 0 ||
    state.player1.deck.length > 0 ||
    state.player2.deck.length > 0
  );
}