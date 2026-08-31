import { describe, expect, it } from 'vitest';
import { createInitialGameState } from '@pokemon-simulator/core';
import { charizardDeck, dragapultDeck } from '@pokemon-simulator/core/data/decks';
import { buildExportMarkdown, importStateText } from './importExport';

describe('mobile import/export wiring (S4.4 / F-1, F-2)', () => {
  describe('buildExportMarkdown', () => {
    it('produces the same document structure the web exporter produces (F-1)', () => {
      const gameState = createInitialGameState();
      const md = buildExportMarkdown(gameState, dragapultDeck, charizardDeck);

      expect(md.startsWith('# Pokémon TCG — Análisis de Estado')).toBe(true);
      expect(md).toContain('## Resumen');
      expect(md).toContain('Dragapult Control');
      expect(md).toContain('Charizard ex');
    });

    it('falls back to deck reconstruction when no preset decks are selected', () => {
      const gameState = createInitialGameState();
      const md = buildExportMarkdown(gameState, null, null);
      expect(md).toContain('## Resumen');
      expect(md).toContain('### Estado actual');
    });
  });

  describe('importStateText', () => {
    it('imports a valid state JSON through the shared core importer (F-2)', () => {
      const text = JSON.stringify({
        turn: 3,
        currentPlayer: 'player2',
        player1: { hand: ['Pikachu'], prizes: 3 },
        player2: {},
      });
      const result = importStateText(text, { player1: dragapultDeck, player2: charizardDeck });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.gameState.turn).toBe(3);
      expect(result.gameState.currentPlayer).toBe('player2');
      expect(result.gameState.phase).toBe('turn');
      expect(result.gameState.player1.hand).toHaveLength(1);
      expect(result.gameState.player1.hand[0].name).toBe('Pikachu');
    });

    it('rejects malformed JSON with errors instead of throwing', () => {
      const result = importStateText('esto no es json {{', {});
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('rejects non-object roots', () => {
      const result = importStateText('[1,2,3]', {});
      expect(result.ok).toBe(false);
    });

    it('round-trips a full default game state through the importer', () => {
      const fresh = createInitialGameState();
      const result = importStateText(JSON.stringify(fresh), {
        player1: dragapultDeck,
        player2: charizardDeck,
      });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      expect(result.gameState.player1.deck).toHaveLength(0);
      expect(result.gameState.player2.prizes).toHaveLength(0);
      expect(result.gameState.turn).toBe(1);
    });
  });
});