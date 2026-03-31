import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  GameState, 
  PlayerState, 
  PokemonInstance, 
  PokemonCard, 
  EnergyType,
  StatusCondition,
  Scenario
} from '../types';

interface GameStore {
  gameState: GameState;
  selectedScenario: Scenario | null;
  scenarios: Scenario[];
  
  initializeGame: (pokemonList: PokemonCard[], trainers: any[], energies: any[]) => void;
  setCurrentPlayer: (player: 'player1' | 'player2') => void;
  nextPhase: () => void;
  incrementTurn: () => void;
  
  setActivePokemon: (player: 'player1' | 'player2', pokemon: PokemonInstance | null) => void;
  setBenchPokemon: (player: 'player1' | 'player2', position: number, pokemon: PokemonInstance | null) => void;
  updatePokemonHp: (player: 'player1' | 'player2', pokemonId: string, hp: number) => void;
  addEnergy: (player: 'player1' | 'player2', pokemonId: string, energy: EnergyType) => void;
  removeEnergy: (player: 'player1' | 'player2', pokemonId: string, energy: EnergyType) => void;
  setStatus: (player: 'player1' | 'player2', pokemonId: string, status: StatusCondition) => void;
  addDamage: (player: 'player1' | 'player2', pokemonId: string, damage: number) => void;
  
  drawCards: (player: 'player1' | 'player2', count: number) => void;
  addToHand: (player: 'player1' | 'player2', cards: any[]) => void;
  addToDiscard: (player: 'player1' | 'player2', cards: any[]) => void;
  
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
});

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: createInitialGameState(),
  selectedScenario: null,
  scenarios: [],

  initializeGame: (pokemonList, trainers, energies) => {
    const allCards = [
      ...pokemonList.map(p => ({ ...p, id: uuidv4() })),
      ...trainers.map(t => ({ ...t, id: uuidv4() })),
      ...energies.map(e => ({ type: 'energy', ...e, id: uuidv4() })),
    ];
    
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    
    const prizes = shuffled.slice(0, 6);
    const deck = shuffled.slice(6);
    
    set(state => ({
      gameState: {
        ...state.gameState,
        player1: {
          ...createEmptyPlayerState(),
          deck,
          prizes,
          hand: [],
        },
        player2: {
          ...createEmptyPlayerState(),
          deck: [...deck].sort(() => Math.random() - 0.5),
          prizes: [...prizes].sort(() => Math.random() - 0.5),
        },
        phase: 'turn',
      },
    }));
  },

  setCurrentPlayer: (player) => {
    set(state => ({
      gameState: { ...state.gameState, currentPlayer: player },
    }));
  },

  nextPhase: () => {
    set(state => {
      const phases: GameState['phase'][] = ['setup', 'draw', 'turn', 'end'];
      const currentIndex = phases.indexOf(state.gameState.phase);
      const nextIndex = (currentIndex + 1) % phases.length;
      return {
        gameState: {
          ...state.gameState,
          phase: phases[nextIndex],
        },
      };
    });
  },

  incrementTurn: () => {
    set(state => ({
      gameState: {
        ...state.gameState,
        turn: state.gameState.turn + 1,
        phase: 'turn',
      },
    }));
  },

  setActivePokemon: (player, pokemon) => {
    set(state => {
      const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
      const updatedPlayer = {
        ...playerState,
        active: pokemon,
        bench: playerState.bench.map(p => 
          p?.id === pokemon?.id ? { ...p, isActive: true } : { ...p, isActive: false }
        ),
      };
      return {
        gameState: {
          ...state.gameState,
          [player]: updatedPlayer,
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
      const updateInstance = (p: PokemonInstance | null): PokemonInstance | null => 
        p?.id === pokemonId ? { 
          ...p, 
          attachedEnergy: p.attachedEnergy.filter(e => e !== energy || 
            p.attachedEnergy.filter(x => x === energy).length > 
            p.attachedEnergy.filter(x => x === energy).filter((_, i) => {
              const firstIndex = p.attachedEnergy.indexOf(energy);
              return i !== p.attachedEnergy.indexOf(energy, firstIndex + 1);
            }).length
          )
        } : p;
      
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

  drawCards: (player, count) => {
    set(state => {
      const playerState = player === 'player1' ? state.gameState.player1 : state.gameState.player2;
      const deck = [...playerState.deck];
      const drawn = deck.splice(0, count);
      return {
        gameState: {
          ...state.gameState,
          [player]: {
            ...playerState,
            deck,
            hand: [...playerState.hand, ...drawn],
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
    const { gameState } = get();
    const { player1, player2, currentPlayer, turn } = gameState;
    
    const formatPokemon = (p: PokemonInstance | null) => {
      if (!p) return 'None';
      return `${p.card.name} (${p.currentHp}/${p.card.hp} HP) - Damage: ${p.damage} - Status: ${p.status} - Energy: [${p.attachedEnergy.join(', ')}]`;
    };

    const formatBench = (bench: (PokemonInstance | null)[]) => 
      bench.filter(Boolean).map((p, i) => `${i + 1}: ${formatPokemon(p)}`).join('\n') || 'Empty';

    const formatPrizes = (prizes: any[]) => 
      prizes.map(p => p.name).join(', ') || 'None';

    return `
=== POKEMON TCG BATTLE STATE ===

Turn: ${turn}
Current Player: ${currentPlayer}

--- YOU (${currentPlayer === 'player1' ? 'Player 1' : 'Player 2'}) ---
Active: ${formatPokemon(player1.active)}
Bench: 
${formatBench(player1.bench)}
Hand: ${player1.hand.map(c => c.name).join(', ') || 'Empty'}
Deck: ${player1.deck.length} cards
Discard: ${player1.discardPile.length} cards
Prizes: ${formatPrizes(player1.prizes)}

--- OPPONENT (${currentPlayer === 'player2' ? 'Player 1' : 'Player 2'}) ---
Active: ${formatPokemon(player2.active)}
Bench:
${formatBench(player2.bench)}
Prizes: ${formatPrizes(player2.prizes)}
`;
  },
}));