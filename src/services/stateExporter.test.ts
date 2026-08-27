import { describe, it, expect } from 'vitest';
import { exportStateToMarkdown, canPayCost } from './stateExporter';
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

  it('muestra player1 como Tú (Jugador 1) aunque el turno sea de player2', () => {
    const gameState = makeGameState();
    gameState.currentPlayer = 'player2';
    gameState.player1.active = { ...activeInstance, card: { ...activeInstance.card, name: 'P1 Mon' } };
    gameState.player2.active = { ...activeInstance, id: 'p2-active', card: { ...activeInstance.card, name: 'P2 Mon' } };

    const md = exportStateToMarkdown(gameState, null, null);

    const tuIdx = md.indexOf('Tú (Jugador 1)');
    const rivalIdx = md.indexOf('Rival (Jugador 2)');
    const p1Idx = md.indexOf('P1 Mon');
    const p2Idx = md.indexOf('P2 Mon');

    expect(tuIdx).toBeGreaterThan(-1);
    expect(rivalIdx).toBeGreaterThan(-1);
    expect(p1Idx).toBeGreaterThan(tuIdx);
    expect(p1Idx).toBeLessThan(rivalIdx);
    expect(p2Idx).toBeGreaterThan(rivalIdx);
  });

  it('agrupa placeholders repetidos en la mano', () => {
    const gameState = makeGameState();
    gameState.player1.hand = Array.from({ length: 14 }, () => ({
      id: 'x', name: 'Hidden Card', type: 'item' as const, description: '', rarity: 'common' as const,
    }));

    const md = exportStateToMarkdown(gameState, null, null);

    expect(md).toContain('Hidden Card ×14');
    expect(md.match(/Hidden Card/g)?.length).toBeLessThan(5);
  });

  it('considera usable un ataque sin costo de energía', () => {
    expect(canPayCost([], [])).toBe(true);
  });

  it('muestra "arriba" cuando tenés menos premios restantes', () => {
    const gameState = makeGameState();
    const prize = { id: 'p', name: 'Prize Card', type: 'item' as const, description: '', rarity: 'common' as const };
    gameState.player1.prizes = Array.from({ length: 5 }, () => ({ ...prize, id: 'p1' }));
    gameState.player2.prizes = Array.from({ length: 6 }, () => ({ ...prize, id: 'p2' }));

    const md = exportStateToMarkdown(gameState, null, null);

    expect(md).toContain('Vas 1 arriba');
  });

  it('marca los Pokémon que ya evolucionaron este turno', () => {
    const gameState = makeGameState();
    gameState.player1.active = { ...activeInstance, card: { ...activeInstance.card, name: 'Drakloak' }, evolvedThisTurn: true };
    gameState.player1.hand = [{
      name: 'Dragapult ex', stage: 'stage2' as const, hp: 320, type: 'dragon',
      evolvesFrom: 'Drakloak', attacks: [], retreatCost: 1, rarity: 'ultra' as const,
    }];

    const md = exportStateToMarkdown(gameState, null, null);

    expect(md).toContain('Ya evolucionó este turno');
  });

  it('muestra las acciones ya realizadas este turno', () => {
    const gameState = makeGameState();
    gameState.player1.turnActions = { supporterUsed: true, energyAttached: false, retreated: false, attacked: false };

    const md = exportStateToMarkdown(gameState, null, null);

    expect(md).toContain('Acciones este turno');
    expect(md).toContain('Supporter ✓');
  });

  it('muestra las jugadas concretas de este turno', () => {
    const gameState = makeGameState();
    gameState.player1.turnLog = ["Jugó Lillie's Determination", 'Evolucionó Dreepy a Drakloak'];

    const md = exportStateToMarkdown(gameState, null, null);

    expect(md).toContain('Jugadas de este turno');
    expect(md).toContain("Jugó Lillie's Determination");
  });
});
