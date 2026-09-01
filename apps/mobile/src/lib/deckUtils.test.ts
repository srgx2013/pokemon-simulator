import { describe, expect, it } from 'vitest';
import { dragapultDeck } from '@pokemon-simulator/core/data/decks';
import type { EnergyCard, PokemonCard, TrainerCard } from '@pokemon-simulator/core/types';
import {
  classifyCard,
  deckCardCounts,
  filterCardsByName,
  groupPokemonByCard,
  pokemonInDeck,
} from './deckUtils';

const dreepy: PokemonCard = {
  name: 'Dreepy',
  stage: 'basic',
  hp: 70,
  type: 'psychic',
  attacks: [],
  retreatCost: 1,
  rarity: 'common',
};

const budew: PokemonCard = {
  name: 'Budew',
  stage: 'basic',
  hp: 30,
  type: 'grass',
  attacks: [],
  retreatCost: 1,
  rarity: 'common',
};

const iono: TrainerCard = {
  id: 't1',
  name: 'Iono',
  type: 'supporter',
  description: 'Your opponent reveals their hand.',
  rarity: 'uncommon',
};

const fireEnergy: EnergyCard = {
  id: 'e1',
  name: 'fire Energy',
  type: 'fire',
  quantity: 1,
};

describe('deck browser filtering logic (S4.3 / E-3, E-4)', () => {
  describe('deckCardCounts', () => {
    it('counts pokemon, trainers, energies and the total card pool of a preset deck', () => {
      // dragapultDeck: 12 pokemon, 10 trainers, energies 2+1+1+4 = 8 → 30 cards.
      const counts = deckCardCounts(dragapultDeck);
      expect(counts.pokemon).toBe(12);
      expect(counts.trainers).toBe(10);
      expect(counts.energies).toBe(8);
      expect(counts.total).toBe(30);
    });

    it('returns zero counts when no deck is selected', () => {
      expect(deckCardCounts(null)).toEqual({ pokemon: 0, trainers: 0, energies: 0, total: 0 });
      expect(deckCardCounts(undefined)).toEqual({ pokemon: 0, trainers: 0, energies: 0, total: 0 });
    });
  });

  describe('classifyCard', () => {
    it('classifies pokemon, trainer and energy cards like the web zone view', () => {
      expect(classifyCard(dreepy)).toBe('pokemon');
      expect(classifyCard(iono)).toBe('trainer');
      expect(classifyCard(fireEnergy as unknown as EnergyCard)).toBe('trainer');
      // Energy cards inside player zones carry `energyType` (pool/imported shape).
      expect(classifyCard({ ...fireEnergy, energyType: 'fire' } as unknown as EnergyCard)).toBe('energy');
    });

    it('falls back to trainer for unknown card shapes', () => {
      expect(classifyCard({ name: 'Mystery Card' } as unknown as TrainerCard)).toBe('trainer');
    });
  });

  describe('filterCardsByName', () => {
    it('is case-insensitive and matches substrings', () => {
      const cards = [dreepy, budew, iono];
      expect(filterCardsByName(cards, 'dreepy')).toEqual([dreepy]);
      expect(filterCardsByName(cards, 'BUD')).toEqual([budew]);
      expect(filterCardsByName(cards, 'io')).toEqual([iono]);
    });

    it('returns all cards when the query is empty', () => {
      const cards = [dreepy, budew];
      expect(filterCardsByName(cards, '')).toHaveLength(2);
      expect(filterCardsByName(cards, '   ')).toHaveLength(2);
    });

    it('returns an empty list when nothing matches', () => {
      expect(filterCardsByName([dreepy], 'zzz')).toEqual([]);
    });
  });

  describe('pokemonInDeck', () => {
    it('returns only pokemon cards from a mixed deck with their deck indexes', () => {
      const deck = [dreepy, iono, { ...iono, name: 'Nest Ball' }, budew];
      const result = pokemonInDeck(deck as unknown as (PokemonCard | TrainerCard | EnergyCard)[]);
      expect(result.map(e => e.index)).toEqual([0, 3]);
      expect(result.map(e => e.card.name)).toEqual(['Dreepy', 'Budew']);
    });

    it('returns an empty list when the deck has no pokemon', () => {
      expect(pokemonInDeck([iono])).toEqual([]);
      expect(pokemonInDeck([])).toEqual([]);
    });
  });

  describe('groupPokemonByCard', () => {
    it('groups duplicate pokemon with counts and the first deck index, sorted by name', () => {
      const deck = [dreepy, dreepy, budew, dreepy];
      const groups = groupPokemonByCard(
        pokemonInDeck(deck as unknown as (PokemonCard | TrainerCard | EnergyCard)[]),
      );
      expect(groups).toHaveLength(2);
      expect(groups[0]).toEqual({ name: 'Budew', stage: 'basic', hp: 30, count: 1, firstIndex: 2 });
      expect(groups[1]).toEqual({ name: 'Dreepy', stage: 'basic', hp: 70, count: 3, firstIndex: 0 });
    });

    it('keeps unique pokemon as single-card groups', () => {
      const groups = groupPokemonByCard(pokemonInDeck([dreepy, budew]));
      expect(groups.map(g => g.name)).toEqual(['Budew', 'Dreepy']);
    });
  });
});