import { describe, it, expect } from 'vitest';
import { exportStateToMarkdown } from './stateExporter';
import type { GameState, DeckPreset, PokemonInstance, PokemonCard } from '../types';

const baseCard: Omit<PokemonCard, 'id'> = {
  name: 'Run Errand',
  stage: 'basic',
  hp: 80,
  type: 'psychic',
  attacks: [],
  retreatCost: 1,
  rarity: 'common',
};

const activeInstance: PokemonInstance = {
  id: 'active-1',
  card: {
    ...baseCard,
    abilities: [{ name: 'Run Errand', text: 'Draw 2 cards', type: 'ability' }],
  },
  currentHp: 80,
  attachedEnergy: [],
  status: 'none',
  damage: 0,
  isActive: true,
};

const benchInstance: PokemonInstance = {
  id: 'bench-1',
  card: {
    ...baseCard,
    name: 'Bench Mon',
    abilities: [{ name: 'Bench Draw', text: 'Draw 1 card', type: 'ability' }],
  },
  currentHp: 60,
  attachedEnergy: [],
  status: 'none',
  damage: 0,
  isActive: false,
  benchPosition: 0,
};

const makeGameState = (): GameState => ({
  player1: {
    deck: [],
    hand: [],
    discardPile: [],
    prizes: [],
    active: activeInstance,
    bench: [benchInstance, null],
  },
  player2: {
    deck: [],
    hand: [],
    discardPile: [],
    prizes: [],
    active: null,
    bench: [],
  },
  currentPlayer: 'player1',
  turn: 1,
  phase: 'turn',
  logs: [],
  mulligan: { player1: false, player2: false },
});

const deckWithAbility: DeckPreset = {
  name: 'Ability Deck',
  description: '',
  pokemon: [
    {
      name: 'Deck Mon',
      stage: 'basic',
      hp: 70,
      type: 'psychic',
      attacks: [],
      retreatCost: 1,
      rarity: 'common',
      abilities: [{ name: 'Deck Ability', text: 'Not on the field', type: 'ability' }],
    },
  ],
  trainers: [],
  energies: [],
};

describe('exportStateToMarkdown', () => {
  it('incluye habilidades de Pokémon en juego (Activo y Bench)', () => {
    const md = exportStateToMarkdown(makeGameState(), deckWithAbility, deckWithAbility);

    expect(md).toContain('**Habilidades:**');
    expect(md).toContain('⭐ Run Errand');
    expect(md).toContain('⭐ Bench Draw');
  });

  it('no lista habilidades del mazo, solo las de Pokémon en juego', () => {
    const md = exportStateToMarkdown(makeGameState(), deckWithAbility, deckWithAbility);

    expect(md).not.toContain('⭐ Deck Ability');
  });

  it('no muestra ninguna habilidad cuando no hay Pokémon en juego', () => {
    const gameState = makeGameState();
    gameState.player1.active = null;
    gameState.player1.bench = [];

    const md = exportStateToMarkdown(gameState, deckWithAbility, deckWithAbility);

    expect(md).not.toContain('⭐');
  });
});
