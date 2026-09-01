import { describe, expect, it } from 'vitest';
import type { DeckPreset, PlayerState, PokemonInstance } from '@pokemon-simulator/core/types';
import {
  computeAttachedCounts,
  computeEnergyLimits,
  energyPoolForDeck,
  findPokemonInstance,
  isEnergyAtLimit,
} from './boardState';

const makeInstance = (id: string, attachedEnergy: string[] = []): PokemonInstance => ({
  id,
  card: {
    name: `Test-${id}`,
    stage: 'basic',
    hp: 100,
    type: 'psychic',
    attacks: [],
    retreatCost: 1,
    rarity: 'common',
  },
  currentHp: 100,
  attachedEnergy,
  status: 'none',
  damage: 0,
  isActive: false,
});

const emptyPlayer = (): PlayerState => ({
  deck: [],
  hand: [],
  discardPile: [],
  prizes: [],
  active: null,
  bench: [null, null, null, null, null],
});

describe('board state helpers (S4.2a/S4.2b / E-1)', () => {
  describe('findPokemonInstance', () => {
    it('finds the active pokemon by id', () => {
      const active = makeInstance('a1', ['fire']);
      const player = { ...emptyPlayer(), active };
      expect(findPokemonInstance(player, 'a1')).toBe(active);
    });

    it('finds a benched pokemon by id', () => {
      const bench = [null, makeInstance('b2', ['water']), null, null, null];
      const player = { ...emptyPlayer(), bench };
      expect(findPokemonInstance(player, 'b2')?.id).toBe('b2');
      expect(findPokemonInstance(player, 'b2')?.attachedEnergy).toEqual(['water']);
    });

    it('returns null when the id matches nothing', () => {
      expect(findPokemonInstance(emptyPlayer(), 'nope')).toBeNull();
    });
  });

  describe('energyPoolForDeck', () => {
    const deck: DeckPreset = {
      name: 'Pool Test',
      description: '',
      pokemon: [],
      trainers: [],
      energies: [
        { type: 'fire', quantity: 4 },
        { type: 'special', quantity: 2 },
        { name: 'Spiky Energy', type: 'special', quantity: 1 },
      ],
    };

    it('exports the basic-type list and the named special energies', () => {
      const pool = energyPoolForDeck(deck);
      // Mirrors the web board: basic buttons show for every energy type present.
      expect(pool.basicTypes).toEqual(['fire', 'special', 'special']);
      expect(pool.specials).toEqual([{ name: 'Spiky Energy', type: 'special', quantity: 1 }]);
    });

    it('returns empty pools when no deck is selected', () => {
      expect(energyPoolForDeck(null)).toEqual({ basicTypes: [], specials: [] });
      expect(energyPoolForDeck(undefined)).toEqual({ basicTypes: [], specials: [] });
    });
  });

  describe('computeEnergyLimits', () => {
    const deck: DeckPreset = {
      name: 'Limits Test',
      description: '',
      pokemon: [],
      trainers: [],
      energies: [
        { type: 'fire', quantity: 4 },
        { name: 'Spiky Energy', type: 'special', quantity: 2 },
      ],
    };

    it('keys limits by type for basics and by name for specials, subtracting discard usage', () => {
      // Pool/imported energy cards carry `energyType`; fixtures are loosely typed
      // because the core PlayerState union (PokemonCard | TrainerCard | EnergyCard)
      // has no `energyType` member (the zone cards that do are app-internal).
      const discardWithEnergy: any[] = [
        { id: 'd1', name: 'fire Energy', type: 'fire', energyType: 'fire', quantity: 1 },
        { id: 'd2', name: 'Spiky Energy', type: 'special', energyType: 'special', quantity: 1 },
      ];
      const player: PlayerState = {
        ...emptyPlayer(),
        discardPile: discardWithEnergy,
      };
      const limits = computeEnergyLimits(deck, player.discardPile);
      expect(limits).toEqual({ fire: 3, 'Spiky Energy': 1 });
    });

    it('leaves limits untouched when the discard has no matching energy keys', () => {
      const nonEnergyDiscard: any[] = [{ id: 'd1', name: 'Ultra Ball', type: 'item' }];
      const player = { ...emptyPlayer(), discardPile: nonEnergyDiscard };
      expect(computeEnergyLimits(deck, player.discardPile)).toEqual({ fire: 4, 'Spiky Energy': 2 });
    });
  });

  describe('computeAttachedCounts', () => {
    it('counts energy attached across active and bench', () => {
      const player: PlayerState = {
        ...emptyPlayer(),
        active: makeInstance('a1', ['fire', 'fire']),
        bench: [makeInstance('b1', ['fire']), makeInstance('b2', ['Spiky Energy']), null, null, null],
      };
      expect(computeAttachedCounts(player)).toEqual({ fire: 3, 'Spiky Energy': 1 });
    });

    it('returns an empty map when nothing is attached', () => {
      expect(computeAttachedCounts(emptyPlayer())).toEqual({});
    });
  });

  describe('isEnergyAtLimit', () => {
    it('treats undefined or zero limits as unlimited', () => {
      expect(isEnergyAtLimit({ fire: 4 }, { fire: 9 }, 'water')).toBe(false);
      expect(isEnergyAtLimit({ fire: 0 }, { fire: 0 }, 'fire')).toBe(false);
    });

    it('blocks adding when the attached count reached the limit', () => {
      expect(isEnergyAtLimit({ fire: 4 }, { fire: 4 }, 'fire')).toBe(true);
      expect(isEnergyAtLimit({ fire: 4 }, { fire: 3 }, 'fire')).toBe(false);
    });
  });
});