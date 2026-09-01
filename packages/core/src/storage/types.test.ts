import { describe, it, expect } from 'vitest';
import { STORAGE_KEYS, createInMemoryStorage } from './types';
import type { StorageAdapter } from './types';

describe('STORAGE_KEYS contract', () => {
  it('exposes exactly the 7 documented persistence keys', () => {
    expect(Object.keys(STORAGE_KEYS)).toEqual([
      'autosave',
      'customDecks',
      'scenarios',
      'dataVersion',
      'tcgCache',
      'tcgdexCache',
      'coachSession',
    ]);
  });

  it('maps the 7 logical keys to the legacy storage keys', () => {
    expect(STORAGE_KEYS).toEqual({
      autosave: 'pokemon-autosave',
      customDecks: 'pokemon-custom-decks',
      scenarios: 'pokemon-scenarios',
      dataVersion: 'pokemon-data-version',
      tcgCache: 'pokemon_tcg_cache',
      tcgdexCache: 'tcgdex_cache',
      coachSession: 'pokemon-coach-session',
    });
  });

  it('freezes the key set so storage keys cannot drift at runtime', () => {
    expect(Object.isFrozen(STORAGE_KEYS)).toBe(true);
  });
});

describe('createInMemoryStorage conformance', () => {
  it('returns null for a missing key', async () => {
    const storage = createInMemoryStorage();
    await expect(storage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('round-trips a value through setItem/getItem', async () => {
    const storage = createInMemoryStorage();
    await storage.setItem('pokemon-autosave', '{"turn":1}');
    await expect(storage.getItem('pokemon-autosave')).resolves.toBe('{"turn":1}');
  });

  it('overwrites the previous value on setItem', async () => {
    const storage = createInMemoryStorage();
    await storage.setItem('pokemon-autosave', 'first');
    await storage.setItem('pokemon-autosave', 'second');
    await expect(storage.getItem('pokemon-autosave')).resolves.toBe('second');
  });

  it('removes a key with removeItem', async () => {
    const storage = createInMemoryStorage();
    await storage.setItem('pokemon-autosave', 'value');
    await storage.removeItem('pokemon-autosave');
    await expect(storage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('is idempotent when removing a missing key', async () => {
    const storage = createInMemoryStorage();
    await expect(storage.removeItem('pokemon-autosave')).resolves.toBeUndefined();
    await expect(storage.getItem('pokemon-autosave')).resolves.toBeNull();
  });

  it('exposes all keys through dump() for introspection', async () => {
    const storage = createInMemoryStorage();
    await storage.setItem('pokemon-autosave', 'a');
    await storage.setItem('pokemon-custom-decks', 'b');
    expect(storage.dump()).toEqual({
      'pokemon-autosave': 'a',
      'pokemon-custom-decks': 'b',
    });
  });

  it('seeds from the initial record', () => {
    const storage = createInMemoryStorage({ 'pokemon-autosave': '{"turn":3}' });
    expect(storage.dump()).toEqual({ 'pokemon-autosave': '{"turn":3}' });
  });

  it('satisfies the async StorageAdapter contract (promise-based)', async () => {
    const storage: StorageAdapter = createInMemoryStorage();
    await expect(storage.getItem('missing-key')).resolves.toBeNull();
    await storage.setItem('pokemon-autosave', 'x');
    await expect(storage.getItem('pokemon-autosave')).resolves.toBe('x');
  });
});