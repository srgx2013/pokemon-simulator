import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mockeamos fetch globalmente
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// Mock localStorage
const mockStorage: Record<string, string> = {};
vi.stubGlobal('localStorage', {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  length: 0,
  key: (_: number) => null,
});

import { fetchCard } from './pokemonTcgApi';

beforeEach(() => {
  mockFetch.mockReset();
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
});

describe('fetchCard query format', () => {
  it('envuelve nombre multi-palabra entre comillas literales', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv9-159', name: 'Spiky Energy', supertype: 'Energy', subtypes: ['Special'] }] }),
    });

    await fetchCard('Spiky Energy', 'JTG', '159');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    // Las comillas son literales en la query string (no se URL-encoden)
    expect(calledUrl).toContain('name:"Spiky%20Energy"');
    expect(calledUrl).toContain('set.id:sv9');
    expect(calledUrl).toContain('number:159');
  });

  it('envuelve nombre con apóstrofo entre comillas', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'me1-119', name: "Lillie's Determination", supertype: 'Trainer', subtypes: ['Supporter'] }] }),
    });

    await fetchCard("Lillie's Determination", 'MEG', '119');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name:"Lillie');
    expect(calledUrl).toContain('set.id:me1');
  });

  it('envuelve nombre incluso sin set code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv9-159', name: 'Spiky Energy', supertype: 'Energy' }] }),
    });

    await fetchCard('Spiky Energy');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name:"Spiky%20Energy"');
    expect(calledUrl).not.toContain('set.id');
  });

  it('envuelve nombres de una sola palabra', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon' }] }),
    });

    await fetchCard('Dreepy', 'TWM', '128');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name:"Dreepy"');
    expect(calledUrl).toContain('set.id:sv6');
  });

  it('incluye query de set y número cuando se proveen', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv9-159', name: 'Spiky Energy', supertype: 'Energy' }] }),
    });

    await fetchCard('Spiky Energy', 'JTG', '159');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('q=');
    expect(calledUrl).toContain('name:');
    expect(calledUrl).toContain('set.id:');
    expect(calledUrl).toContain('number:159');
  });

  it('devuelve null cuando la API responde con error', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 400,
    });

    const result = await fetchCard('Mega Kangaskhan ex', 'MEG', '104');

    expect(result).toBeNull();
  });

  it('devuelve null cuando la API no encuentra la carta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const result = await fetchCard('NonexistentCard');
    expect(result).toBeNull();
  });
});

describe('convertApiEnergy', () => {
  it('clasifica Special Energy como type=special por subtype', async () => {
    const { convertApiEnergy } = await import('./pokemonTcgApi');

    const result = convertApiEnergy({
      id: 'sv9-159',
      name: 'Spiky Energy',
      supertype: 'Energy',
      subtypes: ['Special'],
      set: { id: 'sv9', name: 'Journey Together' },
      number: '159',
      images: { small: '', large: '' },
    });

    expect(result).toEqual({ name: 'Spiky Energy', type: 'special', quantity: 1 });
  });

  it('clasifica Basic Energy por nombre', async () => {
    const { convertApiEnergy } = await import('./pokemonTcgApi');

    const result = convertApiEnergy({
      id: 'sve-1',
      name: 'Grass Energy',
      supertype: 'Energy',
      subtypes: ['Basic'],
      set: { id: 'sve', name: 'Energy' },
      number: '1',
      images: { small: '', large: '' },
    });

    expect(result).toEqual({ name: 'Grass Energy', type: 'grass', quantity: 1 });
  });

  it('usa types[] cuando el nombre no tiene tipo y no es Special', async () => {
    const { convertApiEnergy } = await import('./pokemonTcgApi');

    // Una energía básica sin "Special" en subtypes, con types explícito
    const result = convertApiEnergy({
      id: 'sve-1',
      name: 'Grass Energy',
      supertype: 'Energy',
      types: ['Grass'],
      subtypes: ['Basic'],
      set: { id: 'sve', name: 'Energy' },
      number: '1',
      images: { small: '', large: '' },
    });

    expect(result).toEqual({ name: 'Grass Energy', type: 'grass', quantity: 1 });
  });

  it('prioriza subtypes Special sobre el nombre', async () => {
    const { convertApiEnergy } = await import('./pokemonTcgApi');

    // Growing Grass Energy tiene "grass" en el nombre PERO subtypes=['Special']
    const result = convertApiEnergy({
      id: 'me3-86',
      name: 'Growing Grass Energy',
      supertype: 'Energy',
      types: [],
      subtypes: ['Special'],
      set: { id: 'me3', name: 'Perfect Order' },
      number: '86',
      images: { small: '', large: '' },
    });

    expect(result).toEqual({ name: 'Growing Grass Energy', type: 'special', quantity: 1 });
  });
});

