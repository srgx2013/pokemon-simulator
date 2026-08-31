import { describe, it, expect } from 'vitest';
import { generateImportPrompt, generateLogPrompt } from './promptGenerator';
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
    expect(prompt).toContain('MI MAZO no cargado');
  });

  it('genera el prompt de log con ambas listas y el nombre del jugador', () => {
    const p2: DeckPreset = {
      name: 'chandelure',
      description: '',
      pokemon: [
        { name: 'Chandelure', stage: 'stage2', hp: 130, type: 'fire', attacks: [], retreatCost: 2, rarity: 'rare' },
      ],
      trainers: [],
      energies: [],
    };
    const prompt = generateLogPrompt(deck, p2, 'srgx2013');

    expect(prompt).toContain('Yo soy srgx2013');
    expect(prompt).toContain('srgx2013 SIEMPRE es player1');
    expect(prompt).toContain('MAZO DEL RIVAL');
    expect(prompt).toContain('Chandelure (130)');
    expect(prompt).toContain('Dragapult ex (320)');
    expect(prompt).toContain("Xerosic's Machinations");
  });
});
