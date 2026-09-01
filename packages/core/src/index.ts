// @pokemon-simulator/core — public surface (design §2e, §4.4).
//
// Re-exports the platform-agnostic types, the storage contract, the store
// factory + async hydration, and the verified pure services. `pokemonTcgApi`
// and `data/decks` are intentionally NOT re-exported from the root: both export
// a `CardData` type with different shapes (R7), so they stay namespaced under
// their subpaths (@pokemon-simulator/core/services/pokemonTcgApi,
// @pokemon-simulator/core/data/decks).

export * from './types/index';
export * from './storage/types';

export { createGameStore, hasActiveGame } from './store/gameStore';
export type { GameStore, GameStoreApi } from './store/gameStore';
export {
  hydrate,
  migrateData,
  DATA_VERSION,
  parseAutoSave,
  parseDecks,
  parseScenarios,
  createInitialGameState,
} from './store/hydrate';
export type { AutoSaveData, HydrationStore } from './store/hydrate';

export {
  exportStateToMarkdown,
  exportStateShort,
  buildDeckFromPlayer,
  resolveGameState,
  canPayCost,
  findEvolutions,
} from './services/stateExporter';
export type { SideLabel, ExportOptions } from './services/stateExporter';
export { importStateFromJson } from './services/stateImporter';
export type { ImportResult, ImportDecks, ImportCardKind } from './services/stateImporter';
export { generateImportPrompt, generateLogPrompt } from './services/promptGenerator';