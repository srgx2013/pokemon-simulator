import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  GameState, 
  PlayerState, 
  PokemonInstance, 
  PokemonCard, 
  EnergyType,
  StatusCondition,
  Scenario,
  DeckPreset
} from '../types';

interface GameStore {
  gameState: GameState;
  selectedScenario: Scenario | null;
  scenarios: Scenario[];
  customDecks: DeckPreset[];
  player1Deck: DeckPreset | null;
  player2Deck: DeckPreset | null;
  
  initializeGame: (pokemonList: PokemonCard[], trainers: any[], energies: any[]) => void;
  setPlayer1Deck: (deck: DeckPreset | null) => void;
  setPlayer2Deck: (deck: DeckPreset | null) => void;
  startGame: () => void;
  checkMulligan: (player: 'player1' | 'player2') => boolean;
  processMulligan: (player: 'player1' | 'player2') => void;
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
  
  addCustomDeck: (deck: DeckPreset) => void;
  removeCustomDeck: (id: string) => void;
  loadCustomDecks: () => void;
  
  drawCards: (player: 'player1' | 'player2', count: number) => void;
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
  
  // Helper to check if hand has basic Pokemon
  checkMulligan: (player: 'player1' | 'player2') => {
    const state = get().gameState;
    const playerHand = player === 'player1' ? state.player1.hand : state.player2.hand;
    const hasBasic = playerHand.some((c: any) => c && typeof c === 'object' && 'hp' in c && c.stage === 'basic');
    return !hasBasic;
  },
  
  // Process mulligan - shuffle hand back into deck and draw new hand
  processMulligan: (player: 'player1' | 'player2') => {
    const state = get().gameState;
    const playerData = player === 'player1' ? state.player1 : state.player2;
    
    // Combine hand + deck
    const allCards = [...playerData.hand, ...playerData.deck];
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    
    // Draw 7 new cards
    const newHand = shuffled.slice(0, 7);
    const newDeck = shuffled.slice(7);
    
    set({
      gameState: {
        ...state,
        [player]: {
          ...playerData,
          hand: newHand,
          deck: newDeck,
        },
        mulligan: {
          ...state.mulligan,
          [player]: true,
        },
      },
    });
  },
  
  startGame: () => {
    const { player1Deck, player2Deck } = get();
    if (!player1Deck || !player2Deck) return;
    
    const p1Cards = [
      ...player1Deck.pokemon.map(p => ({ ...p, id: uuidv4() })),
      ...player1Deck.trainers.map(t => ({ ...t, id: uuidv4() })),
      ...player1Deck.energies.map(e => ({ type: 'energy', energyType: e.type, quantity: e.quantity, id: uuidv4() })),
    ];
    const p2Cards = [
      ...player2Deck.pokemon.map(p => ({ ...p, id: uuidv4() })),
      ...player2Deck.trainers.map(t => ({ ...t, id: uuidv4() })),
      ...player2Deck.energies.map(e => ({ type: 'energy', energyType: e.type, quantity: e.quantity, id: uuidv4() })),
    ];
    
    const shuffle = (arr: any[]) => [...arr].sort(() => Math.random() - 0.5);
    
    const p1Shuffled = shuffle(p1Cards);
    const p2Shuffled = shuffle(p2Cards);
    
    const p1Prizes = p1Shuffled.slice(0, 6);
    const p1Deck = p1Shuffled.slice(6);
    const p1Hand = p1Deck.slice(0, 7);
    const p1Remaining = p1Deck.slice(7);
    
    const p2Prizes = p2Shuffled.slice(0, 6);
    const p2Deck = p2Shuffled.slice(6);
    const p2Hand = p2Deck.slice(0, 7);
    const p2Remaining = p2Deck.slice(7);
    
    set({
      gameState: {
        ...get().gameState,
        player1: {
          ...createEmptyPlayerState(),
          deck: p1Remaining,
          prizes: p1Prizes,
          hand: p1Hand,
        },
        player2: {
          ...createEmptyPlayerState(),
          deck: p2Remaining,
          prizes: p2Prizes,
          hand: p2Hand,
        },
        phase: 'turn',
        currentPlayer: 'player1',
        turn: 1,
        mulligan: {
          player1: false,
          player2: false,
        },
      }
    });
  },

  addCustomDeck: (deck: DeckPreset) => {
    set(state => ({
      customDecks: [...state.customDecks, { ...deck, id: uuidv4() }],
    }));
    const decks = get().customDecks;
    localStorage.setItem('pokemon-custom-decks', JSON.stringify(decks));
  },

  removeCustomDeck: (id: string) => {
    set(state => ({
      customDecks: state.customDecks.filter(d => d.id !== id),
    }));
    const decks = get().customDecks;
    localStorage.setItem('pokemon-custom-decks', JSON.stringify(decks));
  },

  loadCustomDecks: () => {
    const saved = localStorage.getItem('pokemon-custom-decks');
    if (saved) {
      set({ customDecks: JSON.parse(saved) });
    }
  },

