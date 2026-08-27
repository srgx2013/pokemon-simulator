import { describe, it, expect } from 'vitest';
import { importStateFromJson } from './stateImporter';
import type { DeckPreset } from '../types';

describe('importStateFromJson', () => {
  it('rechaza JSON inválido con un error claro', () => {
    const r = importStateFromJson('esto no es json {');
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.errors.length).toBeGreaterThan(0);
      expect(r.errors[0]).toMatch(/json/i);
    }
  });

  it('rechaza un JSON que no es un objeto', () => {
    const r = importStateFromJson('42');
    expect(r.ok).toBe(false);
  });

  it('importa un objeto vacío con defaults correctos', () => {
    const r = importStateFromJson('{}');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.gameState.currentPlayer).toBe('player1');
      expect(r.gameState.turn).toBe(1);
      expect(r.gameState.phase).toBe('turn');
      expect(r.gameState.player1.deck).toEqual([]);
      expect(r.gameState.player1.hand).toEqual([]);
      expect(r.gameState.player1.discardPile).toEqual([]);
      expect(r.gameState.player1.prizes).toEqual([]);
      expect(r.gameState.player1.active).toBeNull();
      expect(r.gameState.player1.bench).toEqual([]);
    }
  });

  it('importa active y bench con todos los datos explícitos', () => {
    const json = JSON.stringify({
      currentPlayer: 'player2',
      turn: 7,
      player1: {
        active: {
          name: 'Charizard ex',
          hp: 330,
          currentHp: 210,
          stage: 'stage2',
          type: 'fire',
          attachedEnergy: ['fire', 'fire'],
          status: 'asleep',
          retreatCost: 2,
        },
        bench: [{ name: 'Pidgey', hp: 60 }, null],
      },
    });

    const r = importStateFromJson(json);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    expect(r.gameState.currentPlayer).toBe('player2');
    expect(r.gameState.turn).toBe(7);

    const p1 = r.gameState.player1;
    expect(p1.active?.card.name).toBe('Charizard ex');
    expect(p1.active?.card.hp).toBe(330);
    expect(p1.active?.card.stage).toBe('stage2');
    expect(p1.active?.card.type).toBe('fire');
    expect(p1.active?.card.retreatCost).toBe(2);
    expect(p1.active?.currentHp).toBe(210);
    expect(p1.active?.attachedEnergy).toEqual(['fire', 'fire']);
    expect(p1.active?.status).toBe('asleep');
    expect(p1.active?.isActive).toBe(true);

    expect(p1.bench[0]?.card.name).toBe('Pidgey');
    expect(p1.bench[0]?.currentHp).toBe(60);
    expect(p1.bench[0]?.isActive).toBe(false);
    expect(p1.bench[1]).toBeNull();
  });

  it('aplica defaults cuando un Pokémon viene con datos mínimos', () => {
    const json = JSON.stringify({
      player1: {
        active: { name: 'Pidgey' },
        bench: [{ name: 'Charmander', hp: 70 }],
      },
    });

    const r = importStateFromJson(json);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const active = r.gameState.player1.active!;
    expect(active.card.stage).toBe('basic');
    expect(active.card.type).toBe('psychic');
    expect(active.card.hp).toBe(100);
    expect(active.currentHp).toBe(100); // default = hp
    expect(active.attachedEnergy).toEqual([]);
    expect(active.status).toBe('none');

    const bench = r.gameState.player1.bench[0]!;
    expect(bench.card.hp).toBe(70);
    expect(bench.currentHp).toBe(70);
  });

  it('clampa currentHp al rango [0, hp]', () => {
    const over = importStateFromJson(
      JSON.stringify({ player1: { active: { name: 'X', hp: 100, currentHp: 999 } } }),
    );
    expect(over.ok).toBe(true);
    if (over.ok) expect(over.gameState.player1.active?.currentHp).toBe(100);

    const under = importStateFromJson(
      JSON.stringify({ player1: { active: { name: 'X', hp: 100, currentHp: -5 } } }),
    );
    expect(under.ok).toBe(true);
    if (under.ok) expect(under.gameState.player1.active?.currentHp).toBe(0);
  });

  it('importa zonas de cartas con kind explícito', () => {
    const json = JSON.stringify({
      player1: {
        hand: [
          { name: "Professor's Research", kind: 'trainer' },
          { name: 'Fire Energy', kind: 'energy', type: 'fire' },
        ],
        discard: ['Rare Candy'],
        deck: [{ name: 'Pidgey', kind: 'pokemon', hp: 60, stage: 'basic' }],
      },
    });

    const r = importStateFromJson(json);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const p1 = r.gameState.player1;

    // hand[0] → trainer
    const trainer = p1.hand[0] as { name: string; type: string };
    expect(trainer.name).toBe("Professor's Research");
    expect(trainer.type).toBe('item');

    // hand[1] → energy
    const energy = p1.hand[1] as { name: string; type: string };
    expect(energy.name).toBe('Fire Energy');
    expect(energy.type).toBe('fire');

    // deck[0] → pokemon
    const pokemon = p1.deck[0] as { name: string; stage: string; hp: number };
    expect(pokemon.name).toBe('Pidgey');
    expect(pokemon.stage).toBe('basic');
    expect(pokemon.hp).toBe(60);
  });

  it('importa prizes como número generando premios placeholder', () => {
    const r = importStateFromJson(JSON.stringify({ player1: { prizes: 4 } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gameState.player1.prizes.length).toBe(4);
  });

  it('importa prizes como lista de nombres', () => {
    const r = importStateFromJson(
      JSON.stringify({ player1: { prizes: ['Fire Energy', 'Rare Candy'] } }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gameState.player1.prizes.length).toBe(2);
  });

  it('limita el bench a 5 posiciones', () => {
    const bench = Array.from({ length: 7 }, (_, i) => ({ name: `Mon ${i}` }));
    const r = importStateFromJson(JSON.stringify({ player1: { bench } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gameState.player1.bench.length).toBe(5);
  });

  it('rechaza currentPlayer inválido', () => {
    const r = importStateFromJson(JSON.stringify({ currentPlayer: 'nadie' }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/currentPlayer/i);
  });

  it('rechaza un jugador que no es un objeto', () => {
    const r = importStateFromJson(JSON.stringify({ player1: 'soy un string' }));
    expect(r.ok).toBe(false);
  });

  it('importa hand como número generando placeholders', () => {
    const r = importStateFromJson(JSON.stringify({ player1: { hand: 6 } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gameState.player1.hand).toHaveLength(6);
  });

  it('importa deck como número generando placeholders', () => {
    const r = importStateFromJson(JSON.stringify({ player1: { deck: 41 } }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.gameState.player1.deck).toHaveLength(41);
  });

  it('infiere energía por nombre en español (discard como string)', () => {
    const r = importStateFromJson(JSON.stringify({ player1: { discard: ['Energía de Fuego'] } }));
    expect(r.ok).toBe(true);
    if (r.ok) {
      const card = r.gameState.player1.discardPile[0] as { type: string };
      expect(card.type).toBe('fire');
    }
  });

  it('infiere tipo de energía cuando kind es energy sin type', () => {
    const r = importStateFromJson(
      JSON.stringify({ player1: { hand: [{ name: 'Energía de Fuego', kind: 'energy' }] } }),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const card = r.gameState.player1.hand[0] as { type: string };
      expect(card.type).toBe('fire');
    }
  });

  it('importa un escenario real de ejemplo (screenshot de TCG Live)', () => {
    const json = JSON.stringify({
      turn: 3,
      currentPlayer: 'player2',
      player1: {
        active: { name: 'Meowscarada ex', hp: 310, currentHp: 210 },
        bench: [],
        hand: 6,
        prizes: 6,
        discard: [],
        deck: 41,
      },
      player2: {
        active: { name: 'Dragapult ex', hp: 320, attachedEnergy: ['fire', 'psychic'] },
        bench: [
          { name: 'Drakloak', hp: 90 },
          { name: 'Drakloak', hp: 90 },
          { name: 'Garbodor', hp: 140 },
          { name: 'Sneasel', hp: 70, currentHp: 110, status: 'confused' },
        ],
        hand: [
          { name: 'Determinación de Lillie', kind: 'trainer' },
          { name: 'Camilla Nocturna', kind: 'trainer' },
          { name: 'Tarjeta Roja Especial', kind: 'trainer' },
          { name: 'Energía de Fuego', kind: 'energy' },
        ],
        prizes: 6,
        discard: ['Energía de Fuego'],
        deck: 24,
      },
    });

    const r = importStateFromJson(json);
    expect(r.ok).toBe(true);
    if (!r.ok) return;

    const gs = r.gameState;
    expect(gs.currentPlayer).toBe('player2');
    expect(gs.turn).toBe(3);

    const p1 = gs.player1;
    expect(p1.active?.card.name).toBe('Meowscarada ex');
    expect(p1.active?.currentHp).toBe(210);
    expect(p1.hand).toHaveLength(6);
    expect(p1.deck).toHaveLength(41);
    expect(p1.prizes).toHaveLength(6);

    const p2 = gs.player2;
    expect(p2.active?.card.name).toBe('Dragapult ex');
    expect(p2.active?.attachedEnergy).toEqual(['fire', 'psychic']);
    expect(p2.bench).toHaveLength(4);
    expect(p2.bench[3]?.card.name).toBe('Sneasel');
    expect(p2.bench[3]?.currentHp).toBe(70);
    expect(p2.bench[3]?.status).toBe('confused');
    expect(p2.hand).toHaveLength(4);
    expect(p2.deck).toHaveLength(24);
    expect(p2.prizes).toHaveLength(6);

    const discardCard = p2.discardPile[0] as { type: string };
    expect(discardCard.type).toBe('fire');

    const handEnergy = p2.hand[3] as { type: string };
    expect(handEnergy.type).toBe('fire');
  });

  it('resuelve type/stage/hp/retreatCost contra el deck preset', () => {
    const deck: DeckPreset = {
      name: 'test', description: '',
      pokemon: [
        { name: 'Chandelure', stage: 'stage2', hp: 130, type: 'fire', attacks: [], retreatCost: 2, rarity: 'rare' },
      ],
      trainers: [],
      energies: [],
    };
    const r = importStateFromJson(
      JSON.stringify({ player1: { active: { name: 'Chandelure' } } }),
      { player1: deck },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const active = r.gameState.player1.active!;
      expect(active.card.stage).toBe('stage2');
      expect(active.card.type).toBe('fire');
      expect(active.card.hp).toBe(130);
      expect(active.card.retreatCost).toBe(2);
    }
  });

  it('clasifica cartas de zona contra el deck preset (Pokémon vs trainer)', () => {
    const deck: DeckPreset = {
      name: 'test', description: '',
      pokemon: [
        { name: 'Chandelure', stage: 'stage2', hp: 130, type: 'fire', attacks: [], retreatCost: 2, rarity: 'rare' },
      ],
      trainers: [
        { name: 'Rare Candy', type: 'item', description: '', rarity: 'uncommon' },
      ],
      energies: [{ type: 'fire', quantity: 4 }],
    };
    const r = importStateFromJson(
      JSON.stringify({ player1: { discard: ['Chandelure', 'Rare Candy', 'Fire Energy'] } }),
      { player1: deck },
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      const d = r.gameState.player1.discardPile;
      expect((d[0] as { stage: string }).stage).toBe('stage2');
      expect((d[1] as { type: string }).type).toBe('item');
      expect((d[2] as { type: string }).type).toBe('fire');
    }
  });
});
