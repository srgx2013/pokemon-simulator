import type { DeckPreset, PlayerState, PokemonInstance } from '@pokemon-simulator/core/types';

/**
 * Pure board-state helpers for the mobile GameBoard (S4.2a/S4.2b, E-1). These
 * mirror the web board's edit-panel computations (energy limits, attached
 * counts, instance lookup) so the mobile surface enforces the same limits the
 * web app applies, all derived from core store state. No rendering, no browser
 * APIs — unit-testable under vitest (H-3).
 */

/** Locates a pokemon instance on a side (active first, then bench). */
export function findPokemonInstance(player: PlayerState, pokemonId: string): PokemonInstance | null {
  if (player.active?.id === pokemonId) return player.active;
  return player.bench.find(b => b?.id === pokemonId) ?? null;
}

export interface EnergyPool {
  /** Every energy type present in the deck preset (drives basic-energy buttons). */
  basicTypes: string[];
  /** Named special energies (drives special-energy buttons, keyed by name). */
  specials: { name: string; type: string; quantity: number }[];
}

/** Extracts the energy pool of a deck preset like the web edit panel. */
export function energyPoolForDeck(preset: DeckPreset | null | undefined): EnergyPool {
  if (!preset) return { basicTypes: [], specials: [] };
  const energies = preset.energies || [];
  return {
    basicTypes: energies.map(e => e.type),
    specials: energies
      .filter(e => Boolean(e.name) && e.type === 'special')
      .map(e => ({ name: e.name!, type: e.type, quantity: e.quantity })),
  };
}

/**
 * Computes per-key energy limits from the deck preset minus energy already in
 * the discard — keyed by type for basics and by name for specials (web
 * renderEditPanel logic).
 */
export function computeEnergyLimits(
  preset: DeckPreset | null | undefined,
  discardPile: unknown[],
): Record<string, number> {
  const limits: Record<string, number> = {};
  (preset?.energies || []).forEach(e => {
    const key = e.name || e.type;
    limits[key] = (limits[key] || 0) + e.quantity;
  });
  discardPile.forEach(c => {
    const card = c as { energyType?: string; type?: string; name?: string };
    const et = card.energyType || (card.type !== 'energy' ? card.type : null);
    if (et && limits[et] !== undefined) limits[et] = Math.max(0, limits[et] - 1);
    if (card.name && limits[card.name] !== undefined) limits[card.name] = Math.max(0, limits[card.name] - 1);
  });
  return limits;
}

/** Counts attached energy per key across active + bench on a side. */
export function computeAttachedCounts(player: PlayerState): Record<string, number> {
  const total: Record<string, number> = {};
  const count = (e: string) => {
    total[e] = (total[e] || 0) + 1;
  };
  if (player.active) player.active.attachedEnergy.forEach(count);
  player.bench.forEach(p => {
    if (p) p.attachedEnergy.forEach(count);
  });
  return total;
}

/** True when the attached count already reached the deck limit for a key. */
export function isEnergyAtLimit(
  limits: Record<string, number>,
  attached: Record<string, number>,
  key: string,
): boolean {
  const lim = limits[key];
  if (lim === undefined || lim === 0) return false;
  return (attached[key] || 0) >= lim;
}