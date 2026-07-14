import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  GameState, 
  PlayerState, 
  PokemonInstance, 
  PokemonCard, 
  StatusCondition,
  Scenario,
  DeckPreset
} from '../types';
import { exportStateToMarkdown } from '../services/stateExporter';

interface GameStore {
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
  
  addCustomDeck: (deck: DeckPreset) => void;
  removeCustomDeck: (id: string) => void;
  loadCustomDecks: () => void;
  
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
  
  saveScenario: (name: string) => void;
  loadScenario: (id: string) => void;
  deleteScenario: (id: string) => void;
  getStateForAI: () => string;
}

const createEmptyPlayerState = (): PlayerState => ({
  deck: [],
  hand: [],
  discardPile: [],
  prizes: [],
  active: null,
  bench: [],
});

const createInitialGameState = (): GameState => ({
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

export const useGameStore = create<GameStore>((set, get) => ({
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

  addCustomDeck: (deck: DeckPreset) => {
    set(state => {
      const newDecks = [...state.customDecks, { ...deck, id: uuidv4() }];
      localStorage.setItem('pokemon-custom-decks', JSON.stringify(newDecks));
      return { customDecks: newDecks };
    });
  },

  removeCustomDeck: (id: string) => {
    set(state => {
      const newDecks = state.customDecks.filter(d => d.id !== id);
      localStorage.setItem('pokemon-custom-decks', JSON.stringify(newDecks));
      return { customDecks: newDecks };
    });
  },

  loadCustomDecks: () => {
    const saved = localStorage.getItem('pokemon-custom-decks');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const valid = parsed.filter((d: any) =>
            d && typeof d === 'object' && typeof d.name === 'string' &&
            Array.isArray(d.pokemon) && Array.isArray(d.trainers) && Array.isArray(d.energies)
          );
          set({ customDecks: valid });
        }
      } catch { /* invalid data, ignore */ }
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
      
      const pokemonCard: PokemonCard = {
        id: uuidv4(),
        name: card.name,
        stage: (card as any).stage || 'basic',
        hp: card.hp || 100,
        type: (card as any).type || 'psychic',
        attacks: (card as any).attacks || [],
        weakness: (card as any).weakness,
        retreatCost: (card as any).retreatCost || 1,
        rarity: (card as any).rarity || 'common',
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

  saveScenario: (name) => {
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
    localStorage.setItem('pokemon-scenarios', JSON.stringify(get().scenarios));
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

  deleteScenario: (id) => {
    set(state => ({
      scenarios: state.scenarios.filter(s => s.id !== id),
      selectedScenario: null,
    }));
    localStorage.setItem('pokemon-scenarios', JSON.stringify(get().scenarios));
  },

  getStateForAI: () => {
    const { gameState, player1Deck, player2Deck } = get();
    return exportStateToMarkdown(gameState, player1Deck, player2Deck);
  },
}));
