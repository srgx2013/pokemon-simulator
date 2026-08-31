import type { DeckPreset, EnergyCard, PokemonCard, TrainerCard } from '@pokemon-simulator/core/types';

/**
 * Pure deck-browsing logic for the mobile deck browser and board pickers
 * (S4.3/E-3, E-4). Kept DOM-free and renderer-agnostic so it runs under vitest
 * (H-3): classification mirrors the web zone view (catLabel), grouping mirrors
 * the web picker (getAvailablePokemon + grouped list), and card counts feed the
 * deck list rows.
 */

export type CardKind = 'pokemon' | 'trainer' | 'energy';

export interface CardCounts {
  pokemon: number;
  trainers: number;
  energies: number;
  total: number;
}

/** Classifies a zone card exactly like the web zone view (catLabel). */
export function classifyCard(card: unknown): CardKind {
  const c = card as { hp?: unknown; stage?: unknown; energyType?: unknown };
  if ('hp' in c && c.stage) return 'pokemon';
  if ('energyType' in c) return 'energy';
  return 'trainer';
}

/** Counts the card pool of a preset deck (pokemon/trainer/energy totals). */
export function deckCardCounts(deck: DeckPreset | null | undefined): CardCounts {
  if (!deck) return { pokemon: 0, trainers: 0, energies: 0, total: 0 };
  const pokemon = deck.pokemon.length;
  const trainers = deck.trainers.length;
  const energies = (deck.energies || []).reduce((sum, e) => sum + e.quantity, 0);
  return { pokemon, trainers, energies, total: pokemon + trainers + energies };
}

/** Case-insensitive substring filter over any card list (empty query passes all). */
export function filterCardsByName<T extends { name: string }>(cards: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return cards;
  return cards.filter(c => c.name.toLowerCase().includes(q));
}

export interface DeckCardEntry {
  card: PokemonCard | TrainerCard | EnergyCard;
  index: number;
}

/** Pokémon cards available in a deck with their deck indexes (web picker parity). */
export function pokemonInDeck(deck: (PokemonCard | TrainerCard | EnergyCard)[]): DeckCardEntry[] {
  return deck
    .map((card, index) => ({ card, index }))
    .filter(({ card }) => 'hp' in card && Boolean((card as PokemonCard).stage));
}

export interface PokemonGroup {
  name: string;
  stage: string;
  hp: number;
  count: number;
  firstIndex: number;
}

/** Groups pokemon entries by card name, sorted alphabetically, keeping the first index. */
export function groupPokemonByCard(entries: DeckCardEntry[]): PokemonGroup[] {
  const groups = new Map<string, PokemonGroup>();
  for (const { card, index } of entries) {
    const c = card as PokemonCard;
    const existing = groups.get(c.name);
    if (existing) {
      existing.count += 1;
    } else {
      groups.set(c.name, {
        name: c.name,
        stage: c.stage,
        hp: c.hp,
        count: 1,
        firstIndex: index,
      });
    }
  }
  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}