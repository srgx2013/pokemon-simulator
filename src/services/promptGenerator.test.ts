import { describe, it, expect } from 'vitest';
import { generateImportPrompt } from './promptGenerator';
import type { DeckPreset } from '../types';

const deck: DeckPreset = {
  name: 'draga saul',
  description: '',
  pokemon: [
    { name: 'Dragapult ex', stage: 'stage2', hp: 320, type: 'dragon', attacks: [], retreatCost: 1, rarity: 'ultra' },
    { name: 'Dragapult ex', stage: 'stage2', hp: 320, type: 'dragon', attacks: [], retreatCost: 1, rarity: 'ultra' },
    { name: 'Drakloak', stage: 'stage1', hp: 90, type: 'dragon', attacks: [], retreatCost: 1, rarity: 'uncommon' },
    { name: 'Munkidori', stage: 'basic', hp: 110, type: 'psychic', attacks: [], retreatCost: 1, rarity: 'rare' },
  ],
  trainers: [
    { name: "Lillie's Determination", type: 'supporter', description: '', rarity: 'uncommon' },
    { name: 'Night Stretcher', type: 'item', description: '', rarity: 'uncommon' },
  ],
  energies: [
    { type: 'psychic', quantity: 4 },
    { type: 'fire', quantity: 3 },
  ],
};

describe('generateImportPrompt', () => {
  it('incluye los Pokémon únicos con su HP (sin duplicar copias)', () => {
    const prompt = generateImportPrompt(deck);
    expect(prompt).toContain('Dragapult ex (320)');
    expect(prompt).toContain('Drakloak (90)');
    expect(prompt).toContain('Munkidori (110)');
    // dos copias de Dragapult ex en el deck → una sola entrada en la lista
    expect(prompt.match(/Dragapult ex \(320\)/g)).toHaveLength(1);
  });

  it('incluye entrenadores y energías', () => {
    const prompt = generateImportPrompt(deck);
    expect(prompt).toContain("Lillie's Determination");
    expect(prompt).toContain('Night Stretcher');
    expect(prompt).toContain('Psychic Energy');
    expect(prompt).toContain('Fire Energy');
  });

  it('incluye el formato JSON de ejemplo y las reglas', () => {
    const prompt = generateImportPrompt(deck);
    expect(prompt).toContain('"currentPlayer"');
    expect(prompt).toContain('player1 = mi lado');
    expect(prompt).toContain('NO inventes');
    expect(prompt).toContain('usá el HP');
  });

  it('avisa cuando no hay mazo cargado', () => {
    const prompt = generateImportPrompt(null);
    expect(prompt).toContain('No tenés mazo cargado');
  });
});
