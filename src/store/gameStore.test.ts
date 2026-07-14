import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from './gameStore';
import { dragapultDeck } from '../data/decks';

// Mock localStorage
const store: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (_: number) => null,
});
import type { DeckPreset } from '../types';

// Helper: create a minimal deck for testing
const testDeck: DeckPreset = {
  name: 'Test Deck',
  description: 'For testing',
  pokemon: [
    { name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' },
    { name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' },
  ],
  trainers: [
    { name: 'Rare Candy', type: 'item', description: '', rarity: 'uncommon' },
  ],
  energies: [
    { type: 'psychic', quantity: 2 },
  ],
};

// Total: 2 pokemon + 1 trainer + 2 energies = 5 cards
// After startGame: 7 hand requires more cards, so we need at least 13 (7+6 prizes)
const fullDeck: DeckPreset = {
  name: 'Full Test Deck',
  description: '60 card deck for testing',
  pokemon: Array.from({ length: 10 }, (_, i) => ({
    name: `Pokemon${i}`,
    stage: i < 4 ? 'basic' as const : i < 7 ? 'stage1' as const : 'stage2' as const,
    hp: 60 + i * 10,
    type: 'psychic',
    attacks: [],
    retreatCost: 1,
    rarity: 'common' as const,
  })),
  trainers: Array.from({ length: 30 }, (_, i) => ({
    name: `Trainer${i}`,
    type: 'item' as const,
    description: '',
    rarity: 'uncommon' as const,
  })),
  energies: Array.from({ length: 20 }, (_, i) => ({
    type: 'psychic' as const,
    quantity: 1,
  })),
};

// Named test deck with special energies
const deckWithSpecials: DeckPreset = {
  name: 'Specials Deck',
  description: 'Has named special energies',
  pokemon: [
    { name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' },
    { name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' },
  ],
  trainers: [
    { name: 'Rare Candy', type: 'item', description: '', rarity: 'uncommon' },
  ],
  energies: [
    { name: 'Spiky Energy', type: 'special', quantity: 4 },
    { name: 'Mist Energy', type: 'special', quantity: 4 },
    { type: 'psychic', quantity: 2 },
  ],
};

beforeEach(() => {
  // Reset the store state
  useGameStore.setState({
    gameState: {
      player1: { deck: [], hand: [], discardPile: [], prizes: [], active: null, bench: [] },
      player2: { deck: [], hand: [], discardPile: [], prizes: [], active: null, bench: [] },
      currentPlayer: 'player1',
      turn: 1,
      phase: 'setup',
      logs: [],
      mulligan: { player1: false, player2: false },
    },
    selectedScenario: null,
    scenarios: [],
    customDecks: [],
    player1Deck: null,
    player2Deck: null,
  });
});

describe('startGame', () => {
  it('carga todas las cartas del mazo al deck pool', () => {
    const store = useGameStore.getState();
    store.setPlayer1Deck(fullDeck);
    store.setPlayer2Deck(fullDeck);
    store.startGame();

    const { player1 } = useGameStore.getState().gameState;
    expect(player1.hand).toHaveLength(0);
    expect(player1.prizes).toHaveLength(0);
    expect(player1.deck.length).toBe(60);
  });

  it('falla silenciosamente si no hay mazos seleccionados', () => {
    const store = useGameStore.getState();
    store.startGame(); // no decks set

    const state = useGameStore.getState().gameState;
    expect(state.phase).toBe('setup'); // unchanged
  });

  it('deja mano, premios y descarte vacíos', () => {
    useGameStore.getState().setPlayer1Deck(fullDeck);
    useGameStore.getState().setPlayer2Deck(fullDeck);
    useGameStore.getState().startGame();

    const { player1 } = useGameStore.getState().gameState;
    expect(player1.hand).toHaveLength(0);
    expect(player1.prizes).toHaveLength(0);
    expect(player1.discardPile).toHaveLength(0);
    expect(player1.active).toBeNull();
  });

  it('total de cartas en deck suma 60 por jugador', () => {
    useGameStore.getState().setPlayer1Deck(fullDeck);
    useGameStore.getState().setPlayer2Deck(fullDeck);
    useGameStore.getState().startGame();

    const { player1 } = useGameStore.getState().gameState;
    expect(player1.deck.length).toBe(60);
  });

  it('crea cartas de energía con nombre cuando el preset lo tiene', () => {
    useGameStore.getState().setPlayer1Deck(deckWithSpecials);
    useGameStore.getState().setPlayer2Deck(deckWithSpecials);
    useGameStore.getState().startGame();

    const { player1 } = useGameStore.getState().gameState;
    const allCards = [...player1.hand, ...player1.prizes, ...player1.deck];
    
    // Check there are energy cards with the special names
    const spikyCards = allCards.filter(c => 'name' in c && (c as any).name === 'Spiky Energy');
    const mistCards = allCards.filter(c => 'name' in c && (c as any).name === 'Mist Energy');
    const psychicCards = allCards.filter(c => 'name' in c && (c as any).name?.includes('psychic'));
    
    expect(spikyCards.length + mistCards.length + psychicCards.length).toBe(10);
    expect(spikyCards.length).toBeGreaterThan(0);
    expect(mistCards.length).toBeGreaterThan(0);
  });
});

describe('setActivePokemon / setBenchPokemon', () => {
  it('establece el Pokémon activo', () => {
    useGameStore.getState().setPlayer1Deck(fullDeck);
    useGameStore.getState().setPlayer2Deck(fullDeck);
    useGameStore.getState().startGame();

    const card = {
      name: 'Dreepy', stage: 'basic' as const, hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common' as const,
    };
    const instance = {
      id: 'test-id-1',
      card,
      currentHp: 70,
      attachedEnergy: [],
      status: 'none' as const,
      damage: 0,
      isActive: true,
    };

    useGameStore.getState().setActivePokemon('player1', instance);
    
    const active = useGameStore.getState().gameState.player1.active;
    expect(active).not.toBeNull();
    expect(active!.id).toBe('test-id-1');
    expect(active!.isActive).toBe(true);
  });

  it('limpia el Pokémon activo', () => {
    const card = {
      name: 'Dreepy', stage: 'basic' as const, hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common' as const,
    };
    const instance = {
      id: 'test-id-2', card, currentHp: 70,
      attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };

    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().clearActivePokemon('player1');
    
    expect(useGameStore.getState().gameState.player1.active).toBeNull();
  });

  it('coloca Pokémon en el bench en posición específica', () => {
    const card = {
      name: 'Dreepy', stage: 'basic' as const, hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common' as const,
    };
    const instance = {
      id: 'test-bench', card, currentHp: 70,
      attachedEnergy: [], status: 'none' as const, damage: 0, isActive: false, benchPosition: 2,
    };

    useGameStore.getState().setBenchPokemon('player1', 2, instance);
    
    const bench = useGameStore.getState().gameState.player1.bench;
    expect(bench[2]).not.toBeNull();
    expect(bench[2]!.id).toBe('test-bench');
    expect(bench[2]!.benchPosition).toBe(2);
  });

  it('limpia una posición del bench', () => {
    const card = {
      name: 'Dreepy', stage: 'basic' as const, hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common' as const,
    };
    const instance = {
      id: 'test-clear', card, currentHp: 70,
      attachedEnergy: [], status: 'none' as const, damage: 0, isActive: false,
    };

    useGameStore.getState().setBenchPokemon('player1', 0, instance);
    useGameStore.getState().clearBenchPokemon('player1', 0);
    
    expect(useGameStore.getState().gameState.player1.bench[0]).toBeNull();
  });
});

describe('addEnergy / removeEnergy', () => {
  it('agrega energía a un Pokémon activo', () => {
    const instance = {
      id: 'energy-test', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().addEnergy('player1', 'energy-test', 'psychic');

    expect(useGameStore.getState().gameState.player1.active!.attachedEnergy).toContain('psychic');
  });

  it('agrega energía especial por nombre', () => {
    const instance = {
      id: 'special-energy', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().addEnergy('player1', 'special-energy', 'Spiky Energy');

    const attached = useGameStore.getState().gameState.player1.active!.attachedEnergy;
    expect(attached).toContain('Spiky Energy');
  });

  it('remueve energía específica', () => {
    const instance = {
      id: 'remove-test', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: ['fire', 'fire', 'psychic'], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().removeEnergy('player1', 'remove-test', 'fire');

    const attached = useGameStore.getState().gameState.player1.active!.attachedEnergy;
    expect(attached).toEqual(['fire', 'psychic']); // removed one fire
  });
});

describe('updatePokemonHp', () => {
  it('actualiza el HP correctamente', () => {
    const instance = {
      id: 'hp-test', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().updatePokemonHp('player1', 'hp-test', 70);

    expect(useGameStore.getState().gameState.player1.active!.currentHp).toBe(70);
  });

  it('nunca baja de 0', () => {
    const instance = {
      id: 'hp-min', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().updatePokemonHp('player1', 'hp-min', -50);

    expect(useGameStore.getState().gameState.player1.active!.currentHp).toBe(0);
  });

  it('nunca supera el HP máximo de la carta', () => {
    const instance = {
      id: 'hp-max', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 80, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().updatePokemonHp('player1', 'hp-max', 999);

    expect(useGameStore.getState().gameState.player1.active!.currentHp).toBe(100);
  });
});

describe('addDamage', () => {
  it('acumula daño correctamente', () => {
    const instance = {
      id: 'dmg-test', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().addDamage('player1', 'dmg-test', 30);
    useGameStore.getState().addDamage('player1', 'dmg-test', 20);

    expect(useGameStore.getState().gameState.player1.active!.damage).toBe(50);
  });
});

describe('setStatus', () => {
  it('cambia el estado correctamente', () => {
    const instance = {
      id: 'status-test', card: { name: 'Pokemon', stage: 'basic' as const, hp: 100, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'common' as const },
      currentHp: 100, attachedEnergy: [], status: 'none' as const, damage: 0, isActive: true,
    };
    useGameStore.getState().setActivePokemon('player1', instance);
    useGameStore.getState().setStatus('player1', 'status-test', 'paralyzed');

    expect(useGameStore.getState().gameState.player1.active!.status).toBe('paralyzed');
  });
});

describe('setHand / setDeck / setDiscard / setPrizes', () => {
  it('setHand reemplaza la mano', () => {
    const cards = [{ name: 'Card1', type: 'item' as const, description: '', rarity: 'uncommon' as const, id: '1' }];
    useGameStore.getState().setHand('player1', cards);
    expect(useGameStore.getState().gameState.player1.hand).toHaveLength(1);
  });

  it('setDeck reemplaza el deck', () => {
    useGameStore.getState().setDeck('player1', [{ name: 'X', type: 'psychic' as const, quantity: 1, id: '1' }]);
    expect(useGameStore.getState().gameState.player1.deck).toHaveLength(1);
  });
});

describe('saveScenario / loadScenario', () => {
  it('guarda y carga un escenario', () => {
    // Set up some state
    useGameStore.setState(s => ({
      gameState: {
        ...s.gameState,
        player1: {
          ...s.gameState.player1,
          hand: [{ name: 'Test Card', type: 'item' as const, description: '', rarity: 'common' as const, id: '1' }],
        },
        phase: 'turn',
      },
    }));

    useGameStore.getState().saveScenario('Test Scenario');
    
    const scenarios = useGameStore.getState().scenarios;
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].name).toBe('Test Scenario');
    expect(scenarios[0].gameState.phase).toBe('turn');
    
    // Modify state and load back
    useGameStore.setState(s => ({
      gameState: { ...s.gameState, phase: 'setup' },
    }));
    expect(useGameStore.getState().gameState.phase).toBe('setup');
    
    useGameStore.getState().loadScenario(scenarios[0].id);
    expect(useGameStore.getState().gameState.phase).toBe('turn');
  });
});
