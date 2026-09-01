import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createInMemoryStorage } from '../storage/types';

// Mockeamos fetch globalmente
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

let adapter: ReturnType<typeof createInMemoryStorage>;

import { fetchCard } from './pokemonTcgApi';

beforeEach(() => {
  mockFetch.mockReset();
  adapter = createInMemoryStorage();
});

describe('fetchCard query format', () => {
  it('envuelve nombre multi-palabra entre comillas literales', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv9-159', name: 'Spiky Energy', supertype: 'Energy', subtypes: ['Special'] }] }),
    });

    await fetchCard(adapter, 'Spiky Energy', 'JTG', '159');

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

    await fetchCard(adapter, "Lillie's Determination", 'MEG', '119');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name:"Lillie');
    expect(calledUrl).toContain('set.id:me1');
  });

  it('envuelve nombre incluso sin set code', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv9-159', name: 'Spiky Energy', supertype: 'Energy' }] }),
    });

    await fetchCard(adapter, 'Spiky Energy');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name:"Spiky%20Energy"');
    expect(calledUrl).not.toContain('set.id');
  });

  it('envuelve nombres de una sola palabra', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon' }] }),
    });

    await fetchCard(adapter, 'Dreepy', 'TWM', '128');

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain('name:"Dreepy"');
    expect(calledUrl).toContain('set.id:sv6');
  });

  it('incluye query de set y número cuando se proveen', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'sv9-159', name: 'Spiky Energy', supertype: 'Energy' }] }),
    });

    await fetchCard(adapter, 'Spiky Energy', 'JTG', '159');

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

    const result = await fetchCard(adapter, 'Mega Kangaskhan ex', 'MEG', '104');

    expect(result).toBeNull();
  });

  it('devuelve null cuando la API no encuentra la carta', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const result = await fetchCard(adapter, 'NonexistentCard');
    expect(result).toBeNull();
  });
});

describe('adapter-driven cache', () => {
  it('serves a second fetch of the same card from the adapter cache without hitting the network', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon', number: '128' }] }),
    });

    const first = await fetchCard(adapter, 'Dreepy', 'TWM', '128');
    expect(first?.id).toBe('sv6-128');

    const second = await fetchCard(adapter, 'Dreepy', 'TWM', '128');
    expect(second?.id).toBe('sv6-128');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('serves a card directly seeded in the adapter cache (cache-first)', async () => {
    // Cache keys keep the set code as typed (e.g. 'TWM'), matching the key
    // format fetchCard itself computes.
    const key = 'dreepy_TWM_128';
    const cached = {
      [key]: { cards: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon' }], timestamp: Date.now() },
    };
    const seeded = createInMemoryStorage({ 'pokemon_tcg_cache': JSON.stringify(cached) });

    const result = await fetchCard(seeded, 'Dreepy', 'TWM', '128');

    expect(result?.id).toBe('sv6-128');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('refetches when the cached entry is older than the 24h TTL', async () => {
    const key = 'dreepy_TWM_128';
    const stale = {
      [key]: { cards: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon' }], timestamp: Date.now() - 25 * 60 * 60 * 1000 },
    };
    const seeded = createInMemoryStorage({ 'pokemon_tcg_cache': JSON.stringify(stale) });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon', number: '128' }] }),
    });

    await fetchCard(seeded, 'Dreepy', 'TWM', '128');

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('stores fetched results under the pokemon_tcg_cache key', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ id: 'sv6-128', name: 'Dreepy', supertype: 'Pokémon', number: '128' }] }),
    });

    await fetchCard(adapter, 'Dreepy', 'TWM', '128');

    const cache = JSON.parse(adapter.dump()['pokemon_tcg_cache']!);
    expect(cache['dreepy_TWM_128']?.cards[0]?.id).toBe('sv6-128');
  });

  it('tcgdex fallback caches through the tcgdex_cache key', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => [{ id: 'sv6-128' }] })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'sv6-128', name: 'Dreepy', category: 'Pokemon', stage: 'Basic', types: ['Psychic'], set: { id: 'sv6', name: 'Twilight Masquerade' }, localId: '128' }),
      });

    const { fetchCardFromTcgdex } = await import('./pokemonTcgApi');

    const first = await fetchCardFromTcgdex(adapter, 'Dreepy');
    expect(first?.id).toBe('sv6-128');

    const second = await fetchCardFromTcgdex(adapter, 'Dreepy');
    expect(second?.id).toBe('sv6-128');

    expect(mockFetch).toHaveBeenCalledTimes(2);
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

describe('normalizeEnergyCost', () => {
  it('mapea todos los tipos de la API al EnergyType interno', async () => {
    const { normalizeEnergyCost } = await import('./pokemonTcgApi');

    const result = normalizeEnergyCost(['Grass', 'Fire', 'Water', 'Lightning', 'Psychic', 'Fighting', 'Darkness', 'Metal', 'Dragon', 'Fairy', 'Colorless']);

    expect(result).toEqual(['grass', 'fire', 'water', 'electric', 'psychic', 'fighting', 'darkness', 'metal', 'dragon', 'fairy', 'normal']);
  });

  it('devuelve [] cuando el costo es undefined', async () => {
    const { normalizeEnergyCost } = await import('./pokemonTcgApi');

    expect(normalizeEnergyCost(undefined)).toEqual([]);
  });

  it('hace fallback a minúscula para tipos desconocidos', async () => {
    const { normalizeEnergyCost } = await import('./pokemonTcgApi');

    expect(normalizeEnergyCost(['Unknown', 'Warp'])).toEqual(['unknown', 'warp']);
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

  it('normaliza cost de ataque importado para que canPayCost lo acepte (regresión Crustle)', async () => {
    const { convertApiCard } = await import('./pokemonTcgApi');
    const { canPayCost } = await import('./stateExporter');

    const result = convertApiCard({
      id: 'sv7-94',
      name: 'Crustle',
      supertype: 'Pokémon',
      hp: '150',
      types: ['Grass'],
      subtypes: ['Stage 1'],
      attacks: [
        {
          name: 'Superb Scissors',
          cost: ['Grass', 'Colorless', 'Colorless'],
          convertedEnergyCost: 3,
          damage: '120',
          text: "This attack's damage isn't affected by any effects on your opponent's Active Pokémon.",
        },
      ],
      set: { id: 'sv7', name: 'Stellar Crown' },
      number: '94',
      images: { small: '', large: '' },
    });

    const attack = result.attacks[0];
    expect(attack.cost).toEqual(['grass', 'normal', 'normal']);
    // El bug original: el cost capitalizado de la API ('Colorless') nunca matcheaba
    // en canPayCost, por lo que todo ataque importado salía ❌ aunque fuera pagable.
    expect(canPayCost(attack.cost, ['Spiky Energy', 'Growing Grass Energy', 'Mist Energy'])).toBe(true);
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

  it('normaliza el costo de los ataques de TCGdex al EnergyType interno', async () => {
    const { convertTcgdexToCardData } = await import('./pokemonTcgApi');

    const result = convertTcgdexToCardData({
      id: 'sv7-76',
      name: 'Drakloak',
      category: 'Pokemon',
      hp: 90,
      types: ['Lightning'],
      stage: 'Stage1',
      attacks: [
        {
          name: 'Thunder Jolt',
          cost: ['Lightning', 'Colorless'],
          damage: '30',
          effect: '',
        },
      ],
      set: { id: 'sv7', name: 'Stellar Crown' },
      localId: '76',
    });

    expect(result?.attacks?.[0].cost).toEqual(['electric', 'normal']);
  });
});