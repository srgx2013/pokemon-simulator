import {
  buildDeckFromPlayer,
  exportStateToMarkdown,
  importStateFromJson,
  resolveGameState,
} from '@pokemon-simulator/core';
import type { ImportDecks, ImportResult } from '@pokemon-simulator/core';
import type { DeckPreset, GameState } from '@pokemon-simulator/core/types';

/**
 * Mobile import/export wiring (S4.4, F-1/F-2). Both sides delegate to the shared
 * core services: export produces the exact markdown the web app produces (core
 * `exportStateToMarkdown`, same call shape as the store's `getStateForAI`), and
 * import runs through the same core `importStateFromJson` the web uses so
 * round-trip behavior is identical (F-2). The clipboard/share side effects live
 * in `lib/clipboard.ts` (D-4) — this module is pure and unit-testable.
 */

/** Builds the full export markdown for a game state (F-1 byte parity with web). */
export function buildExportMarkdown(
  gameState: GameState,
  player1Deck: DeckPreset | null,
  player2Deck: DeckPreset | null,
): string {
  const resolved = resolveGameState(gameState);
  return exportStateToMarkdown(
    resolved,
    player1Deck ?? buildDeckFromPlayer(resolved.player1),
    player2Deck ?? buildDeckFromPlayer(resolved.player2),
  );
}

/** Imports a state JSON through the shared core importer (F-2). */
export function importStateText(text: string, decks?: ImportDecks): ImportResult {
  return importStateFromJson(text, decks);
}