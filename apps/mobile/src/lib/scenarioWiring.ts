import { hasActiveGame } from '@pokemon-simulator/core';
import type { GameStoreApi, Scenario } from '@pokemon-simulator/core';
import type { GameState } from '@pokemon-simulator/core/types';

/**
 * Scenario CRUD wiring for the mobile scenarios tab (S4.5, F-3/C-5). Thin,
 * testable composition over the core store's async scenario actions: guards
 * "save" on an in-progress game (matching the web App's save behavior), trims
 * the name, and returns the persisted scenario/load result so the UI can react
 * (Alert/Modal, D-4). Persistence itself flows through the store actions →
 * adapter (`pokemon-scenarios` key), and `hydrate()` seeds the list across
 * relaunches (F-3 read-back).
 */

/** True when a game is in progress and can be saved as a scenario. */
export function canSaveCurrentGame(state: GameState): boolean {
  return hasActiveGame(state);
}

/** Saves the current game as a named scenario; returns the created scenario or null. */
export async function saveCurrentScenario(store: GameStoreApi, name: string): Promise<Scenario | null> {
  const trimmed = name.trim();
  if (!trimmed) return null;
  if (!canSaveCurrentGame(store.getState().gameState)) return null;

  await store.getState().saveScenario(trimmed);
  const scenarios = store.getState().scenarios;
  return [...scenarios].sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}

/** Loads a saved scenario into the game; returns false when the id is unknown. */
export function loadScenario(store: GameStoreApi, id: string): boolean {
  const exists = store.getState().scenarios.some(s => s.id === id);
  if (!exists) return false;
  store.getState().loadScenario(id);
  return true;
}

/** Deletes a saved scenario; returns false when the id is unknown. */
export async function removeScenario(store: GameStoreApi, id: string): Promise<boolean> {
  const exists = store.getState().scenarios.some(s => s.id === id);
  if (!exists) return false;
  await store.getState().deleteScenario(id);
  return true;
}