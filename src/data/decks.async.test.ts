import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API module
vi.mock('../services/pokemonTcgApi', () => ({
  fetchCard: vi.fn(),
  convertApiCard: vi.fn(),
  convertApiTrainer: vi.fn(),
  convertApiEnergy: vi.fn(),
  fetchCardFromTcgdex: vi.fn(),
  convertTcgdexToCardData: vi.fn(),
}));

import { parseDeckListWithApi, cardDatabase } from './decks';
import * as api from '../services/pokemonTcgApi';

function mockCard(name: string, supertype: string, subtypes: string[] = []) {
  return {
    id: name + '-test-1',
    name,
    supertype,
    subtypes,
    hp: supertype === 'Pokémon' ? '100' : undefined,
    types: supertype === 'Pokémon' ? ['Psychic'] : undefined,
    set: { id: 'test', name: 'Test' },
    number: '1',
    images: { small: '', large: '' },
  } as any;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('parseDeckListWithApi', () => {
  it('clasifica Pokemon via API', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard('Dreepy', 'Pokémon'));
    vi.mocked(api.convertApiCard).mockReturnValue({
      name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common',
    });

    const r = await parseDeckListWithApi('4 Dreepy');
    expect(r.pokemon).toHaveLength(4);
    expect(r.trainers).toHaveLength(0);
    expect(r.energies).toHaveLength(0);
  });

  it('clasifica Trainer via API', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard("Boss's Orders", 'Trainer', ['Supporter']));
    vi.mocked(api.convertApiTrainer).mockReturnValue({
      name: "Boss's Orders", type: 'supporter', description: '', rarity: 'rare',
    });

    const r = await parseDeckListWithApi("2 Boss's Orders");
    expect(r.trainers).toHaveLength(2);
    expect(r.pokemon).toHaveLength(0);
  });

  it('agrupa energias por nombre+type', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard('Psychic Energy', 'Energy', ['Basic']));
    const convertSpy = vi.mocked(api.convertApiEnergy).mockReturnValue({
      name: 'Psychic Energy', type: 'psychic', quantity: 1,
    });

    const r = await parseDeckListWithApi('4 Psychic Energy');

    expect(convertSpy).toHaveBeenCalledTimes(1);
    expect(r.energies).toHaveLength(1);
    expect(r.energies[0].name).toBe('Psychic Energy');
    expect(r.energies[0].type).toBe('psychic');
    expect(r.energies[0].quantity).toBe(4);
    expect(r.pokemon).toHaveLength(0);
    expect(r.trainers).toHaveLength(0);
  });

  it('clasifica Special Energy como special con nombre', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard('Spiky Energy', 'Energy', ['Special']));
    vi.mocked(api.convertApiEnergy).mockReturnValue({
      name: 'Spiky Energy', type: 'special', quantity: 1,
    });

    const r = await parseDeckListWithApi('4 Spiky Energy JTG 159');
    expect(r.energies).toHaveLength(1);
    expect(r.energies[0].name).toBe('Spiky Energy');
    expect(r.energies[0].type).toBe('special');
    expect(r.energies[0].quantity).toBe(4);
  });

  it('mantiene nombres distintos para energias diferentes', async () => {
    const mockFetchCard = vi.mocked(api.fetchCard);
    mockFetchCard.mockResolvedValueOnce(mockCard('Spiky Energy', 'Energy', ['Special']));
    mockFetchCard.mockResolvedValueOnce(mockCard('Mist Energy', 'Energy', ['Special']));
    
    vi.mocked(api.convertApiEnergy).mockReturnValue({ name: '', type: '', quantity: 0 });
    vi.mocked(api.convertApiEnergy)
      .mockReturnValueOnce({ name: 'Spiky Energy', type: 'special', quantity: 1 })
      .mockReturnValueOnce({ name: 'Mist Energy', type: 'special', quantity: 1 });

    const r = await parseDeckListWithApi(`4 Spiky Energy JTG 159
4 Mist Energy TEF 161`);
    expect(r.energies).toHaveLength(2);
    const names = r.energies.map(e => e.name).sort();
    expect(names).toEqual(['Mist Energy', 'Spiky Energy']);
  });

  it('cae a fallback heuristico cuando API falla', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(null);
    vi.mocked(api.fetchCardFromTcgdex).mockResolvedValue(null);

    const r = await parseDeckListWithApi('4 Psychic Energy');
    expect(r.energies).toHaveLength(1);
    expect(r.energies[0].name).toBe('Psychic Energy');
    expect(r.energies[0].type).toBe('psychic');
    expect(r.energies[0].quantity).toBe(4);
  });

  it('cae a heuristico con energia especial', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(null);
    vi.mocked(api.fetchCardFromTcgdex).mockResolvedValue(null);

    const r = await parseDeckListWithApi('4 Spiky Energy');
    expect(r.energies).toHaveLength(1);
    expect(r.energies[0].name).toBe('Spiky Energy');
    expect(r.energies[0].type).toBe('special');
    expect(r.energies[0].quantity).toBe(4);
  });

  it('cae a heuristico con Trainer', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(null);
    vi.mocked(api.fetchCardFromTcgdex).mockResolvedValue(null);

    const r = await parseDeckListWithApi("2 Boss's Orders");
    expect(r.trainers).toHaveLength(2);
    expect(r.pokemon).toHaveLength(0);
  });

  it('usa TCGdex fallback', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(null);
    vi.mocked(api.fetchCardFromTcgdex).mockResolvedValue(mockCard('Dreepy', 'Pokémon'));
    vi.mocked(api.convertTcgdexToCardData).mockReturnValue(mockCard('Dreepy', 'Pokémon'));
    vi.mocked(api.convertApiCard).mockReturnValue({
      name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common',
    });

    const r = await parseDeckListWithApi('2 Dreepy');
    expect(r.pokemon).toHaveLength(2);
    expect(api.fetchCardFromTcgdex).toHaveBeenCalled();
  });

  it('deduplica llamadas a API', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard('Dreepy', 'Pokémon'));
    vi.mocked(api.convertApiCard).mockReturnValue({
      name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common',
    });

    await parseDeckListWithApi('4 Dreepy\n3 Dreepy');
    expect(api.fetchCard).toHaveBeenCalledTimes(1);
  });

  it('llama al callback de progreso', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard('Dreepy', 'Pokémon'));
    vi.mocked(api.convertApiCard).mockReturnValue({
      name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common',
    });

    const onProgress = vi.fn();
    await parseDeckListWithApi('3 Dreepy', onProgress);
    expect(onProgress).toHaveBeenCalled();
  });

  it('no se rompe sin callback', async () => {
    vi.mocked(api.fetchCard).mockResolvedValue(mockCard('Dreepy', 'Pokémon'));
    vi.mocked(api.convertApiCard).mockReturnValue({
      name: 'Dreepy', stage: 'basic', hp: 70, type: 'psychic',
      attacks: [], retreatCost: 1, rarity: 'common',
    });

    await expect(parseDeckListWithApi('4 Dreepy')).resolves.toBeDefined();
  });
});