  initializeGame: (pokemonList, trainers, energies) => {
    const allCards = [
      ...pokemonList.map(p => ({ ...p, id: uuidv4() })),
      ...trainers.map(t => ({ ...t, id: uuidv4() })),
      ...energies.map(e => ({ type: 'energy', energyType: e.type, quantity: e.quantity, id: uuidv4() })),
    ];
    
    const shuffled = [...allCards].sort(() => Math.random() - 0.5);
    
    const prizes = shuffled.slice(0, 6);
    const deck = shuffled.slice(6);
    const playerHand = deck.slice(0, 7);
    const remainingDeck = deck.slice(7);
    
    set(state => ({
      gameState: {
        ...state.gameState,
        player1: {
          ...createEmptyPlayerState(),
          deck: remainingDeck,
          prizes,
          hand: playerHand,
        },
        player2: {
          ...createEmptyPlayerState(),
          deck: [...remainingDeck].sort(() => Math.random() - 0.5),
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
    const { gameState } = get();
    const { player1, player2, currentPlayer, turn } = gameState;
    
    // Mapeo de energías en español
    const energyNames: Record<string, string> = {
      fire: 'Fuego',
      water: 'Agua',
      grass: 'Planta',
      electric: 'Rayo',
      psychic: 'Psiquica',
      fighting: 'Lucha',
      darkness: 'Oscuridad',
      metal: 'Metal',
      dragon: 'Dragon',
      fairy: 'Hada',
      normal: 'Normal',
      special: 'Especial'
    };
    
    const formatEnergy = (energies: string[]) => 
      energies.length > 0 
        ? energies.map(e => energyNames[e] || e).join(', ')
        : 'Ninguna';
    
    // Verificar si se puede usar un ataque
    const canUseAttack = (attack: any, attachedEnergy: string[]) => {
      if (!attack || !attack.cost || attack.cost.length === 0) return false;
      
      // Contar energías disponibles
      const available = [...attachedEnergy];
      
      // Para cada costo requerido
      for (const cost of attack.cost) {
        if (cost === 'normal' || cost === 'any') {
          // Normal puede ser cualquier energía - buscar la primera disponible
          const idx = available.findIndex(() => true);
          if (idx === -1) return false; // No hay energía disponible
          available.splice(idx, 1); // Usar esa energía
        } else {
          // Energía específica - buscar en las attached
          const idx = available.indexOf(cost);
          if (idx === -1) return false; // No tiene esa energía
          available.splice(idx, 1); // Usar esa energía
        }
      }
      return true;
    };
    
    // Mapeo para mostrar costos en español
    const costNames: Record<string, string> = {
      normal: 'Colorless',
      psychic: 'Psiquica',
      fire: 'Fuego',
      water: 'Agua',
      grass: 'Planta',
      electric: 'Rayo',
      fighting: 'Lucha',
      darkness: 'Oscuridad',
      metal: 'Metal',
      dragon: 'Dragon',
      fairy: 'Hada',
    };
    
    const formatPokemon = (p: PokemonInstance | null, showAttacks = false) => {
      if (!p) return 'Ninguno';
      
      let info = `${p.card.name} (${p.currentHp}/${p.card.hp} HP) - Energia: ${formatEnergy(p.attachedEnergy)}`;
      
      if (showAttacks && p.card.attacks && p.card.attacks.length > 0) {
        const availableAttacks = p.card.attacks.map(attack => {
          const canUse = canUseAttack(attack, p.attachedEnergy);
          const costStr = attack.cost 
            ? attack.cost.map(c => costNames[c] || c).join(' + ') 
            : '?';
          return `  - ${attack.name}: ${attack.damage} dano (${costStr}) ${canUse ? '✅' : '❌'}`;
        }).join('\n');
        info += `\nAtaques:\n${availableAttacks}`;
      }
      
      return info;
    };

    const formatBench = (bench: (PokemonInstance | null)[]) => 
      bench.filter(Boolean).map((p, i) => `${i + 1}: ${formatPokemon(p)}`).join('\n') || 'Vacio';

    const formatPrizes = (prizes: any[]) => 
      prizes.map(p => p.name || 'Carta').join(', ') || 'Ninguno';

    return `
=== ESTADO DE BATALLA POKEMON TCG ===

Turno: ${turn}
Jugador Actual: ${currentPlayer === 'player1' ? 'Jugador 1' : 'Jugador 2'}

--- TU (${currentPlayer === 'player1' ? 'Jugador 1' : 'Jugador 2'}) ---
Activo: ${formatPokemon(player1.active, true)}
Bench: 
${formatBench(player1.bench)}
Mano: ${player1.hand.map(c => c.name).join(', ') || 'Vacia'}
Deck: ${player1.deck.length} cartas
Descarte: ${player1.discardPile.length} cartas
Prizes: ${formatPrizes(player1.prizes)}

--- OPONENTE (${currentPlayer === 'player2' ? 'Jugador 1' : 'Jugador 2'}) ---
Activo: ${formatPokemon(player2.active, true)}
Bench:
${formatBench(player2.bench)}
Prizes: ${formatPrizes(player2.prizes)}
`;
  },
}));