describe('convertApiCard', () => {
  it('mapea abilities al formato interno', async () => {
    const { convertApiCard } = await import('./pokemonTcgApi');

    const result = convertApiCard({
      id: 'sv7-76',
      name: 'Drakloak',
      supertype: 'Pokémon',
      hp: '90',
      types: ['Psychic'],
      subtypes: ['Stage 1'],
      attacks: [],
      abilities: [
        {
          name: 'Summoning Signal',
          text: 'Look at the top 2 cards of your deck and choose 1 of them.',
          type: 'Ability',
        },
      ],
      set: { id: 'sv7', name: 'Stellar Crown' },
      number: '76',
      images: { small: '', large: '' },
    });

    expect(result.abilities).toEqual([
      {
        name: 'Summoning Signal',
        text: 'Look at the top 2 cards of your deck and choose 1 of them.',
        type: 'Ability',
      },
    ]);
    expect(result.name).toBe('Drakloak');
  });

  it('devuelve abilities vacío cuando la carta no tiene habilidades', async () => {
    const { convertApiCard } = await import('./pokemonTcgApi');

    const result = convertApiCard({
      id: 'sv7-75',
      name: 'Dreepy',
      supertype: 'Pokémon',
      hp: '60',
      types: ['Psychic'],
      subtypes: ['Basic'],
      attacks: [],
      set: { id: 'sv7', name: 'Stellar Crown' },
      number: '75',
      images: { small: '', large: '' },
    });

    expect(result.abilities).toEqual([]);
  });
});

describe('convertTcgdexToCardData', () => {
  it('mapea abilities de TCGdex (campo effect) al formato CardData', async () => {
    const { convertTcgdexToCardData } = await import('./pokemonTcgApi');

    const result = convertTcgdexToCardData({
      id: 'sv7-76',
      name: 'Drakloak',
      category: 'Pokemon',
      hp: 90,
      types: ['Psychic'],
      stage: 'Stage1',
      abilities: [
        {
          name: 'Summoning Signal',
          effect: 'Look at the top 2 cards of your deck and choose 1 of them.',
          type: 'Ability',
        },
      ],
      set: { id: 'sv7', name: 'Stellar Crown' },
      localId: '76',
    });

    expect(result?.abilities).toEqual([
      {
        name: 'Summoning Signal',
        text: 'Look at the top 2 cards of your deck and choose 1 of them.',
        type: 'Ability',
      },
    ]);
  });

  it('deja abilities undefined cuando TCGdex no trae habilidades', async () => {
    const { convertTcgdexToCardData } = await import('./pokemonTcgApi');

    const result = convertTcgdexToCardData({
      id: 'sv7-75',
      name: 'Dreepy',
      category: 'Pokemon',
      hp: 60,
      types: ['Psychic'],
      stage: 'Basic',
      set: { id: 'sv7', name: 'Stellar Crown' },
      localId: '75',
    });

    expect(result?.abilities).toBeUndefined();
  });
});
